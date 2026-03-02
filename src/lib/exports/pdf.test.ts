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
      strengthProfile: 'balanced',
    });

    const nowIso = '2024-01-02T03:04:05.000Z';
    const model = mapProgramToExportModel(
      program,
      {
        scope: 'all',
        detail: 'full',
        pdfMode: 'detailed',
        paperSize: 'letter',
        orientation: 'auto',
        grayscale: false,
        inkSaver: true,
        includeLegend: true,
        includeProgressionChart: true,
      },
      nowIso,
    );

    const renderModel = buildPdfRenderModel(model, {
      mode: 'detailed',
      detail: 'full',
      paperSize: 'letter',
      orientation: 'auto',
      grayscale: false,
      inkSaver: true,
      includeLegend: true,
      includeProgressionChart: true,
    });

    expect(renderModel.pages.length).toBeGreaterThan(1);
    expect(renderModel.pages[0]?.title).toBe('Mesocycle Program');
    expect(renderModel.pages[0]?.kind).toBe('cover');
    expect(renderModel.pages.some((page) => page.kind === 'sessionDetail')).toBe(true);
    expect(renderModel.pages.some((page) => page.kind === 'progressionSummary')).toBe(true);

    const bytes = await buildPdfBytes(renderModel, {
      mode: 'detailed',
      detail: 'full',
      paperSize: 'letter',
      orientation: 'auto',
      grayscale: false,
      inkSaver: true,
      includeLegend: true,
      includeProgressionChart: true,
    });
    const loaded = await PDFDocument.load(bytes);
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(loaded.getPageCount()).toBe(renderModel.pages.length);
  });

  it('omits session details and progression page in compact calendar-only mode', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    });

    const model = mapProgramToExportModel(
      program,
      {
        scope: 'all',
        detail: 'calendar-only',
        pdfMode: 'compact',
        paperSize: 'letter',
        orientation: 'auto',
        grayscale: true,
        inkSaver: true,
        includeLegend: true,
        includeProgressionChart: false,
      },
      '2024-01-02T03:04:05.000Z',
    );

    const renderModel = buildPdfRenderModel(model, {
      mode: 'compact',
      detail: 'calendar-only',
      paperSize: 'letter',
      orientation: 'auto',
      grayscale: true,
      inkSaver: true,
      includeLegend: true,
      includeProgressionChart: false,
    });

    expect(renderModel.pages[0]?.kind).toBe('cover');
    expect(renderModel.pages.every((page) => page.kind !== 'sessionDetail')).toBe(true);
    expect(renderModel.pages.every((page) => page.kind !== 'progressionSummary')).toBe(true);
  });
});
