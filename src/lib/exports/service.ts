import type { ProgramOutput } from '../planner';
import type { ExportOptions } from './types';

function timestampDate(nowIso: string): string {
  return nowIso.slice(0, 10);
}

function baseName(program: ProgramOutput, nowIso: string): string {
  return `mesocycle-${program.inputs.focus}-${program.inputs.strengthProfile}-${timestampDate(nowIso)}`;
}

function toBlobPart(data: BlobPart | Uint8Array): BlobPart {
  if (!(data instanceof Uint8Array)) {
    return data;
  }

  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

function downloadBinary(data: BlobPart | Uint8Array, filename: string, mimeType: string): void {
  const blob = new Blob([toBlobPart(data)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportProgramAsExcel(program: ProgramOutput, options: ExportOptions): Promise<void> {
  const nowIso = new Date().toISOString();
  const [{ mapProgramToExportModel }, { buildExcelWorkbook }] = await Promise.all([
    import('./mapper'),
    import('./excel'),
  ]);
  const model = mapProgramToExportModel(program, options, nowIso);
  const bytes = await buildExcelWorkbook(model);
  downloadBinary(bytes, `${baseName(program, nowIso)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function exportProgramAsPdf(program: ProgramOutput, options: ExportOptions): Promise<void> {
  const nowIso = new Date().toISOString();
  const [{ mapProgramToExportModel }, { buildPdfBytes, buildPdfRenderModel }] = await Promise.all([
    import('./mapper'),
    import('./pdf'),
  ]);
  const model = mapProgramToExportModel(program, options, nowIso);
  const renderModel = buildPdfRenderModel(model, {
    mode: options.pdfMode,
    detail: options.detail,
    paperSize: options.paperSize,
    orientation: options.orientation,
    grayscale: options.grayscale,
    inkSaver: options.inkSaver,
    includeLegend: options.includeLegend,
    includeProgressionChart: options.includeProgressionChart,
  });
  const bytes = await buildPdfBytes(renderModel, {
    mode: options.pdfMode,
    detail: options.detail,
    paperSize: options.paperSize,
    orientation: options.orientation,
    grayscale: options.grayscale,
    inkSaver: options.inkSaver,
    includeLegend: options.includeLegend,
    includeProgressionChart: options.includeProgressionChart,
  });
  downloadBinary(bytes, `${baseName(program, nowIso)}.pdf`, 'application/pdf');
}
