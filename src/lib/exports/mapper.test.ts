import { describe, expect, it } from 'vitest';
import { generateProgram } from '../planner';
import type { DayLog } from '../tracking/types';
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

  it('populates Actual Reps, Weight and Notes from tracking logs', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    });

    // Find the first training day to build a log for it
    const firstWeek = program.weeks[0];
    const firstTrainingDay = firstWeek.days.find((d) => d.isTrainingDay)!;
    const dayKey = `${firstWeek.weekIndex}-${firstTrainingDay.dayIndex}`;

    // Build exercise logs matching the day's workout blocks
    const exercises: Record<string, { sets: { completed: boolean; weight?: number; reps?: number }[]; notes?: string }> = {};
    for (const block of firstTrainingDay.workout!.blocks) {
      for (let i = 0; i < block.items.length; i++) {
        const key = `${firstWeek.weekIndex}-${firstTrainingDay.dayIndex}-${block.title}-${i}`;
        exercises[key] = {
          sets: [
            { completed: true, weight: 80, reps: 6 },
            { completed: true, weight: 80, reps: 6 },
            { completed: true, weight: 80, reps: 5 },
          ],
          notes: 'Felt strong',
        };
      }
    }

    const logs: Record<string, DayLog> = {
      [dayKey]: { updatedAt: '2026-01-05T10:00:00Z', exercises },
    };

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
      logs,
    );

    // Find a session row that corresponds to the logged day
    const loggedRow = model.sessionRows.find(
      (r) => r.Week === firstWeek.weekIndex && r['Day Label'] === firstTrainingDay.dateLabel && r['Actual Reps'] !== '',
    );
    expect(loggedRow).toBeDefined();
    expect(loggedRow!['Actual Reps']).toBe('6, 6, 5');
    expect(loggedRow!.Weight).toBe('80, 80, 80');
    expect(loggedRow!.Notes).toBe('Felt strong');
  });

  it('leaves Actual Reps/Weight/Notes empty when no logs provided', () => {
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

    for (const row of model.sessionRows) {
      expect(row['Actual Reps']).toBe('');
      expect(row.Weight).toBe('');
      expect(row.Notes).toBe('');
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
