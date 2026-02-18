import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { ExportModel, PdfRenderModel, PdfRenderPage } from './types';

type PdfRenderOptions = {
  mode: 'compact' | 'detailed';
  detail: 'calendar-only' | 'full';
  paperSize: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape' | 'auto';
  grayscale: boolean;
  inkSaver: boolean;
  includeLegend: boolean;
  includeProgressionChart: boolean;
};

const PAGE_SIZES = {
  letter: { portrait: [612, 792], landscape: [792, 612] },
  a4: { portrait: [595, 842], landscape: [842, 595] },
} as const;

const TOKENS = {
  margin: 36,
  gutter: 10,
  headerHeight: 54,
  footerHeight: 22,
  fontSizes: {
    title: 18,
    subtitle: 9,
    body: 10,
    small: 9,
    tiny: 8,
  },
  lineHeights: {
    body: 12,
    small: 10,
  },
} as const;

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function resolveOrientation(options: PdfRenderOptions): 'portrait' | 'landscape' {
  if (options.orientation === 'portrait' || options.orientation === 'landscape') return options.orientation;
  return options.mode === 'compact' ? 'landscape' : 'portrait';
}

function colorScheme(grayscale: boolean, inkSaver: boolean) {
  const common = {
    text: rgb(0.1, 0.12, 0.1),
    subtle: rgb(0.36, 0.36, 0.36),
    border: rgb(0.75, 0.75, 0.75),
    headerBand: rgb(0.96, 0.96, 0.96),
  };

  if (grayscale) {
    return {
      ...common,
      background: inkSaver ? rgb(1, 1, 1) : rgb(0.985, 0.985, 0.985),
      strength: undefined,
      endurance: undefined,
      deload: undefined,
      rest: undefined,
    };
  }

  if (inkSaver) {
    return {
      ...common,
      background: rgb(1, 1, 1),
      strength: rgb(0.95, 0.98, 0.95),
      endurance: rgb(0.95, 0.97, 1),
      deload: rgb(1, 0.97, 0.92),
      rest: rgb(0.98, 0.98, 0.98),
    };
  }

  return {
    ...common,
    background: rgb(0.97, 0.98, 0.96),
    strength: rgb(0.9, 0.97, 0.91),
    endurance: rgb(0.89, 0.94, 0.99),
    deload: rgb(0.99, 0.93, 0.86),
    rest: rgb(0.95, 0.96, 0.97),
  };
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text.trim()) return [''];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function parseRirPrescription(value: string): { sets: string; reps: string; rir: string } | null {
  const match = value.match(/^(\d+)x([\d-]+)\s@\s(\d+)\sRIR$/i);
  if (!match) return null;
  return {
    sets: match[1] ?? '',
    reps: match[2] ?? '',
    rir: match[3] ?? '',
  };
}

function isMainSlot(slot?: string): boolean {
  return slot === 'S1' || slot === 'S2' || slot === 'S3';
}

function findMainPrescription(day: Extract<PdfRenderPage, { kind: 'weekOverview' }>['days'][number]): string | undefined {
  if (!day.workout) return undefined;

  for (const block of day.workout.blocks) {
    const explicitMain = block.items.find((item) => isMainSlot(item.slot));
    if (explicitMain) {
      if (day.workout.kind === 'strength') return `${explicitMain.name}: ${explicitMain.prescription}`;
      return explicitMain.prescription;
    }
  }

  const fallback = day.workout.blocks.flatMap((block) => block.items)[0];
  if (!fallback) return undefined;
  if (day.workout.kind === 'strength') return `${fallback.name}: ${fallback.prescription}`;
  return fallback.prescription;
}

function dayFill(sessionType: string, scheme: ReturnType<typeof colorScheme>): RGB | undefined {
  if (sessionType === 'strength') return scheme.strength;
  if (sessionType === 'endurance') return scheme.endurance;
  if (sessionType === 'deload') return scheme.deload;
  return scheme.rest;
}

function drawPageChrome(page: PDFPage, scheme: ReturnType<typeof colorScheme>) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: scheme.background });
  page.drawRectangle({ x: 0, y: height - TOKENS.headerHeight, width, height: TOKENS.headerHeight, color: scheme.headerBand });
}

function drawHeader(
  page: PDFPage,
  title: string,
  subtitle: string | undefined,
  titleFont: PDFFont,
  textFont: PDFFont,
  scheme: ReturnType<typeof colorScheme>,
): number {
  const { height } = page.getSize();
  const topY = height - 30;
  page.drawText(title, {
    x: TOKENS.margin,
    y: topY,
    size: TOKENS.fontSizes.title,
    font: titleFont,
    color: scheme.text,
  });

  if (subtitle) {
    page.drawText(subtitle, {
      x: TOKENS.margin,
      y: topY - 14,
      size: TOKENS.fontSizes.subtitle,
      font: textFont,
      color: scheme.subtle,
    });
  }

  return height - TOKENS.headerHeight - 8;
}

function drawFooter(page: PDFPage, text: string, textFont: PDFFont, scheme: ReturnType<typeof colorScheme>) {
  page.drawText(text, {
    x: TOKENS.margin,
    y: 10,
    size: TOKENS.fontSizes.small,
    font: textFont,
    color: scheme.subtle,
  });
}

function drawCover(
  page: PDFPage,
  pageModel: Extract<PdfRenderPage, { kind: 'cover' }>,
  startY: number,
  textFont: PDFFont,
  scheme: ReturnType<typeof colorScheme>,
  includeLegend: boolean,
): void {
  const { width } = page.getSize();
  const panelW = width - TOKENS.margin * 2;
  let y = startY;

  if (includeLegend) {
    const legendItems = [
      ['[S] Strength'],
      ['[E] Endurance'],
      ['[D] Deload'],
      ['[R] Rest'],
    ] as const;

    let x = TOKENS.margin;
    for (const [label] of legendItems) {
      page.drawText(label, {
        x,
        y,
        size: TOKENS.fontSizes.small,
        font: textFont,
        color: scheme.subtle,
      });
      x += 118;
    }
    y -= 18;
  }

  for (const line of pageModel.lines) {
    if (y < 180) break;
    page.drawRectangle({
      x: TOKENS.margin,
      y: y - 16,
      width: panelW,
      height: 16,
      borderWidth: 0.8,
      borderColor: scheme.border,
    });
    page.drawText(line, {
      x: TOKENS.margin + 5,
      y: y - 11,
      size: TOKENS.fontSizes.small,
      font: textFont,
      color: scheme.text,
    });
    y -= 20;
  }

  y -= 6;
  page.drawText('How to use:', { x: TOKENS.margin, y, size: TOKENS.fontSizes.body, font: textFont, color: scheme.text });
  y -= TOKENS.lineHeights.body;

  for (const line of pageModel.howToUse) {
    page.drawText(`- ${line}`, { x: TOKENS.margin + 8, y, size: TOKENS.fontSizes.small, font: textFont, color: scheme.subtle });
    y -= TOKENS.lineHeights.body;
  }
}

function drawWeekOverview(
  page: PDFPage,
  pageModel: Extract<PdfRenderPage, { kind: 'weekOverview' }>,
  startY: number,
  titleFont: PDFFont,
  textFont: PDFFont,
  scheme: ReturnType<typeof colorScheme>,
  options: PdfRenderOptions,
): void {
  const { width } = page.getSize();
  const gridWidth = width - TOKENS.margin * 2;
  const dayWidth = (gridWidth - TOKENS.gutter * 6) / 7;
  const headerH = 20;
  const cellH = 132;
  const topY = startY;

  page.drawText(`Week ${pageModel.weekIndex} | ${pageModel.objective.toUpperCase()}${pageModel.isDeloadWeek ? ' | DELOAD' : ''}`, {
    x: TOKENS.margin,
    y: topY,
    size: TOKENS.fontSizes.body,
    font: titleFont,
    color: scheme.text,
  });

  const gridTop = topY - 18;

  for (let idx = 0; idx < DAY_ORDER.length; idx += 1) {
    const x = TOKENS.margin + idx * (dayWidth + TOKENS.gutter);
    page.drawRectangle({ x, y: gridTop - headerH, width: dayWidth, height: headerH, borderWidth: 0.8, borderColor: scheme.border });
    page.drawText(DAY_ORDER[idx], { x: x + 3, y: gridTop - 14, size: TOKENS.fontSizes.small, font: titleFont, color: scheme.subtle });
  }

  const dayMap = new Map(pageModel.days.map((day) => [day.dateLabel, day]));
  const rowY = gridTop - headerH - cellH;

  for (let idx = 0; idx < DAY_ORDER.length; idx += 1) {
    const x = TOKENS.margin + idx * (dayWidth + TOKENS.gutter);
    const day = dayMap.get(DAY_ORDER[idx]);
    if (!day) continue;

    const fill = dayFill(day.sessionType, scheme);
    const rect = {
      x,
      y: rowY,
      width: dayWidth,
      height: cellH,
      borderWidth: 0.8,
      borderColor: scheme.border,
    };

    if (fill) {
      page.drawRectangle({ ...rect, color: fill });
    } else {
      page.drawRectangle(rect);
      page.drawText('///', {
        x: x + dayWidth - 18,
        y: rowY + cellH - 10,
        size: TOKENS.fontSizes.tiny,
        font: textFont,
        color: scheme.subtle,
      });
    }

    let y = rowY + cellH - 14;
    const title = day.workout?.title ?? (day.sessionType === 'recovery' ? 'Recovery' : 'Rest');
    page.drawText(title, { x: x + 3, y, size: TOKENS.fontSizes.small, font: titleFont, color: scheme.text, maxWidth: dayWidth - 6 });
    y -= TOKENS.lineHeights.small + 1;

    page.drawText(`${day.sessionType.toUpperCase()} | Effort ${day.effort}/5`, {
      x: x + 3,
      y,
      size: TOKENS.fontSizes.tiny,
      font: textFont,
      color: scheme.subtle,
      maxWidth: dayWidth - 6,
    });
    y -= TOKENS.lineHeights.small;

    const mainPrescription = findMainPrescription(day);
    if (mainPrescription) {
      const lines = wrapText(mainPrescription, textFont, TOKENS.fontSizes.tiny, dayWidth - 6).slice(0, 2);
      for (const line of lines) {
        page.drawText(line, {
          x: x + 3,
          y,
          size: TOKENS.fontSizes.tiny,
          font: textFont,
          color: scheme.text,
        });
        y -= TOKENS.lineHeights.small;
      }
    }

    page.drawRectangle({ x: x + 3, y: rowY + 4, width: 8, height: 8, borderWidth: 0.8, borderColor: scheme.subtle });
  }

  const summaryY = rowY - 18;
  page.drawText(pageModel.weekSummary, {
    x: TOKENS.margin,
    y: summaryY,
    size: TOKENS.fontSizes.small,
    font: textFont,
    color: scheme.subtle,
  });

  const footerParts = [`${pageModel.pageNumber} / ${pageModel.pageCount}`];
  if (pageModel.exportTimestamp) footerParts.push(`Exported ${pageModel.exportTimestamp}`);
  drawFooter(page, footerParts.join(' | '), textFont, scheme);

  if (options.grayscale) {
    page.drawText('Legend: /// grayscale marker', {
      x: width - TOKENS.margin - 145,
      y: 10,
      size: TOKENS.fontSizes.tiny,
      font: textFont,
      color: scheme.subtle,
    });
  }
}

function drawSessionDetail(
  page: PDFPage,
  pageModel: Extract<PdfRenderPage, { kind: 'sessionDetail' }>,
  startY: number,
  titleFont: PDFFont,
  textFont: PDFFont,
  scheme: ReturnType<typeof colorScheme>,
): void {
  const { width } = page.getSize();
  const contentW = width - TOKENS.margin * 2;
  let y = startY;

  page.drawText(
    `Week ${pageModel.weekIndex} ${pageModel.dayLabel} | ${pageModel.sessionType.toUpperCase()} | Effort ${pageModel.effort}/5`,
    { x: TOKENS.margin, y, size: TOKENS.fontSizes.body, font: titleFont, color: scheme.text },
  );
  y -= TOKENS.lineHeights.body;

  page.drawText(`Objective: ${pageModel.objective}`, {
    x: TOKENS.margin,
    y,
    size: TOKENS.fontSizes.small,
    font: textFont,
    color: scheme.subtle,
  });
  y -= TOKENS.lineHeights.body;

  if (pageModel.target) {
    page.drawText(`Target: ${pageModel.target}`, {
      x: TOKENS.margin,
      y,
      size: TOKENS.fontSizes.small,
      font: textFont,
      color: scheme.subtle,
    });
    y -= TOKENS.lineHeights.body;
  }

  for (const block of pageModel.blocks) {
    if (y < 200) break;

    page.drawText(block.title, { x: TOKENS.margin, y, size: TOKENS.fontSizes.body, font: titleFont, color: scheme.text });
    y -= TOKENS.lineHeights.body;

    const hasUnparsed = block.items.some((item) => !parseRirPrescription(item.prescription));

    const columns = hasUnparsed
      ? [
          { key: 'check', label: '[ ]', width: 20 },
          { key: 'exercise', label: 'Exercise', width: 145 },
          { key: 'prescription', label: 'Prescription', width: 140 },
          { key: 'notes', label: 'Notes', width: contentW - 20 - 145 - 140 },
        ]
      : [
          { key: 'check', label: '[ ]', width: 20 },
          { key: 'exercise', label: 'Exercise', width: 145 },
          { key: 'sets', label: 'Sets', width: 36 },
          { key: 'reps', label: 'Reps', width: 36 },
          { key: 'rir', label: 'RIR', width: 30 },
          { key: 'notes', label: 'Notes', width: contentW - 20 - 145 - 36 - 36 - 30 },
        ];

    let x = TOKENS.margin;
    for (const col of columns) {
      page.drawRectangle({ x, y: y - 10, width: col.width, height: 12, borderWidth: 0.8, borderColor: scheme.border });
      page.drawText(col.label, { x: x + 2, y: y - 8, size: TOKENS.fontSizes.tiny, font: textFont, color: scheme.subtle });
      x += col.width;
    }
    y -= 14;

    for (const item of block.items) {
      if (y < 150) break;

      const parsed = parseRirPrescription(item.prescription);
      x = TOKENS.margin;
      for (const col of columns) {
        page.drawRectangle({ x, y: y - 10, width: col.width, height: 12, borderWidth: 0.8, borderColor: scheme.border });

        let value = '';
        if (col.key === 'check') value = '';
        if (col.key === 'exercise') value = item.name;
        if (col.key === 'prescription') value = item.prescription;
        if (col.key === 'sets') value = parsed?.sets ?? '';
        if (col.key === 'reps') value = parsed?.reps ?? '';
        if (col.key === 'rir') value = parsed?.rir ?? '';
        if (col.key === 'notes') value = '';

        if (value) {
          const line = wrapText(value, textFont, TOKENS.fontSizes.tiny, col.width - 4)[0] ?? '';
          page.drawText(line, { x: x + 2, y: y - 8, size: TOKENS.fontSizes.tiny, font: textFont, color: scheme.text });
        }

        x += col.width;
      }

      y -= 12;
    }

    y -= 8;
  }

  if (y > 96) {
    page.drawText('Session notes', { x: TOKENS.margin, y, size: TOKENS.fontSizes.body, font: titleFont, color: scheme.text });
    y -= TOKENS.lineHeights.body;

    for (let i = 0; i < 5; i += 1) {
      page.drawLine({
        start: { x: TOKENS.margin, y },
        end: { x: width - TOKENS.margin, y },
        thickness: 0.5,
        color: scheme.border,
      });
      y -= 12;
    }
  }

  drawFooter(page, `${pageModel.pageNumber} / ${pageModel.pageCount}`, textFont, scheme);
}

function drawProgressionSummary(
  page: PDFPage,
  pageModel: Extract<PdfRenderPage, { kind: 'progressionSummary' }>,
  startY: number,
  titleFont: PDFFont,
  textFont: PDFFont,
  scheme: ReturnType<typeof colorScheme>,
): void {
  const { width } = page.getSize();
  const chartLeft = TOKENS.margin;
  const chartBottom = 100;
  const chartWidth = width - TOKENS.margin * 2;
  const chartHeight = 120;
  let y = startY;

  page.drawText('Weekly summary', { x: TOKENS.margin, y, size: TOKENS.fontSizes.body, font: titleFont, color: scheme.text });
  y -= 16;

  const header = ['Week', 'Sessions', 'Avg Effort', 'Deload'];
  const colWidths = [44, 66, 68, 60];
  let x = TOKENS.margin;
  for (let i = 0; i < header.length; i += 1) {
    page.drawRectangle({ x, y: y - 10, width: colWidths[i] ?? 60, height: 12, borderWidth: 0.8, borderColor: scheme.border });
    page.drawText(header[i] ?? '', { x: x + 2, y: y - 8, size: TOKENS.fontSizes.tiny, font: textFont, color: scheme.subtle });
    x += colWidths[i] ?? 60;
  }
  y -= 12;

  for (const row of pageModel.rows.slice(0, 8)) {
    x = TOKENS.margin;
    const cells = [String(row.Week), String(row['Planned Sessions']), String(row['Avg Effort']), row['Is Deload Week']];

    for (let i = 0; i < cells.length; i += 1) {
      const cellW = colWidths[i] ?? 60;
      page.drawRectangle({ x, y: y - 10, width: cellW, height: 12, borderWidth: 0.8, borderColor: scheme.border });
      page.drawText(cells[i] ?? '', { x: x + 2, y: y - 8, size: TOKENS.fontSizes.tiny, font: textFont, color: scheme.text });
      x += cellW;
    }

    y -= 12;
  }

  page.drawText('Avg effort by week', { x: chartLeft, y: chartBottom + chartHeight + 10, size: TOKENS.fontSizes.small, font: textFont, color: scheme.subtle });

  page.drawLine({ start: { x: chartLeft, y: chartBottom }, end: { x: chartLeft, y: chartBottom + chartHeight }, thickness: 0.8, color: scheme.border });
  page.drawLine({ start: { x: chartLeft, y: chartBottom }, end: { x: chartLeft + chartWidth, y: chartBottom }, thickness: 0.8, color: scheme.border });

  const maxEffort = Math.max(1, ...pageModel.rows.map((row) => Number(row['Avg Effort']) || 0));
  const barAreaW = chartWidth - 14;
  const barW = Math.max(10, barAreaW / Math.max(1, pageModel.rows.length) - 8);

  for (let i = 0; i < pageModel.rows.length; i += 1) {
    const row = pageModel.rows[i];
    const value = Number(row['Avg Effort']) || 0;
    const ratio = value / maxEffort;
    const barH = ratio * (chartHeight - 20);
    const xBar = chartLeft + 10 + i * (barW + 8);
    const yBar = chartBottom + 1;

    page.drawRectangle({ x: xBar, y: yBar, width: barW, height: barH, borderWidth: 0.8, borderColor: scheme.subtle, color: rgb(0.85, 0.85, 0.85) });
    page.drawText(String(row.Week), { x: xBar + 1, y: chartBottom - 10, size: TOKENS.fontSizes.tiny, font: textFont, color: scheme.subtle });
  }

  drawFooter(page, `${pageModel.pageNumber} / ${pageModel.pageCount}`, textFont, scheme);
}

function buildCoverLines(model: ExportModel): string[] {
  const totals = [
    'Program Focus',
    'Initial Level',
    'Strength Profile',
    'Mesocycle Length (weeks)',
    'Sessions / Week',
    'Total Sessions',
    'Total Strength Sessions',
    'Total Endurance Sessions',
    'Total Deload Weeks',
  ];

  const values = new Map(model.overview.map((row) => [row.key, row.value]));
  return totals.map((key) => `${key}: ${values.get(key) ?? ''}`);
}

function weekSummaryLine(week: ExportModel['filteredWeeks'][number]): string {
  return `Sessions ${week.plannedSessionCount} | Strength ${week.summary.strengthSessions} | Endurance ${week.summary.enduranceSessions} | Avg Effort ${week.summary.avgEffort}`;
}

function withPageNumbers(pages: PdfRenderPage[]): PdfRenderPage[] {
  const pageCount = pages.length;
  let pageNumber = 1;

  return pages.map((page) => {
    if (page.kind === 'cover') return page;
    const numbered = { ...page, pageNumber, pageCount };
    pageNumber += 1;
    return numbered;
  });
}

function exportTimestamp(model: ExportModel): string | undefined {
  return model.overview.find((row) => row.key === 'Exported At')?.value;
}

function selectSessionDetailPages(model: ExportModel, options: PdfRenderOptions): Array<Extract<PdfRenderPage, { kind: 'sessionDetail' }>> {
  if (options.mode !== 'detailed' || options.detail !== 'full') return [];

  const pages: Array<Extract<PdfRenderPage, { kind: 'sessionDetail' }>> = [];

  for (const week of model.filteredWeeks) {
    for (const day of week.days) {
      if (!day.workout || !day.isTrainingDay) continue;

      pages.push({
        kind: 'sessionDetail',
        title: day.workout.title,
        subtitle: `${day.sessionType} | ${week.objective}`,
        weekIndex: week.weekIndex,
        dayLabel: day.dateLabel,
        objective: week.objective,
        effort: day.effort,
        sessionType: day.sessionType,
        target: day.workout.targetMode && day.workout.targetValue ? `${day.workout.targetMode.toUpperCase()} ${day.workout.targetValue}` : undefined,
        sessionTitle: day.workout.title,
        blocks: day.workout.blocks,
        notes: day.notes,
        pageNumber: 0,
        pageCount: 0,
      });
    }
  }

  return pages;
}

function maybeProgressionPage(model: ExportModel, options: PdfRenderOptions): Array<Extract<PdfRenderPage, { kind: 'progressionSummary' }>> {
  if (!options.includeProgressionChart) return [];

  return [
    {
      kind: 'progressionSummary',
      title: 'Progression Summary',
      subtitle: 'Sessions, effort, and deload indicators',
      rows: model.progressionRows,
      pageNumber: 0,
      pageCount: 0,
    },
  ];
}

export function buildPdfRenderModel(model: ExportModel, options: PdfRenderOptions): PdfRenderModel {
  const pages: PdfRenderPage[] = [];

  pages.push({
    kind: 'cover',
    title: 'Mesocycle Program',
    subtitle: `${model.program.inputs.focus} | ${model.program.inputs.level} | ${model.program.inputs.strengthProfile} | ${options.mode}`,
    lines: buildCoverLines(model),
    howToUse: [
      'Effort scale: 1 easy to 5 hard',
      'RIR means reps in reserve',
      'Stop if pain rises sharply and adjust load.',
    ],
  });

  const exportedAt = exportTimestamp(model);

  for (const week of model.filteredWeeks) {
    pages.push({
      kind: 'weekOverview',
      title: `Week ${week.weekIndex}`,
      subtitle: `Objective: ${week.objective}`,
      weekIndex: week.weekIndex,
      objective: week.objective,
      isDeloadWeek: week.isDeloadWeek,
      weekSummary: weekSummaryLine(week),
      days: week.days,
      pageNumber: 0,
      pageCount: 0,
      exportTimestamp: exportedAt,
    });
  }

  pages.push(...selectSessionDetailPages(model, options));
  pages.push(...maybeProgressionPage(model, options));

  return { pages: withPageNumbers(pages) };
}

export async function buildPdfBytes(renderModel: PdfRenderModel, options?: PdfRenderOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const textFont = await doc.embedFont(StandardFonts.Helvetica);

  const resolved: PdfRenderOptions =
    options ?? {
      mode: 'compact',
      detail: 'calendar-only',
      paperSize: 'letter',
      orientation: 'auto',
      grayscale: false,
      inkSaver: true,
      includeLegend: true,
      includeProgressionChart: false,
    };

  const orientation = resolveOrientation(resolved);
  const [pageWidth, pageHeight] = PAGE_SIZES[resolved.paperSize][orientation];
  const scheme = colorScheme(resolved.grayscale, resolved.inkSaver);

  for (const pageModel of renderModel.pages) {
    const page = doc.addPage([pageWidth, pageHeight]);
    drawPageChrome(page, scheme);
    const startY = drawHeader(page, pageModel.title, pageModel.subtitle, titleFont, textFont, scheme);

    if (pageModel.kind === 'cover') {
      drawCover(page, pageModel, startY, textFont, scheme, resolved.includeLegend);
      continue;
    }

    if (pageModel.kind === 'weekOverview') {
      drawWeekOverview(page, pageModel, startY, titleFont, textFont, scheme, resolved);
      continue;
    }

    if (pageModel.kind === 'sessionDetail') {
      drawSessionDetail(page, pageModel, startY, titleFont, textFont, scheme);
      continue;
    }

    drawProgressionSummary(page, pageModel, startY, titleFont, textFont, scheme);
  }

  return doc.save();
}

export type { PdfRenderOptions };
