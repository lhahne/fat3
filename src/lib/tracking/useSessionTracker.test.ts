import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgramOutput } from '../planner';
import { useSessionTracker } from './useSessionTracker';
import type { DayLog } from './types';

function makeProgram(): ProgramOutput {
  return {
    inputs: {
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'intermediate',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    },
    weeks: [
      {
        weekIndex: 0,
        objective: 'build',
        isDeloadWeek: false,
        targetSessionCount: 3,
        plannedSessionCount: 3,
        days: [
          {
            weekIndex: 0,
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
                  title: 'Main',
                  items: [
                    { slot: 'S1', name: 'Bench Press', prescription: '3x6 @ 2 RIR' },
                    { slot: 'S2', name: 'Barbell Row', prescription: '3x8 @ 2 RIR' },
                  ],
                },
              ],
            },
          },
          ...Array.from({ length: 6 }, (_, i) => ({
            weekIndex: 0,
            dayIndex: i + 1,
            dateLabel: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            sessionType: 'rest' as const,
            effort: 1 as const,
            isTrainingDay: false,
          })),
        ],
        summary: { strengthSessions: 1, enduranceSessions: 0, mixedSessions: 0, restDays: 6, avgEffort: 1.3 },
      },
    ],
  };
}

describe('useSessionTracker', () => {
  const onSave = vi.fn();

  beforeEach(() => {
    onSave.mockClear();
  });

  it('initializes dayLog from prepopulate with warmup + working sets', () => {
    const program = makeProgram();
    const { result } = renderHook(() =>
      useSessionTracker({ program, logs: {}, weekIndex: 0, dayIndex: 0, onSave }),
    );

    expect(result.current.dayLog.exercises['0-0-Main-0']).toBeDefined();
    // 2 warmup + 3 working = 5 total
    expect(result.current.dayLog.exercises['0-0-Main-0'].sets).toHaveLength(5);
    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[0].warmup).toBe(true);
    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[1].warmup).toBe(true);
    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[2].warmup).toBeUndefined();
    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[2].reps).toBe(6);
    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[0].completed).toBe(false);
  });

  it('uses existing log if provided', () => {
    const program = makeProgram();
    const existingLog: DayLog = {
      updatedAt: '2026-01-01T00:00:00Z',
      exercises: {
        '0-0-Main-0': {
          sets: [
            { completed: true, weight: 100, reps: 6 },
            { completed: true, weight: 100, reps: 6 },
            { completed: true, weight: 100, reps: 5 },
          ],
        },
      },
    };
    const { result } = renderHook(() =>
      useSessionTracker({ program, logs: { '0-0': existingLog }, weekIndex: 0, dayIndex: 0, onSave }),
    );

    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[0].weight).toBe(100);
    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[0].completed).toBe(true);
  });

  it('toggleSet flips completed status and calls onSave', () => {
    const program = makeProgram();
    const { result } = renderHook(() =>
      useSessionTracker({ program, logs: {}, weekIndex: 0, dayIndex: 0, onSave }),
    );

    act(() => {
      result.current.toggleSet('0-0-Main-0', 0);
    });

    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[0].completed).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('updateWeight sets weight for a set and calls onSave', () => {
    const program = makeProgram();
    const { result } = renderHook(() =>
      useSessionTracker({ program, logs: {}, weekIndex: 0, dayIndex: 0, onSave }),
    );

    act(() => {
      result.current.updateWeight('0-0-Main-0', 0, 80);
    });

    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[0].weight).toBe(80);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('updateReps sets reps for a set and calls onSave', () => {
    const program = makeProgram();
    const { result } = renderHook(() =>
      useSessionTracker({ program, logs: {}, weekIndex: 0, dayIndex: 0, onSave }),
    );

    act(() => {
      result.current.updateReps('0-0-Main-0', 0, 5);
    });

    expect(result.current.dayLog.exercises['0-0-Main-0'].sets[0].reps).toBe(5);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('updateNotes sets notes for an exercise and calls onSave', () => {
    const program = makeProgram();
    const { result } = renderHook(() =>
      useSessionTracker({ program, logs: {}, weekIndex: 0, dayIndex: 0, onSave }),
    );

    act(() => {
      result.current.updateNotes('0-0-Main-0', 'Felt strong');
    });

    expect(result.current.dayLog.exercises['0-0-Main-0'].notes).toBe('Felt strong');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('isComplete returns true when all sets are completed', () => {
    const program = makeProgram();
    const { result } = renderHook(() =>
      useSessionTracker({ program, logs: {}, weekIndex: 0, dayIndex: 0, onSave }),
    );

    expect(result.current.isComplete).toBe(false);

    // Complete all sets for both exercises (2 warmup + 3 working = 5 each)
    act(() => {
      for (let s = 0; s < 5; s++) {
        result.current.toggleSet('0-0-Main-0', s);
        result.current.toggleSet('0-0-Main-1', s);
      }
    });

    expect(result.current.isComplete).toBe(true);
  });
});
