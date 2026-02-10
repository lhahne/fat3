import type { ProgramOutput } from '../planner';
import type { ExportOptions } from './types';

function timestampDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function baseName(program: ProgramOutput): string {
  return `mesocycle-${program.inputs.focus}-${program.inputs.strengthProfile}-${timestampDate()}`;
}

function downloadBinary(data: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportProgramAsExcel(program: ProgramOutput, options: ExportOptions): Promise<void> {
  const [{ mapProgramToExportModel }, { buildExcelWorkbook }] = await Promise.all([
    import('./mapper'),
    import('./excel'),
  ]);
  const model = mapProgramToExportModel(program, options);
  const bytes = buildExcelWorkbook(model);
  downloadBinary(bytes, `${baseName(program)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function exportProgramAsPdf(program: ProgramOutput, options: ExportOptions): Promise<void> {
  const [{ mapProgramToExportModel }, { buildPdfBytes, buildPdfRenderModel }] = await Promise.all([
    import('./mapper'),
    import('./pdf'),
  ]);
  const model = mapProgramToExportModel(program, options);
  const renderModel = buildPdfRenderModel(model, {
    mode: options.pdfMode,
    paperSize: options.paperSize,
    orientation: options.orientation,
    grayscale: options.grayscale,
    includeLegend: options.includeLegend,
  });
  const bytes = await buildPdfBytes(renderModel);
  downloadBinary(bytes, `${baseName(program)}.pdf`, 'application/pdf');
}
