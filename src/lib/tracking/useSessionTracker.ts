import { useCallback, useMemo, useState } from 'react';
import type { ProgramOutput } from '../planner';
import { prepopulateFromHistory } from './prepopulate';
import type { DayLog } from './types';

export type UseSessionTrackerProps = {
  program: ProgramOutput;
  logs: Record<string, DayLog>;
  weekIndex: number;
  dayIndex: number;
  onSave: (dayLog: DayLog) => void;
};

export type UseSessionTrackerReturn = {
  dayLog: DayLog;
  toggleSet: (exerciseKey: string, setIndex: number) => void;
  updateWeight: (exerciseKey: string, setIndex: number, weight: number) => void;
  updateReps: (exerciseKey: string, setIndex: number, reps: number) => void;
  updateNotes: (exerciseKey: string, notes: string) => void;
  isComplete: boolean;
};

function initDayLog(
  program: ProgramOutput,
  logs: Record<string, DayLog>,
  weekIndex: number,
  dayIndex: number,
): DayLog {
  const dayKey = `${weekIndex}-${dayIndex}`;
  const existing = logs[dayKey];
  if (existing) return existing;
  return prepopulateFromHistory(program, logs, weekIndex, dayIndex);
}

export function useSessionTracker({
  program,
  logs,
  weekIndex,
  dayIndex,
  onSave,
}: UseSessionTrackerProps): UseSessionTrackerReturn {
  const [dayLog, setDayLog] = useState<DayLog>(() =>
    initDayLog(program, logs, weekIndex, dayIndex),
  );

  const update = useCallback(
    (updater: (prev: DayLog) => DayLog) => {
      setDayLog((prev) => {
        const next = updater(prev);
        next.updatedAt = new Date().toISOString();
        onSave(next);
        return next;
      });
    },
    [onSave],
  );

  const toggleSet = useCallback(
    (exerciseKey: string, setIndex: number) => {
      update((prev) => {
        const exercise = prev.exercises[exerciseKey];
        if (!exercise) return prev;
        const sets = exercise.sets.map((s, i) =>
          i === setIndex ? { ...s, completed: !s.completed } : s,
        );
        return {
          ...prev,
          exercises: { ...prev.exercises, [exerciseKey]: { ...exercise, sets } },
        };
      });
    },
    [update],
  );

  const updateWeight = useCallback(
    (exerciseKey: string, setIndex: number, weight: number) => {
      update((prev) => {
        const exercise = prev.exercises[exerciseKey];
        if (!exercise) return prev;
        const sets = exercise.sets.map((s, i) =>
          i === setIndex ? { ...s, weight } : s,
        );
        return {
          ...prev,
          exercises: { ...prev.exercises, [exerciseKey]: { ...exercise, sets } },
        };
      });
    },
    [update],
  );

  const updateReps = useCallback(
    (exerciseKey: string, setIndex: number, reps: number) => {
      update((prev) => {
        const exercise = prev.exercises[exerciseKey];
        if (!exercise) return prev;
        const sets = exercise.sets.map((s, i) =>
          i === setIndex ? { ...s, reps } : s,
        );
        return {
          ...prev,
          exercises: { ...prev.exercises, [exerciseKey]: { ...exercise, sets } },
        };
      });
    },
    [update],
  );

  const updateNotes = useCallback(
    (exerciseKey: string, notes: string) => {
      update((prev) => {
        const exercise = prev.exercises[exerciseKey];
        if (!exercise) return prev;
        return {
          ...prev,
          exercises: { ...prev.exercises, [exerciseKey]: { ...exercise, notes } },
        };
      });
    },
    [update],
  );

  const isComplete = useMemo(() => {
    const exercises = Object.values(dayLog.exercises);
    if (exercises.length === 0) return false;
    return exercises.every((ex) => ex.sets.every((s) => s.completed));
  }, [dayLog]);

  return { dayLog, toggleSet, updateWeight, updateReps, updateNotes, isComplete };
}
