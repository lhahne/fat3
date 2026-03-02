import type { ProgramOutput } from '../planner';
import type { DayLog, TrackedMesocycle } from './types';

const STORAGE_KEY = 'tracked-mesocycles';

export function loadMesocycles(): TrackedMesocycle[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrackedMesocycle[];
  } catch {
    return [];
  }
}

export function saveMesocycles(mesocycles: TrackedMesocycle[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mesocycles));
}

export function createMesocycle(
  existing: TrackedMesocycle[],
  program: ProgramOutput,
  name: string,
): TrackedMesocycle[] {
  const newMeso: TrackedMesocycle = {
    id: crypto.randomUUID(),
    name,
    startedAt: new Date().toISOString(),
    program,
    logs: {},
  };
  return [...existing, newMeso];
}

export function deleteMesocycle(mesocycles: TrackedMesocycle[], id: string): TrackedMesocycle[] {
  return mesocycles.filter((m) => m.id !== id);
}

export function updateDayLog(
  mesocycles: TrackedMesocycle[],
  mesocycleId: string,
  dayKey: string,
  dayLog: DayLog,
): TrackedMesocycle[] {
  return mesocycles.map((m) => {
    if (m.id !== mesocycleId) return m;
    return { ...m, logs: { ...m.logs, [dayKey]: dayLog } };
  });
}
