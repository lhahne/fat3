import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgramOutput } from '../planner';
import {
  createMesocycle,
  deleteMesocycle,
  loadMesocycles,
  saveMesocycles,
  updateDayLog,
} from './storage';
import type { DayLog, TrackedMesocycle } from './types';

describe('tracking/storage', () => {
  const storageState = new Map<string, string>();

  const localStorageMock: Storage = {
    get length() {
      return storageState.size;
    },
    clear() {
      storageState.clear();
    },
    getItem(key: string) {
      return storageState.has(key) ? (storageState.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(storageState.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storageState.delete(key);
    },
    setItem(key: string, value: string) {
      storageState.set(key, value);
    },
  };

  beforeEach(() => {
    storageState.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
  });

  const fakeProgram: ProgramOutput = {
    inputs: {
      focus: 'strength',
      mesocycleWeeks: 6,
      level: 'intermediate',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    },
    weeks: [],
  };

  describe('loadMesocycles', () => {
    it('returns empty array when nothing stored', () => {
      expect(loadMesocycles()).toEqual([]);
    });

    it('returns parsed mesocycles from localStorage', () => {
      const data: TrackedMesocycle[] = [
        { id: '1', name: 'Test', startedAt: '2026-01-01', program: fakeProgram, logs: {} },
      ];
      storageState.set('tracked-mesocycles', JSON.stringify(data));
      expect(loadMesocycles()).toEqual(data);
    });

    it('returns empty array on corrupt JSON', () => {
      storageState.set('tracked-mesocycles', 'not-json');
      expect(loadMesocycles()).toEqual([]);
    });
  });

  describe('saveMesocycles', () => {
    it('persists mesocycles to localStorage', () => {
      const data: TrackedMesocycle[] = [
        { id: '1', name: 'Test', startedAt: '2026-01-01', program: fakeProgram, logs: {} },
      ];
      saveMesocycles(data);
      expect(JSON.parse(storageState.get('tracked-mesocycles')!)).toEqual(data);
    });
  });

  describe('createMesocycle', () => {
    it('adds a new mesocycle with generated id', () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-123' as `${string}-${string}-${string}-${string}-${string}`);
      const result = createMesocycle([], fakeProgram, 'My Meso');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-uuid-123');
      expect(result[0].name).toBe('My Meso');
      expect(result[0].program).toBe(fakeProgram);
      expect(result[0].logs).toEqual({});
      vi.restoreAllMocks();
    });

    it('preserves existing mesocycles', () => {
      const existing: TrackedMesocycle[] = [
        { id: '1', name: 'Old', startedAt: '2026-01-01', program: fakeProgram, logs: {} },
      ];
      const result = createMesocycle(existing, fakeProgram, 'New');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
    });
  });

  describe('deleteMesocycle', () => {
    it('removes mesocycle by id', () => {
      const data: TrackedMesocycle[] = [
        { id: '1', name: 'A', startedAt: '2026-01-01', program: fakeProgram, logs: {} },
        { id: '2', name: 'B', startedAt: '2026-01-02', program: fakeProgram, logs: {} },
      ];
      const result = deleteMesocycle(data, '1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('updateDayLog', () => {
    it('updates a day log for a mesocycle', () => {
      const data: TrackedMesocycle[] = [
        { id: '1', name: 'A', startedAt: '2026-01-01', program: fakeProgram, logs: {} },
      ];
      const dayLog: DayLog = {
        updatedAt: '2026-01-05T10:00:00Z',
        exercises: {
          '0-0-Main-0': {
            sets: [{ completed: true, weight: 80, reps: 6 }],
          },
        },
      };
      const result = updateDayLog(data, '1', '0-0', dayLog);
      expect(result[0].logs['0-0']).toEqual(dayLog);
    });

    it('preserves other mesocycles and logs', () => {
      const existingLog: DayLog = {
        updatedAt: '2026-01-04T10:00:00Z',
        exercises: {},
      };
      const data: TrackedMesocycle[] = [
        { id: '1', name: 'A', startedAt: '2026-01-01', program: fakeProgram, logs: { '0-0': existingLog } },
      ];
      const newLog: DayLog = {
        updatedAt: '2026-01-05T10:00:00Z',
        exercises: {},
      };
      const result = updateDayLog(data, '1', '0-1', newLog);
      expect(result[0].logs['0-0']).toEqual(existingLog);
      expect(result[0].logs['0-1']).toEqual(newLog);
    });
  });
});
