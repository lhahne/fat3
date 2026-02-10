import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ExportModel, PdfRenderModel, PdfRenderPage } from './types';

type PdfRenderOptions = {
  mode: 'compact' | 'detailed';
  paperSize: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape' | 'auto';
  grayscale: boolean;
  includeLegend: boolean;
};

const PAGE_SIZES = {
  letter: { portrait: [612, 792], landscape: [792, 612] },
  a4: { portrait: [595, 842], landscape: [842, 595] },
} as const;

const MARGIN = 32;
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function resolveOrientation(options: PdfRenderOptions): 'portrait' | 'landscape' {
  if (options.orientation === 'portrait' || options.orientation === 'landscape') return options.orientation;
  return options.mode === 'compact' ? 'landscape' : 'portrait';
}

function colorScheme(grayscale: boolean) {
  if (grayscale) {
    return {
      background: rgb(0.98, 0.98, 0.98),
      panel: rgb(1, 1, 1),
      panelMuted: rgb(0.95, 0.95, 0.95),
      text: rgb(0.12, 0.12, 0.12),
      subtle: rgb(0.42, 0.42, 0.42),
      accent: rgb(0.25, 0.25, 0.25),
      strength: rgb(0.86, 0.86, 0.86),
      endurance: rgb(0.82, 0.82, 0.82),
      deload: rgb(0.9, 0.9, 0.9),
      rest: rgb(0.95, 0.95, 0.95),
    };
  }

  return {
    background: rgb(0.95, 0.97, 0.94),
    panel: rgb(1, 1, 1),
    panelMuted: rgb(0.93, 0.96, 0.92),
    text: rgb(0.1, 0.16, 0.12),
    subtle: rgb(0.3, 0.38, 0.32),
    accent: rgb(0.14, 0.36, 0.24),
    strength: rgb(0.76, 0.9, 0.82),
    endurance: rgb(0.8, 0.87, 0.96),
    deload: rgb(0.97, 0.88, 0.76),
    rest: rgb(0.9, 0.92, 0.94),
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
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function dayColor(type: string, scheme: ReturnType<typeof colorScheme>) {
  if (type === 'strength') return scheme.strength;
  if (type === 'endurance') return scheme.endurance;
  if (type === 'deload') return scheme.deload;
  return scheme.rest;
}

function drawFrame(page: PDFPage, scheme: ReturnType<typeof colorScheme>) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: scheme.background });
  page.drawRectangle({ x: 0, y: height - 56, width, height: 56, color: scheme.panelMuted });
}

function drawHeader(page: PDFPage, title: string, subtitle: string | undefined, titleFont: PDFFont, textFont: PDFFont, scheme: ReturnType<typeof colorScheme>) {
  const { height } = page.getSize();
  page.drawText(title, { x: MARGIN, y: height - 36, size: 18, font: titleFont, color: scheme.text });
  if (subtitle) {
    page.drawText(subtitle, { x: MARGIN, y: height - 54, size: 10, font: textFont, color: scheme.subtle });
    return height - 76;
  }
  return height - 62;
}

function getDayLines(day: PdfRenderPage & { kind: 'week' }['days'][number], detailed: boolean): string[] {
  const lines: string[] = [];
  lines.push(day.workout?.title ?? (day.isTrainingDay ? day.sessionType : 'Rest'));
  lines.push(`${day.sessionType.toUpperCase()} | Effort ${day.effort}/5`);

  if (!detailed || !day.workout) return lines;

  if (day.workout.kind === 'strength') {
    const mainItem = day.workout.blocks[1]?.items[0];
    if (mainItem) lines.push(`${mainItem.name}: ${mainItem.prescription}`);
  } else {
    const mainItem = day.workout.blocks[1]?.items[0];
    if (mainItem) lines.push(mainItem.prescription);
    if (day.workout.targetMode && day.workout.targetValue) {
      lines.push(`${day.workout.targetMode.toUpperCase()} ${day.workout.targetValue}`);
    }
  }

  return lines;
}

function drawWeekGrid(
  page: PDFPage,
  weekPage: Extract<PdfRenderPage, { kind: 'week' }>,
  startY: number,
  detailed: boolean,
  titleFont: PDFFont,
  textFont: PDFFont,
  scheme: ReturnType<typeof colorScheme>,
): void {
  const { width } = page.getSize();
  const gridWidth = width - MARGIN * 2;
  const dayWidth = gridWidth / 7;
  const headerH = 18;
  const cellH = detailed ? 180 : 120;

  page.drawRectangle({ x: MARGIN, y: startY - headerH, width: gridWidth, height: headerH, color: scheme.panel });

  for (let idx = 0; idx < DAY_ORDER.length; idx += 1) {
    const x = MARGIN + idx * dayWidth;
    page.drawRectangle({ x, y: startY - headerH, width: dayWidth, height: headerH, borderWidth: 0.8, borderColor: scheme.panelMuted });
    page.drawText(DAY_ORDER[idx], { x: x + 5, y: startY - 13, size: 9, font: titleFont, color: scheme.subtle });
  }

  const weekDaysByLabel = new Map(weekPage.days.map((day) => [day.dateLabel, day]));
  const rowY = startY - headerH - cellH;

  for (let idx = 0; idx < DAY_ORDER.length; idx += 1) {
    const x = MARGIN + idx * dayWidth;
    const day = weekDaysByLabel.get(DAY_ORDER[idx]);
    if (!day) continue;

    page.drawRectangle({
      x,
      y: rowY,
      width: dayWidth,
      height: cellH,
      color: dayColor(day.sessionType, scheme),
      borderWidth: 0.9,
      borderColor: scheme.panelMuted,
    });

    let textY = rowY + cellH - 14;
    page.drawText(day.dateLabel, { x: x + 5, y: textY, size: 8, font: titleFont, color: scheme.text });
    textY -= 12;

    const lines = getDayLines(day, detailed);
    for (const raw of lines) {
      const wrapped = wrapText(raw, textFont, 7.8, dayWidth - 8);
      for (const line of wrapped.slice(0, detailed ? 3 : 2)) {
        if (textY < rowY + 6) break;
        page.drawText(line, { x: x + 4, y: textY, size: 7.8, font: textFont, color: scheme.text });
        textY -= 9;
      }
      if (textY < rowY + 6) break;
    }
  }

  page.drawText(`Week ${weekPage.weekIndex} · ${weekPage.objective.toUpperCase()}`, {
    x: MARGIN,
    y: rowY - 18,
    size: 10,
    font: titleFont,
    color: scheme.subtle,
  });
}

function drawCover(
  page: PDFPage,
  pageModel: Extract<PdfRenderPage, { kind: 'cover' }>,
  startY: number,
  titleFont: PDFFont,
  textFont: PDFFont,
  scheme: ReturnType<typeof colorScheme>,
  includeLegend: boolean,
): void {
  const { width } = page.getSize();
  const panelW = width - MARGIN * 2;
  let y = startY;

  if (includeLegend) {
    const legend = [
      ['Strength', scheme.strength],
      ['Endurance', scheme.endurance],
      ['Deload', scheme.deload],
      ['Rest', scheme.rest],
    ] as const;

    let lx = MARGIN;
    for (const [label, color] of legend) {
      page.drawRectangle({ x: lx, y: y - 10, width: 10, height: 10, color });
      page.drawText(label, { x: lx + 14, y: y - 9, size: 8, font: textFont, color: scheme.subtle });
      lx += 92;
    }
    y -= 24;
  }

  for (const line of pageModel.lines) {
    if (y < 62) break;
    page.drawRectangle({
      x: MARGIN,
      y: y - 22,
      width: panelW,
      height: 20,
      color: scheme.panel,
      borderColor: scheme.panelMuted,
      borderWidth: 0.8,
    });

    const wrapped = wrapText(line, textFont, 9, panelW - 12);
    page.drawText(wrapped[0] ?? '', { x: MARGIN + 6, y: y - 14, size: 9, font: textFont, color: scheme.text });
    y -= 24;
  }
}

export function buildPdfRenderModel(model: ExportModel, options: PdfRenderOptions): PdfRenderModel {
  const pages: PdfRenderPage[] = [];

  pages.push({
    kind: 'cover',
    title: 'Mesocycle Program',
    subtitle: `${model.program.inputs.focus} | ${model.program.inputs.level} | ${model.program.inputs.strengthProfile} | ${options.mode}`,
    lines: model.overview.map((row) => `${row.key}: ${row.value}`),
  });

  for (const week of model.filteredWeeks) {
    pages.push({
      kind: 'week',
      title: `Week ${week.weekIndex}`,
      subtitle: `Objective: ${week.objective}`,
      weekIndex: week.weekIndex,
      objective: week.objective,
      days: week.days,
    });
  }

  return { pages };
}

export async function buildPdfBytes(renderModel: PdfRenderModel, options?: PdfRenderOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const textFont = await doc.embedFont(StandardFonts.Helvetica);

  const resolved: PdfRenderOptions = options ?? {
    mode: 'compact',
    paperSize: 'letter',
    orientation: 'portrait',
    grayscale: false,
    includeLegend: true,
  };

  const orientation = resolveOrientation(resolved);
  const [pageWidth, pageHeight] = PAGE_SIZES[resolved.paperSize][orientation];
  const scheme = colorScheme(resolved.grayscale);

  for (const pageModel of renderModel.pages) {
    const page = doc.addPage([pageWidth, pageHeight]);
    drawFrame(page, scheme);
    const startY = drawHeader(page, pageModel.title, pageModel.subtitle, titleFont, textFont, scheme);

    if (pageModel.kind === 'cover') {
      drawCover(page, pageModel, startY, titleFont, textFont, scheme, resolved.includeLegend);
    } else {
      drawWeekGrid(page, pageModel, startY, resolved.mode === 'detailed', titleFont, textFont, scheme);
    }
  }

  return doc.save();
}

export type { PdfRenderOptions };
