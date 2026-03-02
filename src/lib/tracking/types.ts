import type { ProgramOutput } from '../planner';

export type AppView = 'planner' | { tracking: string }; // string = mesocycle id

export type SetLog = {
  completed: boolean;
  weight?: number;
  reps?: number;
  /** True for warmup sets prepended before working sets */
  warmup?: boolean;
};

export type ExerciseLog = {
  sets: SetLog[];
  notes?: string;
};

export type DayLog = {
  /** ISO timestamp when the log was last updated */
  updatedAt: string;
  /** Keyed by exercise key: "${weekIndex}-${dayIndex}-${blockTitle}-${itemIndex}" */
  exercises: Record<string, ExerciseLog>;
};

export type TrackedMesocycle = {
  id: string;
  name: string;
  startedAt: string;
  program: ProgramOutput;
  logs: Record<string, DayLog>; // keyed by "${weekIndex}-${dayIndex}"
};
