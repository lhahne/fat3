import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  const storageState = new Map<string, string>();
  const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>();
  let systemPrefersDark = false;

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
    mediaQueryListeners.clear();
    systemPrefersDark = false;
    document.documentElement.removeAttribute('data-theme');

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? systemPrefersDark : false,
      media: query,
      addEventListener: (_type: string, listener: (ev: MediaQueryListEvent) => void) => {
        mediaQueryListeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (ev: MediaQueryListEvent) => void) => {
        mediaQueryListeners.delete(listener);
      },
      addListener: (listener: (ev: MediaQueryListEvent) => void) => {
        mediaQueryListeners.add(listener);
      },
      removeListener: (listener: (ev: MediaQueryListEvent) => void) => {
        mediaQueryListeners.delete(listener);
      },
      dispatchEvent: () => true,
    }));
  });

  it('defaults to system mode when nothing is stored', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('system');
  });

  it('reads dark preference from localStorage', () => {
    storageState.set('theme-preference', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('dark');
  });

  it('reads light preference from localStorage', () => {
    storageState.set('theme-preference', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('light');
  });

  it('applies dark data-theme in system mode when system prefers dark', () => {
    systemPrefersDark = true;
    renderHook(() => useTheme());
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('applies light data-theme in system mode when system prefers light', () => {
    renderHook(() => useTheme());
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('sets data-theme to dark and persists to localStorage when dark is selected', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current[1]('dark');
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(storageState.get('theme-preference')).toBe('dark');
  });

  it('sets data-theme to light and persists to localStorage when light is selected', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current[1]('light');
    });
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(storageState.get('theme-preference')).toBe('light');
  });

  it('removes stored preference when switching back to system mode', () => {
    storageState.set('theme-preference', 'dark');
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current[1]('system');
    });
    expect(storageState.has('theme-preference')).toBe(false);
  });

  it('updates data-theme when system preference changes while in system mode', () => {
    renderHook(() => useTheme());
    expect(document.documentElement.dataset.theme).toBe('light');

    act(() => {
      const event = { matches: true } as MediaQueryListEvent;
      mediaQueryListeners.forEach((listener) => listener(event));
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('stops reacting to system preference changes after manual theme is set', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current[1]('light');
    });

    act(() => {
      const event = { matches: true } as MediaQueryListEvent;
      mediaQueryListeners.forEach((listener) => listener(event));
    });

    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('correctly applies stored dark theme without following system preference', () => {
    storageState.set('theme-preference', 'dark');
    systemPrefersDark = false;
    renderHook(() => useTheme());
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
