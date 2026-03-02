import type { ProgramOutput } from '../lib/planner';
import type { DayLog } from '../lib/tracking/types';
import { useSessionTracker } from '../lib/tracking/useSessionTracker';
import { exerciseKey } from '../lib/tracking/prepopulate';
import { ExerciseTracker } from './ExerciseTracker';

export type SessionTrackerProps = {
  program: ProgramOutput;
  logs: Record<string, DayLog>;
  weekIndex: number;
  dayIndex: number;
  onSave: (dayLog: DayLog) => void;
};

export function SessionTracker({ program, logs, weekIndex, dayIndex, onSave }: SessionTrackerProps) {
  const { dayLog, toggleSet, updateWeight, updateReps, updateNotes, isComplete } =
    useSessionTracker({ program, logs, weekIndex, dayIndex, onSave });

  const day = program.weeks.find((w) => w.weekIndex === weekIndex)?.days.find((d) => d.dayIndex === dayIndex);
  if (!day?.workout) return null;

  return (
    <div className="session-tracker">
      <div className="session-header">
        <h3>
          Week {weekIndex} — {day.dateLabel}
        </h3>
        <p className="session-title">{day.workout.title}</p>
        {isComplete && <span className="session-complete-badge">Complete</span>}
      </div>

      {day.workout.blocks.map((block) => {
        const isWarmup = block.title === 'Warm-up';
        return (
          <section key={block.title} className={`tracking-block${isWarmup ? ' is-warmup' : ''}`}>
            <h4 className="block-title">{block.title}</h4>
            {block.items.map((item, itemIndex) => {
              const key = exerciseKey(weekIndex, dayIndex, block.title, itemIndex);
              const log = dayLog.exercises[key] ?? { sets: [] };
              return (
                <ExerciseTracker
                  key={key}
                  exerciseKey={key}
                  item={item}
                  log={log}
                  isWarmup={isWarmup}
                  onToggleSet={toggleSet}
                  onUpdateWeight={updateWeight}
                  onUpdateReps={updateReps}
                  onUpdateNotes={updateNotes}
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
