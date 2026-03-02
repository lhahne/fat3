import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

// Mock service to prevent actual exports
const { excelMock, pdfMock } = vi.hoisted(() => ({
  excelMock: vi.fn().mockResolvedValue(undefined),
  pdfMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/exports/service', () => ({
  exportProgramAsExcel: excelMock,
  exportProgramAsPdf: pdfMock,
}));

describe('AppShell', () => {
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
    document.documentElement.removeAttribute('data-theme');
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: () => true,
    }));
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      'test-uuid' as `${string}-${string}-${string}-${string}-${string}`,
    );
  });

  it('does not render tab bar when no mesocycles are tracked', () => {
    render(<AppShell />);
    expect(screen.queryByRole('tab', { name: 'Planner' })).not.toBeInTheDocument();
  });

  it('renders MesocyclePlanner by default', () => {
    render(<AppShell />);
    expect(screen.getByText('Mesocycle Planner')).toBeInTheDocument();
  });

  it('shows Start Tracking button in planner view', () => {
    render(<AppShell />);
    expect(screen.getByRole('button', { name: 'Start Tracking' })).toBeInTheDocument();
  });

  it('creates a tracked mesocycle and switches to tracking view when Start Tracking is clicked', () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Tracking' }));

    // Should now have a mesocycle tab
    expect(screen.getByRole('tab', { name: /Mesocycle/ })).toBeInTheDocument();
    // Should switch to tracking view
    expect(screen.getAllByText(/Week 1/).length).toBeGreaterThan(0);
  });
});
