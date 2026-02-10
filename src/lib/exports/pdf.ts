import { PDFDocument, StandardFonts } from 'pdf-lib';
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

function resolveOrientation(options: PdfRenderOptions): 'portrait' | 'landscape' {
  if (options.orientation === 'portrait' || options.orientation === 'landscape') {
    return options.orientation;
  }

  return options.mode === 'compact' ? 'landscape' : 'portrait';
}

export function buildPdfRenderModel(model: ExportModel, options: PdfRenderOptions): PdfRenderModel {
  const pages: PdfRenderPage[] = [];

  pages.push({
    title: 'Mesocycle Program',
    subtitle: `${model.program.inputs.focus} | ${model.program.inputs.level} | ${model.program.inputs.strengthProfile}`,
    lines: model.overview.map((row) => `${row.key}: ${row.value}`),
  });

  for (const row of model.calendarRows) {
    pages.push({
      title: `Week ${row.Week} Calendar`,
      subtitle: `Objective: ${row.Objective}`,
      lines: [
        `Mon: ${row.Mon}`,
        `Tue: ${row.Tue}`,
        `Wed: ${row.Wed}`,
        `Thu: ${row.Thu}`,
        `Fri: ${row.Fri}`,
        `Sat: ${row.Sat}`,
        `Sun: ${row.Sun}`,
      ],
    });
  }

  if (options.mode === 'detailed') {
    const grouped = new Map<string, Array<Record<string, string | number>>>();
    for (const row of model.workoutRows) {
      const key = `Week ${row.Week} ${row.Day}`;
      const rows = grouped.get(key) ?? [];
      rows.push(row);
      grouped.set(key, rows);
    }

    for (const [key, rows] of grouped) {
      const first = rows[0];
      pages.push({
        title: key,
        subtitle: String(first?.['Session Title'] ?? ''),
        lines: rows.map(
          (entry) => `${entry.Block}: ${entry.Exercise} - ${entry.Prescription} ${entry.RIR ? `(RIR ${entry.RIR})` : ''}`,
        ),
      });
    }
  }

  return { pages };
}

export async function buildPdfBytes(renderModel: PdfRenderModel): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const defaultOptions: PdfRenderOptions = {
    mode: 'compact',
    paperSize: 'letter',
    orientation: 'portrait',
    grayscale: false,
    includeLegend: true,
  };

  const orientation = resolveOrientation(defaultOptions);
  const [pageWidth, pageHeight] = PAGE_SIZES[defaultOptions.paperSize][orientation];

  for (const pageModel of renderModel.pages) {
    const page = doc.addPage([pageWidth, pageHeight]);

    let y = pageHeight - 40;
    page.drawText(pageModel.title, { x: 36, y, size: 16, font });
    y -= 20;

    if (pageModel.subtitle) {
      page.drawText(pageModel.subtitle, { x: 36, y, size: 10, font });
      y -= 18;
    }

    for (const rawLine of pageModel.lines) {
      const lines = rawLine.split('\n');
      for (const line of lines) {
        if (y < 36) break;
        page.drawText(line.slice(0, 130), { x: 36, y, size: 9, font });
        y -= 12;
      }
      if (y < 36) break;
    }
  }

  return doc.save();
}

export type { PdfRenderOptions };
