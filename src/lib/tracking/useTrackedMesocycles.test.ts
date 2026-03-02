import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgramOutput } from '../planner';
import { useTrackedMesocycles } from './useTrackedMesocycles';

describe('useTrackedMesocycles', () => {
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

  beforeEach(() => {
    storageState.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      'test-uuid' as `${string}-${string}-${string}-${string}-${string}`,
    );
  });

  it('loads empty mesocycles initially', () => {
    const { result } = renderHook(() => useTrackedMesocycles());
    expect(result.current.mesocycles).toEqual([]);
  });

  it('loads existing mesocycles from localStorage', () => {
    storageState.set(
      'tracked-mesocycles',
      JSON.stringify([{ id: '1', name: 'Test', startedAt: '2026-01-01', program: fakeProgram, logs: {} }]),
    );
    const { result } = renderHook(() => useTrackedMesocycles());
    expect(result.current.mesocycles).toHaveLength(1);
  });

  it('startTracking adds a mesocycle and persists', () => {
    const { result } = renderHook(() => useTrackedMesocycles());

    act(() => {
      result.current.startTracking(fakeProgram, 'My Meso');
    });

    expect(result.current.mesocycles).toHaveLength(1);
    expect(result.current.mesocycles[0].name).toBe('My Meso');
    expect(JSON.parse(storageState.get('tracked-mesocycles')!)).toHaveLength(1);
  });

  it('stopTracking removes a mesocycle and persists', () => {
    const { result } = renderHook(() => useTrackedMesocycles());

    act(() => {
      result.current.startTracking(fakeProgram, 'Meso');
    });

    const id = result.current.mesocycles[0].id;

    act(() => {
      result.current.stopTracking(id);
    });

    expect(result.current.mesocycles).toHaveLength(0);
    expect(JSON.parse(storageState.get('tracked-mesocycles')!)).toHaveLength(0);
  });

  it('updateLog updates a day log and persists', () => {
    const { result } = renderHook(() => useTrackedMesocycles());

    act(() => {
      result.current.startTracking(fakeProgram, 'Meso');
    });

    const id = result.current.mesocycles[0].id;

    act(() => {
      result.current.updateLog(id, '0-0', {
        updatedAt: '2026-01-05T10:00:00Z',
        exercises: {
          '0-0-Main-0': { sets: [{ completed: true, weight: 80, reps: 6 }] },
        },
      });
    });

    expect(result.current.mesocycles[0].logs['0-0']).toBeDefined();
    const persisted = JSON.parse(storageState.get('tracked-mesocycles')!);
    expect(persisted[0].logs['0-0']).toBeDefined();
  });
});
