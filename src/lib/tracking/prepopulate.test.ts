import { describe, expect, it } from 'vitest';
import type { ProgramOutput } from '../planner';
import { prepopulateFromHistory } from './prepopulate';
import type { DayLog } from './types';

function makeProgram(weeks: number): ProgramOutput {
  return {
    inputs: {
      focus: 'strength',
      mesocycleWeeks: weeks,
      level: 'intermediate',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    },
    weeks: Array.from({ length: weeks }, (_, weekIndex) => ({
      weekIndex,
      objective: 'build' as const,
      isDeloadWeek: false,
      targetSessionCount: 3,
      plannedSessionCount: 3,
      days: [
        {
          weekIndex,
          dayIndex: 0,
          dateLabel: 'Mon',
          sessionType: 'strength' as const,
          effort: 3 as const,
          isTrainingDay: true,
          workout: {
            kind: 'strength' as const,
            type: 'upper',
            title: 'Upper Body A',
            objective: 'build' as const,
            dayType: 'A' as const,
            blocks: [
              {
                title: 'Warm-up',
                items: [
                  { name: 'General warm-up + ramp sets', prescription: '8-10 min dynamic + 2 ramp sets' },
                ],
              },
              {
                title: 'Main',
                items: [
                  { slot: 'S1', name: 'Bench Press', prescription: `${3 + weekIndex}x6 @ 2 RIR` },
                  { slot: 'S2', name: 'Barbell Row', prescription: `${3 + weekIndex}x8 @ 2 RIR` },
                ],
              },
            ],
          },
        },
        // Rest days fill out the week
        ...Array.from({ length: 6 }, (_, i) => ({
          weekIndex,
          dayIndex: i + 1,
          dateLabel: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          sessionType: 'rest' as const,
          effort: 1 as const,
          isTrainingDay: false,
        })),
      ],
      summary: { strengthSessions: 1, enduranceSessions: 0, mixedSessions: 0, restDays: 6, avgEffort: 1.3 },
    })),
  };
}

describe('prepopulateFromHistory', () => {
  it('prepends warmup sets for strength exercises', () => {
    const program = makeProgram(4);
    const logs: Record<string, DayLog> = {};

    const result = prepopulateFromHistory(program, logs, 0, 0);

    const s1Key = '0-0-Main-0';
    // 2 warmup + 3 working = 5 total sets
    expect(result.exercises[s1Key].sets).toHaveLength(5);
    expect(result.exercises[s1Key].sets[0].warmup).toBe(true);
    expect(result.exercises[s1Key].sets[1].warmup).toBe(true);
    expect(result.exercises[s1Key].sets[2].warmup).toBeUndefined();
    expect(result.exercises[s1Key].sets[0].reps).toBe(6);
  });

  it('does not add warmup sets for general warm-up block items', () => {
    const program = makeProgram(4);
    const result = prepopulateFromHistory(program, {}, 0, 0);

    const warmupKey = '0-0-Warm-up-0';
    expect(result.exercises[warmupKey].sets).toHaveLength(2); // 2 ramp sets, no extra warmup
    expect(result.exercises[warmupKey].sets[0].warmup).toBeUndefined();
  });

  it('prepopulates weight from previous week logs (with warmup offset)', () => {
    const program = makeProgram(4);
    // Week 0: 3x6 → 2 warmup + 3 working = 5 sets total
    const logs: Record<string, DayLog> = {
      '0-0': {
        updatedAt: '2026-01-01T00:00:00Z',
        exercises: {
          '0-0-Main-0': {
            sets: [
              { completed: true, weight: 40, reps: 6, warmup: true },
              { completed: true, weight: 60, reps: 6, warmup: true },
              { completed: true, weight: 80, reps: 6 },
              { completed: true, weight: 80, reps: 6 },
              { completed: true, weight: 80, reps: 5 },
            ],
          },
          '0-0-Warm-up-0': {
            sets: [
              { completed: true, weight: 40 },
              { completed: true, weight: 60 },
            ],
          },
        },
      },
    };

    const result = prepopulateFromHistory(program, logs, 1, 0);

    // Week 1: 4x6 → 2 warmup + 4 working = 6 total
    const s1Key = '1-0-Main-0';
    expect(result.exercises[s1Key].sets).toHaveLength(6);
    // Warmup sets carry forward
    expect(result.exercises[s1Key].sets[0].warmup).toBe(true);
    expect(result.exercises[s1Key].sets[0].weight).toBe(40);
    expect(result.exercises[s1Key].sets[1].warmup).toBe(true);
    expect(result.exercises[s1Key].sets[1].weight).toBe(60);
    // Working sets carry forward
    expect(result.exercises[s1Key].sets[2].weight).toBe(80);
    expect(result.exercises[s1Key].sets[3].weight).toBe(80);
    expect(result.exercises[s1Key].sets[4].weight).toBe(80);
    // 6th set (new) has no previous data
    expect(result.exercises[s1Key].sets[5].weight).toBeUndefined();

    // General warmup ramp sets carry forward too
    const warmupKey = '1-0-Warm-up-0';
    expect(result.exercises[warmupKey].sets[0].weight).toBe(40);
    expect(result.exercises[warmupKey].sets[1].weight).toBe(60);
  });

  it('uses current week prescribed reps, not last week actual reps', () => {
    const program = makeProgram(4);
    const logs: Record<string, DayLog> = {
      '0-0': {
        updatedAt: '2026-01-01T00:00:00Z',
        exercises: {
          '0-0-Main-0': {
            sets: [
              { completed: true, weight: 30, reps: 5, warmup: true },
              { completed: true, weight: 50, reps: 5, warmup: true },
              { completed: true, weight: 80, reps: 5 },
              { completed: true, weight: 80, reps: 5 },
              { completed: true, weight: 80, reps: 4 },
            ],
          },
        },
      },
    };

    const result = prepopulateFromHistory(program, logs, 1, 0);
    const s1Key = '1-0-Main-0';
    // Reps should be from current prescription (6), not last week's actual (5)
    expect(result.exercises[s1Key].sets[2].reps).toBe(6); // first working set
  });

  it('handles day with no workout gracefully', () => {
    const program = makeProgram(2);
    // dayIndex 1 is a rest day — no workout
    const result = prepopulateFromHistory(program, {}, 0, 1);
    expect(result.exercises).toEqual({});
  });

  it('uses exercise-specific warmup prescriptions when computing warmup set counts', () => {
    const program = makeProgram(2);
    const workout = program.weeks[0].days[0].workout;
    if (!workout) throw new Error('expected workout');

    workout.blocks[1].items[0].warmupPrescription = '40%x8, 60%x5, 75%x3';
    workout.blocks[1].items[1].warmupPrescription = '1 preparatory set @ ~50% x12';

    const result = prepopulateFromHistory(program, {}, 0, 0);

    const s1 = result.exercises['0-0-Main-0'].sets;
    const s2 = result.exercises['0-0-Main-1'].sets;

    // S1 prescription is 3x6, plus 3 warmup sets
    expect(s1).toHaveLength(6);
    expect(s1[0].warmup).toBe(true);
    expect(s1[1].warmup).toBe(true);
    expect(s1[2].warmup).toBe(true);
    expect(s1[0].reps).toBe(8);
    expect(s1[1].reps).toBe(5);
    expect(s1[2].reps).toBe(3);
    expect(s1[3].warmup).toBeUndefined();

    // S2 prescription is 3x8, plus 1 warmup set
    expect(s2).toHaveLength(4);
    expect(s2[0].warmup).toBe(true);
    expect(s2[0].reps).toBe(12);
    expect(s2[1].warmup).toBeUndefined();
  });
});
