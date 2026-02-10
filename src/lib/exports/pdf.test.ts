import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateProgram } from '../planner';
import { mapProgramToExportModel } from './mapper';
import { buildPdfBytes, buildPdfRenderModel } from './pdf';

describe('PDF export', () => {
  it('builds deterministic render model and generates non-empty PDF bytes', async () => {
    const program = generateProgram({
      focus: 'endurance',
      mesocycleWeeks: 6,
      level: 'intermediate',
      sessionsPerWeek: 4,
      autoDeload: true,
      strengthProfile: 'balanced',
    });

    const model = mapProgramToExportModel(program, {
      scope: 'all',
      detail: 'full',
      pdfMode: 'detailed',
      paperSize: 'letter',
      orientation: 'auto',
      grayscale: false,
      includeLegend: true,
      includeProgressionChart: true,
    });

    const renderModel = buildPdfRenderModel(model, {
      mode: 'detailed',
      paperSize: 'letter',
      orientation: 'auto',
      grayscale: false,
      includeLegend: true,
    });

    expect(renderModel.pages.length).toBeGreaterThan(1);
    expect(renderModel.pages[0]?.title).toBe('Mesocycle Program');

    const bytes = await buildPdfBytes(renderModel);
    const loaded = await PDFDocument.load(bytes);
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(loaded.getPageCount()).toBeGreaterThan(1);
  });
});
