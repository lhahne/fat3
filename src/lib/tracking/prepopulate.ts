import type { ProgramOutput } from '../planner';
import { parsePrescription } from './prescription';
import type { DayLog, ExerciseLog, SetLog } from './types';

function exerciseKey(weekIndex: number, dayIndex: number, blockTitle: string, itemIndex: number): string {
  return `${weekIndex}-${dayIndex}-${blockTitle}-${itemIndex}`;
}

/**
 * Build a prepopulated DayLog for a given day, using:
 * - Current week's prescribed reps for each set
 * - Previous week's logged weights (if available)
 */
export function prepopulateFromHistory(
  program: ProgramOutput,
  logs: Record<string, DayLog>,
  currentWeekIndex: number,
  currentDayIndex: number,
): DayLog {
  const currentWeek = program.weeks.find((w) => w.weekIndex === currentWeekIndex);
  const currentDay = currentWeek?.days.find((d) => d.dayIndex === currentDayIndex);

  if (!currentDay?.workout) {
    return { updatedAt: '', exercises: {} };
  }

  // Find previous week's log for the same day position
  const prevWeekIndex = currentWeekIndex - 1;
  const prevDayKey = `${prevWeekIndex}-${currentDayIndex}`;
  const prevDayLog = prevWeekIndex >= 0 ? logs[prevDayKey] : undefined;

  const exercises: Record<string, ExerciseLog> = {};

  for (const block of currentDay.workout.blocks) {
    for (let itemIndex = 0; itemIndex < block.items.length; itemIndex++) {
      const item = block.items[itemIndex];
      const key = exerciseKey(currentWeekIndex, currentDayIndex, block.title, itemIndex);
      const prevKey = exerciseKey(prevWeekIndex, currentDayIndex, block.title, itemIndex);
      const prevExercise = prevDayLog?.exercises[prevKey];

      const parsed = parsePrescription(item.prescription, item.warmupPrescription);
      const sets: SetLog[] = [];

      // Prepend warmup sets for strength exercises
      for (let wi = 0; wi < parsed.warmupSets; wi++) {
        const prevSet = prevExercise?.sets[wi];
        const set: SetLog = { completed: false, warmup: true };
        if (prevSet?.weight != null) {
          set.weight = prevSet.weight;
        }
        const warmupRepTarget = parsed.warmupReps?.[wi];
        if (warmupRepTarget != null) {
          set.reps = warmupRepTarget;
        } else if (parsed.reps != null) {
          set.reps = parsed.reps;
        }
        sets.push(set);
      }

      // Working sets
      for (let setIndex = 0; setIndex < parsed.sets; setIndex++) {
        const prevSet = prevExercise?.sets[parsed.warmupSets + setIndex];
        const set: SetLog = { completed: false };

        // Carry forward weight from previous week
        if (prevSet?.weight != null) {
          set.weight = prevSet.weight;
        }

        // Use current week's prescribed reps (not previous actual)
        if (parsed.reps != null) {
          set.reps = parsed.reps;
        }

        sets.push(set);
      }

      exercises[key] = { sets };
    }
  }

  return { updatedAt: '', exercises };
}

export { exerciseKey };
