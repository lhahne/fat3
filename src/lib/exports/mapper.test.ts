import { describe, expect, it } from 'vitest';
import { generateProgram } from '../planner';
import { mapProgramToExportModel } from './mapper';

describe('mapProgramToExportModel', () => {
  it('maps overview, calendar, workouts and progression rows', () => {
    const program = generateProgram({
      focus: 'mixed',
      mixedBias: 50,
      mesocycleWeeks: 6,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });

    const nowIso = '2024-06-01T12:00:00.000Z';
    const model = mapProgramToExportModel(
      program,
      {
        scope: 'selected',
        selectedWeeks: [1, 2],
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

    expect(model.overview.some((row) => row.key === 'Program Focus' && row.value === 'mixed')).toBe(true);
    expect(model.sessionRows.length).toBeGreaterThan(0);
    expect(model.sessionRows[0]).toHaveProperty('Exercise');
    expect(model.sessionRows[0]).toHaveProperty('Prescription');
    expect(model.sessionRows[0]).toHaveProperty('Actual Reps');
    expect(model.sessionRows[0]).toHaveProperty('Weight');
    expect(model.sessionRows[0]).toHaveProperty('Notes');
    expect(model.overview.some((row) => row.key === 'Exported At' && row.value === nowIso)).toBe(true);
  });

  it('scope: selected filters to only the requested week indexes', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 8,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });

    const model = mapProgramToExportModel(
      program,
      {
        scope: 'selected',
        selectedWeeks: [3, 5],
        detail: 'full',
        pdfMode: 'compact',
        paperSize: 'letter',
        orientation: 'auto',
        grayscale: false,
        inkSaver: true,
        includeLegend: true,
        includeProgressionChart: false,
      },
      '2024-01-01T00:00:00.000Z',
    );

    expect(model.filteredWeeks.length).toBe(2);
    expect(model.filteredWeeks.map((w) => w.weekIndex)).toEqual([3, 5]);
  });

  it('scope: all returns every week', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 6,
      level: 'beginner',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    });

    const model = mapProgramToExportModel(
      program,
      {
        scope: 'all',
        detail: 'full',
        pdfMode: 'compact',
        paperSize: 'letter',
        orientation: 'auto',
        grayscale: false,
        inkSaver: true,
        includeLegend: true,
        includeProgressionChart: false,
      },
      '2024-01-01T00:00:00.000Z',
    );

    expect(model.filteredWeeks.length).toBe(6);
  });

  it('detail: calendar-only produces empty workoutRows', () => {
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
        grayscale: false,
        inkSaver: true,
        includeLegend: true,
        includeProgressionChart: false,
      },
      '2024-01-01T00:00:00.000Z',
    );

    expect(model.workoutRows.length).toBe(0);
  });

  it('detail: full produces non-empty workoutRows for strength programs', () => {
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
        detail: 'full',
        pdfMode: 'compact',
        paperSize: 'letter',
        orientation: 'auto',
        grayscale: false,
        inkSaver: true,
        includeLegend: true,
        includeProgressionChart: false,
      },
      '2024-01-01T00:00:00.000Z',
    );

    expect(model.workoutRows.length).toBeGreaterThan(0);
    expect(model.workoutRows[0]).toHaveProperty('Exercise');
    expect(model.workoutRows[0]).toHaveProperty('Prescription');
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

    const model = mapProgramToExportModel(
      program,
      {
        scope: 'all',
        detail: 'full',
        pdfMode: 'compact',
        paperSize: 'letter',
        orientation: 'auto',
        grayscale: false,
        inkSaver: true,
        includeLegend: true,
        includeProgressionChart: true,
      },
      '2024-01-01T00:00:00.000Z',
    );

    for (const row of model.progressionRows) {
      expect(row).toHaveProperty('Mixed Sessions');
      expect(typeof row['Mixed Sessions']).toBe('number');
    }
  });

  it('overview does not contain a Generated At field', () => {
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
        detail: 'full',
        pdfMode: 'compact',
        paperSize: 'letter',
        orientation: 'auto',
        grayscale: false,
        inkSaver: true,
        includeLegend: true,
        includeProgressionChart: false,
      },
      '2024-01-01T00:00:00.000Z',
    );

    expect(model.overview.some((row) => row.key === 'Generated At')).toBe(false);
  });
});
