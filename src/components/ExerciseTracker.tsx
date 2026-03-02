import type { ExerciseLog } from '../lib/tracking/types';
import type { WorkoutItem } from '../lib/planner';

/** Warmup percentages for 2 warmup sets: ~50% and ~75% of working weight */
const WARMUP_PERCENTAGES = [0.5, 0.75];

export type ExerciseTrackerProps = {
  exerciseKey: string;
  item: WorkoutItem;
  log: ExerciseLog;
  isWarmup: boolean;
  onToggleSet: (exerciseKey: string, setIndex: number) => void;
  onUpdateWeight: (exerciseKey: string, setIndex: number, weight: number) => void;
  onUpdateReps: (exerciseKey: string, setIndex: number, reps: number) => void;
  onUpdateNotes: (exerciseKey: string, notes: string) => void;
};

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function ExerciseTracker({
  exerciseKey,
  item,
  log,
  isWarmup,
  onToggleSet,
  onUpdateWeight,
  onUpdateReps,
  onUpdateNotes,
}: ExerciseTrackerProps) {
  // Find the first working set's weight to compute warmup percentages
  const firstWorkingSet = log.sets.find((s) => !s.warmup);
  const workingWeight = firstWorkingSet?.weight;

  let warmupIndex = 0;

  return (
    <div className={`exercise-tracker${isWarmup ? ' is-warmup' : ''}`}>
      <div className="exercise-header">
        <span className="exercise-name">{item.name}</span>
        <span className="exercise-prescription">{item.prescription}</span>
        {item.slot && <span className="exercise-slot">{item.slot}</span>}
      </div>

      <div className="sets-grid">
        <div className="sets-header">
          <span>Set</span>
          <span>Weight</span>
          <span>Reps</span>
          <span>Done</span>
        </div>
        {log.sets.map((set, setIndex) => {
          const isWarmupSet = !!set.warmup;
          let warmupHint: string | undefined;
          if (isWarmupSet && workingWeight && warmupIndex < WARMUP_PERCENTAGES.length) {
            const pct = WARMUP_PERCENTAGES[warmupIndex];
            const suggested = roundToNearest(workingWeight * pct, 2.5);
            warmupHint = `~${suggested}`;
          }
          if (isWarmupSet) warmupIndex++;

          return (
            <div
              key={setIndex}
              className={`set-row${set.completed ? ' is-completed' : ''}${isWarmupSet ? ' is-warmup-set' : ''}`}
            >
              <span className="set-number">
                {isWarmupSet ? 'W' : setIndex + 1 - log.sets.filter((s, i) => i < setIndex && s.warmup).length}
              </span>
              <div className="weight-cell">
                <input
                  type="number"
                  className="weight-input"
                  aria-label={`${item.name} set ${setIndex + 1} weight${isWarmupSet ? ' (warmup)' : ''}`}
                  value={set.weight ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') return;
                    onUpdateWeight(exerciseKey, setIndex, Number(val));
                  }}
                  placeholder={warmupHint ?? 'kg'}
                />
              </div>
              <input
                type="number"
                className="reps-input"
                aria-label={`${item.name} set ${setIndex + 1} reps`}
                value={set.reps ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') return;
                  onUpdateReps(exerciseKey, setIndex, Number(val));
                }}
                placeholder="reps"
              />
              <input
                type="checkbox"
                className="set-checkbox"
                aria-label={`${item.name} set ${setIndex + 1} complete`}
                checked={set.completed}
                onChange={() => onToggleSet(exerciseKey, setIndex)}
              />
            </div>
          );
        })}
      </div>

      <div className="exercise-notes">
        <input
          type="text"
          className="notes-input"
          aria-label={`${item.name} notes`}
          value={log.notes ?? ''}
          onChange={(e) => onUpdateNotes(exerciseKey, e.target.value)}
          placeholder="Notes..."
        />
      </div>
    </div>
  );
}
