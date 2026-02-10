import { describe, expect, it } from 'vitest';
import { generateProgram, getRecommendedDefaults, normalizeInputs, type PlannerInputs } from './planner';

describe('planner defaults', () => {
  it('recommends advanced mixed defaults', () => {
    expect(getRecommendedDefaults('advanced', 'mixed')).toEqual({
      mesocycleWeeks: 8,
      sessionsPerWeek: 4,
      mixedBias: 50,
    });
  });
});

describe('normalizeInputs', () => {
  it('clamps out of range values', () => {
    const normalized = normalizeInputs({
      focus: 'mixed',
      mixedBias: 200,
      mesocycleWeeks: 13,
      level: 'beginner',
      sessionsPerWeek: 1,
      autoDeload: true,
    });

    expect(normalized.mesocycleWeeks).toBe(12);
    expect(normalized.sessionsPerWeek).toBe(2);
    expect(normalized.mixedBias).toBe(100);
  });
});

describe('generateProgram', () => {
  it('creates weeks top-to-bottom with seven day boxes each', () => {
    const inputs: PlannerInputs = {
      focus: 'strength',
      mesocycleWeeks: 6,
      level: 'beginner',
      sessionsPerWeek: 3,
      autoDeload: true,
    };

    const program = generateProgram(inputs);

    expect(program.weeks).toHaveLength(6);
    expect(program.weeks[0]?.weekIndex).toBe(1);
    expect(program.weeks[5]?.weekIndex).toBe(6);
    for (const week of program.weeks) {
      expect(week.days).toHaveLength(7);
    }
  });

  it('marks deloads and final taper based on length', () => {
    const program = generateProgram({
      focus: 'endurance',
      mesocycleWeeks: 8,
      level: 'intermediate',
      sessionsPerWeek: 4,
      autoDeload: true,
    });

    expect(program.weeks[3]?.isDeloadWeek).toBe(true);
    expect(program.weeks[7]?.objective).toBe('taper');
    expect(program.weeks[7]?.isDeloadWeek).toBe(true);
  });

  it('splits mixed sessions by bias', () => {
    const program = generateProgram({
      focus: 'mixed',
      mixedBias: 75,
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 4,
      autoDeload: true,
    });

    const firstWeek = program.weeks[0];
    const enduranceCount = firstWeek.days.filter((d) => d.sessionType === 'endurance').length;
    const strengthCount = firstWeek.days.filter((d) => d.sessionType === 'strength').length;

    expect(enduranceCount).toBeGreaterThan(strengthCount);
  });
});
