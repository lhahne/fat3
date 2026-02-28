import { useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme-preference';

function resolveSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';

  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedValue === 'light' || storedValue === 'dark') return storedValue;
  return 'system';
}

export function useTheme(): [ThemeMode, (mode: ThemeMode) => void] {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredThemeMode);

  useEffect(() => {
    const activeTheme = themeMode === 'system' ? resolveSystemTheme() : themeMode;
    document.documentElement.dataset.theme = activeTheme;

    if (themeMode === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== 'system' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = (event?: MediaQueryListEvent) => {
      const prefersDark = event ? event.matches : mediaQuery.matches;
      document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }

    mediaQuery.addListener(updateTheme);
    return () => mediaQuery.removeListener(updateTheme);
  }, [themeMode]);

  return [themeMode, setThemeMode];
}
