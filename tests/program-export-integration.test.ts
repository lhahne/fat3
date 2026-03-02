/**
 * Higher-level integration tests that exercise the full program → export pipeline.
 * These tests cross library boundaries: generateProgram → mapProgramToExportModel → Excel/PDF builders.
 */
import ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { buildExcelWorkbook } from '../src/lib/exports/excel';
import { mapProgramToExportModel } from '../src/lib/exports/mapper';
import { buildPdfBytes, buildPdfRenderModel } from '../src/lib/exports/pdf';
import type { ExportOptions } from '../src/lib/exports/types';
import { generateProgram, type Focus, type Level, type StrengthProfile } from '../src/lib/planner';

const NOW_ISO = '2024-06-15T10:00:00.000Z';

const ALL_OPTIONS: ExportOptions = {
  scope: 'all',
  detail: 'full',
  pdfMode: 'detailed',
  paperSize: 'letter',
  orientation: 'auto',
  grayscale: false,
  inkSaver: true,
  includeLegend: true,
  includeProgressionChart: true,
};

describe('program → Excel pipeline', () => {
  const focuses: Focus[] = ['strength', 'endurance', 'mixed'];

  for (const focus of focuses) {
    it(`produces a valid Excel workbook for ${focus} focus`, async () => {
      const program = generateProgram({
        focus,
        mixedBias: focus === 'mixed' ? 50 : undefined,
        mesocycleWeeks: 6,
        level: 'intermediate',
        sessionsPerWeek: 4,
        strengthProfile: 'balanced',
      });
      const model = mapProgramToExportModel(program, ALL_OPTIONS, NOW_ISO);
      const bytes = await buildExcelWorkbook(model);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(bytes as Parameters<typeof workbook.xlsx.load>[0]);

      const sheet = workbook.getWorksheet('Sessions Tracker');
      expect(sheet).toBeDefined();
      expect(sheet!.rowCount).toBeGreaterThan(1);
      expect(sheet!.getRow(1).getCell(1).value).toBe('Exercise');
    });
  }

  const profiles: StrengthProfile[] = ['balanced', 'powerlifting', 'bodybuilding', 'endurance-support'];

  for (const profile of profiles) {
    it(`produces a valid Excel workbook for ${profile} strength profile`, async () => {
      const program = generateProgram({
        focus: 'strength',
        mesocycleWeeks: 6,
        level: 'intermediate',
        sessionsPerWeek: 4,
        strengthProfile: profile,
      });
      const model = mapProgramToExportModel(program, ALL_OPTIONS, NOW_ISO);
      const bytes = await buildExcelWorkbook(model);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(bytes as Parameters<typeof workbook.xlsx.load>[0]);

      expect(workbook.getWorksheet('Sessions Tracker')).toBeDefined();
    });
  }
});

describe('program → PDF pipeline', () => {
  const levels: Level[] = ['beginner', 'intermediate', 'advanced'];

  for (const level of levels) {
    it(`produces valid PDF bytes for ${level} level`, async () => {
      const program = generateProgram({
        focus: 'strength',
        mesocycleWeeks: 4,
        level,
        sessionsPerWeek: 3,
        strengthProfile: 'balanced',
      });
      const model = mapProgramToExportModel(program, ALL_OPTIONS, NOW_ISO);
      const renderModel = buildPdfRenderModel(model, { ...ALL_OPTIONS, mode: 'detailed' });
      const bytes = await buildPdfBytes(renderModel, { ...ALL_OPTIONS, mode: 'detailed' });

      const doc = await PDFDocument.load(bytes);
      expect(bytes.byteLength).toBeGreaterThan(500);
      expect(doc.getPageCount()).toBe(renderModel.pages.length);
    });
  }

  it('detailed mode includes session detail and progression pages', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 6,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });
    const model = mapProgramToExportModel(program, ALL_OPTIONS, NOW_ISO);
    const renderModel = buildPdfRenderModel(model, { ...ALL_OPTIONS, mode: 'detailed' });

    expect(renderModel.pages.some((p) => p.kind === 'sessionDetail')).toBe(true);
    expect(renderModel.pages.some((p) => p.kind === 'progressionSummary')).toBe(true);
  });

  it('compact calendar-only mode excludes session detail and progression pages', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    });
    const calOptions: ExportOptions = { ...ALL_OPTIONS, detail: 'calendar-only', includeProgressionChart: false };
    const model = mapProgramToExportModel(program, calOptions, NOW_ISO);
    const renderModel = buildPdfRenderModel(model, { ...calOptions, mode: 'compact' });

    expect(renderModel.pages[0]?.kind).toBe('cover');
    expect(renderModel.pages.every((p) => p.kind !== 'sessionDetail')).toBe(true);
    expect(renderModel.pages.every((p) => p.kind !== 'progressionSummary')).toBe(true);
    expect(renderModel.pages.some((p) => p.kind === 'weekOverview')).toBe(true);
  });

  it('PDF page count equals weeks + 1 cover in compact calendar-only mode', () => {
    const mesocycleWeeks = 6;
    const program = generateProgram({
      focus: 'endurance',
      mesocycleWeeks,
      level: 'beginner',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    });
    const calOptions: ExportOptions = { ...ALL_OPTIONS, detail: 'calendar-only', includeProgressionChart: false };
    const model = mapProgramToExportModel(program, calOptions, NOW_ISO);
    const renderModel = buildPdfRenderModel(model, { ...calOptions, mode: 'compact' });

    expect(renderModel.pages.length).toBe(mesocycleWeeks + 1);
  });
});

describe('scope filtering across the pipeline', () => {
  it('selected weeks scope delivers only the requested weeks to the export model', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 8,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });

    const allModel = mapProgramToExportModel(program, { ...ALL_OPTIONS, scope: 'all' }, NOW_ISO);
    const selectedModel = mapProgramToExportModel(
      program,
      { ...ALL_OPTIONS, scope: 'selected', selectedWeeks: [2, 4] },
      NOW_ISO,
    );

    expect(allModel.filteredWeeks.length).toBe(8);
    expect(selectedModel.filteredWeeks.length).toBe(2);
    expect(selectedModel.filteredWeeks.map((w) => w.weekIndex)).toEqual([2, 4]);
  });

  it('selected scope reduces PDF page count proportionally', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 8,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });

    const calOptions: ExportOptions = { ...ALL_OPTIONS, detail: 'calendar-only', includeProgressionChart: false };

    const allModel = mapProgramToExportModel(program, { ...calOptions, scope: 'all' }, NOW_ISO);
    const allRender = buildPdfRenderModel(allModel, { ...calOptions, mode: 'compact' });

    const selectedModel = mapProgramToExportModel(
      program,
      { ...calOptions, scope: 'selected', selectedWeeks: [1, 2, 3] },
      NOW_ISO,
    );
    const selectedRender = buildPdfRenderModel(selectedModel, { ...calOptions, mode: 'compact' });

    expect(allRender.pages.length).toBeGreaterThan(selectedRender.pages.length);
    // cover + 3 week pages
    expect(selectedRender.pages.length).toBe(4);
  });
});

describe('progression rows across the pipeline', () => {
  it('deload weeks are correctly flagged in progression rows', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 6,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });
    const model = mapProgramToExportModel(program, ALL_OPTIONS, NOW_ISO);

    const deloadRows = model.progressionRows.filter((r) => r['Is Deload Week'] === 'yes');
    expect(deloadRows.length).toBeGreaterThan(0);
    // Week 6 is always a deload for a 6-week program
    expect(deloadRows.some((r) => r.Week === 6)).toBe(true);
  });

  it('progression rows include Mixed Sessions column with numeric values', () => {
    const program = generateProgram({
      focus: 'mixed',
      mixedBias: 50,
      mesocycleWeeks: 4,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });
    const model = mapProgramToExportModel(program, ALL_OPTIONS, NOW_ISO);

    for (const row of model.progressionRows) {
      expect(row).toHaveProperty('Mixed Sessions');
      expect(typeof row['Mixed Sessions']).toBe('number');
    }
  });

  it('mixed focus plan produces both strength and endurance sessions (not a mixed session type)', () => {
    // The planner splits mixed focus into separate strength and endurance days;
    // sessionType === 'mixed' is reserved but not yet used by the scheduler.
    const program = generateProgram({
      focus: 'mixed',
      mixedBias: 50,
      mesocycleWeeks: 4,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });
    const model = mapProgramToExportModel(program, ALL_OPTIONS, NOW_ISO);

    const totalStrength = model.progressionRows.reduce((sum, r) => sum + r['Strength Sessions'], 0);
    const totalEndurance = model.progressionRows.reduce((sum, r) => sum + r['Endurance Sessions'], 0);
    expect(totalStrength).toBeGreaterThan(0);
    expect(totalEndurance).toBeGreaterThan(0);
    // Mixed Sessions column exists and is numeric (value is 0 for current scheduler)
    for (const row of model.progressionRows) {
      expect(typeof row['Mixed Sessions']).toBe('number');
    }
  });
});

describe('deload structure at boundary week counts', () => {
  it('4-week program: only week 4 is a deload week', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    });
    const deloadWeeks = program.weeks.filter((w) => w.isDeloadWeek).map((w) => w.weekIndex);
    expect(deloadWeeks).toEqual([4]);
  });

  it('6-week program: only week 6 is a deload week', () => {
    const program = generateProgram({
      focus: 'endurance',
      mesocycleWeeks: 6,
      level: 'beginner',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    });
    const deloadWeeks = program.weeks.filter((w) => w.isDeloadWeek).map((w) => w.weekIndex);
    expect(deloadWeeks).toEqual([6]);
  });

  it('8-week program: has a mid-cycle deload and a final deload', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 8,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });
    const deloadWeeks = program.weeks.filter((w) => w.isDeloadWeek).map((w) => w.weekIndex);
    expect(deloadWeeks.length).toBe(2);
    expect(deloadWeeks).toContain(8);
  });

  it('12-week program: has deloads at weeks 4, 8, and 12', () => {
    const program = generateProgram({
      focus: 'endurance',
      mesocycleWeeks: 12,
      level: 'advanced',
      sessionsPerWeek: 5,
      strengthProfile: 'endurance-support',
    });
    const deloadWeeks = program.weeks.filter((w) => w.isDeloadWeek).map((w) => w.weekIndex);
    expect(deloadWeeks).toContain(4);
    expect(deloadWeeks).toContain(8);
    expect(deloadWeeks).toContain(12);
  });
});
