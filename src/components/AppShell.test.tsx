import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateProgram } from '../lib/planner';
import type { TrackedMesocycle } from '../lib/tracking/types';
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

  describe('routing', () => {
    const seedProgram = generateProgram({
      level: 'beginner',
      focus: 'strength',
      strengthProfile: 'balanced',
      mesocycleWeeks: 4,
      sessionsPerWeek: 3,
    });

    function seedMesocycle(): TrackedMesocycle {
      const m: TrackedMesocycle = {
        id: 'test-uuid',
        name: 'Mesocycle 1',
        startedAt: new Date().toISOString(),
        program: seedProgram,
        logs: {},
      };
      storageState.set('tracked-mesocycles', JSON.stringify([m]));
      return m;
    }

    beforeEach(() => {
      window.history.replaceState(null, '', '/');
    });

    it('syncs view from URL on mount when on a tracking path', async () => {
      seedMesocycle();
      window.history.replaceState(null, '', '/tracking/test-uuid');

      render(<AppShell />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Mesocycle 1/ })).toHaveAttribute(
          'aria-selected',
          'true',
        );
      });
    });

    it('updates URL when view changes via tab click', async () => {
      seedMesocycle();

      render(<AppShell />);

      // Click on the mesocycle tab
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Mesocycle 1/ })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /Mesocycle 1/ }));

      await waitFor(() => {
        expect(window.location.pathname).toBe('/tracking/test-uuid');
      });
    });

    it('navigating to a day URL shows day view', async () => {
      seedMesocycle();
      // Use day URL with a valid training day index from the seed program
      const dayIndex = seedProgram.weeks[0].days.find((d) => d.isTrainingDay)!.dayIndex;
      window.history.replaceState(null, '', `/tracking/test-uuid/day/${dayIndex}`);

      render(<AppShell />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Back to days/ })).toBeInTheDocument();
      });
    });

    it('clicking a day updates URL to day path', async () => {
      seedMesocycle();
      window.history.replaceState(null, '', '/tracking/test-uuid');

      render(<AppShell />);

      await waitFor(() => {
        expect(document.querySelector('.day-select-button')).toBeInTheDocument();
      });

      const dayButton = document.querySelector('.day-select-button') as HTMLElement;
      fireEvent.click(dayButton);

      await waitFor(() => {
        expect(window.location.pathname).toMatch(/\/tracking\/test-uuid\/day\/\d+/);
      });
    });

    it('browser back from day view returns to week view, not planner', async () => {
      seedMesocycle();
      window.history.replaceState(null, '', '/tracking/test-uuid');

      render(<AppShell />);

      await waitFor(() => {
        expect(document.querySelector('.day-select-button')).toBeInTheDocument();
      });

      const dayButton = document.querySelector('.day-select-button') as HTMLElement;
      fireEvent.click(dayButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Back to days/ })).toBeInTheDocument();
      });

      // Simulate browser back — URL goes back to /tracking/test-uuid
      window.history.pushState(null, '', '/tracking/test-uuid');
      window.dispatchEvent(new PopStateEvent('popstate'));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Back to days/ })).not.toBeInTheDocument();
        expect(document.querySelector('.day-select-button')).toBeInTheDocument();
      });
    });

    it('responds to popstate (browser back/forward)', async () => {
      render(<AppShell />);

      // Simulate browser navigating to a tracking URL via back/forward
      window.history.pushState(null, '', '/tracking/nonexistent');
      window.dispatchEvent(new PopStateEvent('popstate'));

      // View should update — since there's no matching mesocycle, it'll show planner
      // (no crash). The important thing is the listener fires.
      await waitFor(() => {
        expect(screen.getByText('Mesocycle Planner')).toBeInTheDocument();
      });
    });
  });
});
