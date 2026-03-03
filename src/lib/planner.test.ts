import { describe, expect, it } from 'vitest';
import {
  generateProgram,
  getDeloadWeeks,
  getRecommendedDefaults,
  normalizeInputs,
  type PlannerInputs,
} from './planner';

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
      strengthProfile: 'balanced',
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
      strengthProfile: 'balanced',
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
      strengthProfile: 'balanced',
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
      strengthProfile: 'balanced',
    });

    const firstWeek = program.weeks[0];
    const enduranceCount = firstWeek.days.filter((d) => d.sessionType === 'endurance').length;
    const strengthCount = firstWeek.days.filter((d) => d.sessionType === 'strength').length;

    expect(enduranceCount).toBeGreaterThan(strengthCount);
  });

  it('generates strength sessions with selected profile and RIR prescription', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'intermediate',
      sessionsPerWeek: 3,
      strengthProfile: 'endurance-support',
    });

    const weekOneStrengthDay = program.weeks[0].days.find((day) => day.sessionType === 'strength');
    expect(weekOneStrengthDay?.workout?.strengthProfile).toBe('endurance-support');
    expect(weekOneStrengthDay?.workout?.title).toContain('Build');

    const mainItem = weekOneStrengthDay?.workout?.blocks[1].items[0];
    expect(mainItem?.prescription).toContain('RIR');
    expect(mainItem?.name).toBe('Bulgarian Split Squat');
  });

  it('uses zone for easy endurance and rpe for interval workouts', () => {
    const program = generateProgram({
      focus: 'endurance',
      mesocycleWeeks: 8,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'balanced',
    });

    const buildWeek = program.weeks[0];
    const easyDay = buildWeek.days.find((day) => day.workout?.targetMode === 'zone');
    expect(easyDay?.workout?.targetMode).toBe('zone');
    expect(easyDay?.workout?.title).toBe('Aerobic Base');

    const pushWeek = program.weeks[2];
    const hardDay = pushWeek.days.find((day) => day.workout?.type === 'interval');
    expect(hardDay?.workout?.targetMode).toBe('rpe');
    expect(hardDay?.workout?.title).toBe('Interval Power');
  });

  it('applies cardio collision adjustment to lower strength work in mixed plans', () => {
    const program = generateProgram({
      focus: 'mixed',
      mixedBias: 50,
      mesocycleWeeks: 8,
      level: 'intermediate',
      sessionsPerWeek: 4,
      strengthProfile: 'endurance-support',
    });

    const pushWeek = program.weeks[2];
    const adjustedStrengthDay = pushWeek.days.find((day) =>
      day.workout?.blocks.some((block) => block.items.some((item) => item.flags?.includes('cardio-collision-adjusted'))),
    );

    expect(adjustedStrengthDay).toBeDefined();
  });

  it('adds exercise-specific warmup patterns for generated strength exercises', () => {
    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    });

    const strengthDay = program.weeks[0].days.find((day) => day.sessionType === 'strength');
    const mainItems = strengthDay?.workout?.blocks.find((block) => block.title === 'Main work')?.items ?? [];
    const accessoryItems = strengthDay?.workout?.blocks.find((block) => block.title === 'Accessory work')?.items ?? [];
    const trunkItems = strengthDay?.workout?.blocks.find((block) => block.title === 'Trunk / power')?.items ?? [];

    expect(mainItems[0]?.name).toBe('Back Squat');
    expect(mainItems[0]?.warmupPrescription).toBe('40%x8, 60%x5, 75%x3');
    expect(mainItems[1]?.name).toBe('Bench Press');
    expect(mainItems[1]?.warmupPrescription).toBe('35%x10, 55%x6, 70%x4');
    expect(mainItems[2]?.name).toBe('Pull-up');
    expect(mainItems[2]?.warmupPrescription).toBe('50%x8, 70%x4');

    expect(accessoryItems[1]?.name).toBe('Face Pull');
    expect(accessoryItems[1]?.warmupPrescription).toBe('1 preparatory set @ ~50% x12');

    expect(trunkItems[0]?.name).toBe('Pallof Press');
    expect(trunkItems[0]?.warmupPrescription).toBe('No additional ramp sets');
  });

  it('keeps endurance sessions without exercise-specific warmup prescriptions', () => {
    const program = generateProgram({
      focus: 'endurance',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    });

    const enduranceDay = program.weeks[0].days.find((day) => day.sessionType === 'endurance');
    expect(enduranceDay?.workout?.kind).toBe('endurance');

    const hasWarmupPrescription = enduranceDay?.workout?.blocks.some((block) =>
      block.items.some((item) => item.warmupPrescription != null),
    );
    expect(hasWarmupPrescription).toBe(false);
  });
});

describe('getDeloadWeeks', () => {
  it('returns only the final week for 4-week programs', () => {
    expect(getDeloadWeeks(4)).toEqual([4]);
  });

  it('returns only the final week for 6-week programs', () => {
    expect(getDeloadWeeks(6)).toEqual([6]);
  });

  it('returns two deload weeks for 7-week programs', () => {
    const deloads = getDeloadWeeks(7);
    expect(deloads.length).toBe(2);
    expect(deloads).toContain(7);
  });

  it('returns two deload weeks for 9-week programs', () => {
    const deloads = getDeloadWeeks(9);
    expect(deloads.length).toBe(2);
    expect(deloads).toContain(9);
  });

  it('returns deloads at weeks 4, 8, and final for 10-week programs', () => {
    const deloads = getDeloadWeeks(10);
    expect(deloads).toContain(4);
    expect(deloads).toContain(8);
    expect(deloads).toContain(10);
  });

  it('returns deloads at weeks 4, 8, and 12 for 12-week programs', () => {
    expect(getDeloadWeeks(12)).toEqual(expect.arrayContaining([4, 8, 12]));
    expect(getDeloadWeeks(12).length).toBe(3);
  });

  it('does not return weeks beyond the program length', () => {
    for (const weekCount of [4, 6, 8, 10, 12]) {
      for (const deloadWeek of getDeloadWeeks(weekCount)) {
        expect(deloadWeek).toBeLessThanOrEqual(weekCount);
      }
    }
  });
});
