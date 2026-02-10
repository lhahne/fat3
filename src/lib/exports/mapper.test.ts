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
      autoDeload: true,
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
    expect(model.calendarRows).toHaveLength(2);
    expect(model.progressionRows).toHaveLength(2);
    expect(model.workoutRows.length).toBeGreaterThan(0);
    expect(model.workoutRows[0]).toHaveProperty('Session Title');
    expect(model.overview.some((row) => row.key === 'Generated At' && row.value === nowIso)).toBe(true);
    expect(model.overview.some((row) => row.key === 'Exported At' && row.value === nowIso)).toBe(true);
  });
});
