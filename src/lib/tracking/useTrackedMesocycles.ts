import { useCallback, useEffect, useState } from 'react';
import type { ProgramOutput } from '../planner';
import { createMesocycle, deleteMesocycle, loadMesocycles, saveMesocycles, updateDayLog } from './storage';
import type { DayLog, TrackedMesocycle } from './types';

export type UseTrackedMesocyclesReturn = {
  mesocycles: TrackedMesocycle[];
  startTracking: (program: ProgramOutput, name: string) => void;
  stopTracking: (id: string) => void;
  updateLog: (mesocycleId: string, dayKey: string, dayLog: DayLog) => void;
};

export function useTrackedMesocycles(): UseTrackedMesocyclesReturn {
  const [mesocycles, setMesocycles] = useState<TrackedMesocycle[]>([]);

  useEffect(() => {
    setMesocycles(loadMesocycles());
  }, []);

  const persist = useCallback((next: TrackedMesocycle[]) => {
    setMesocycles(next);
    saveMesocycles(next);
  }, []);

  const startTracking = useCallback(
    (program: ProgramOutput, name: string) => {
      persist(createMesocycle(mesocycles, program, name));
    },
    [mesocycles, persist],
  );

  const stopTracking = useCallback(
    (id: string) => {
      persist(deleteMesocycle(mesocycles, id));
    },
    [mesocycles, persist],
  );

  const updateLog = useCallback(
    (mesocycleId: string, dayKey: string, dayLog: DayLog) => {
      persist(updateDayLog(mesocycles, mesocycleId, dayKey, dayLog));
    },
    [mesocycles, persist],
  );

  return { mesocycles, startTracking, stopTracking, updateLog };
}
