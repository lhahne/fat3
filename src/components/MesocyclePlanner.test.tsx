import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MesocyclePlanner from './MesocyclePlanner';

const { excelMock, pdfMock } = vi.hoisted(() => ({
  excelMock: vi.fn(async () => undefined),
  pdfMock: vi.fn(async () => undefined),
}));

vi.mock('../lib/exports/service', () => ({
  exportProgramAsExcel: excelMock,
  exportProgramAsPdf: pdfMock,
}));

describe('MesocyclePlanner', () => {
  let systemPrefersDark = false;
  const storageState = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return storageState.size;
    },
    clear() {
      storageState.clear();
    },
    getItem(key: string) {
      return storageState.has(key) ? storageState.get(key) ?? null : null;
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
  const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>();

  function dispatchSystemThemeChange(nextPrefersDark: boolean) {
    systemPrefersDark = nextPrefersDark;
    const event = { matches: nextPrefersDark } as MediaQueryListEvent;
    mediaQueryListeners.forEach((listener) => listener(event));
  }

  beforeEach(() => {
    excelMock.mockClear();
    pdfMock.mockClear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    storageState.clear();
    document.documentElement.removeAttribute('data-theme');
    systemPrefersDark = false;
    mediaQueryListeners.clear();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? systemPrefersDark : false,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.delete(listener);
      },
      addListener: (listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.add(listener);
      },
      removeListener: (listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.delete(listener);
      },
      dispatchEvent: () => true,
    }));
  });

  it('renders controls and calendar weeks with seven days', () => {
    render(<MesocyclePlanner />);

    expect(screen.getByRole('heading', { name: 'Mesocycle Planner' })).toBeInTheDocument();
    expect(screen.getByLabelText('Program focus')).toBeInTheDocument();
    expect(screen.getByLabelText('Strength profile')).toBeInTheDocument();

    expect(screen.getByText('Week 1')).toBeInTheDocument();
    expect(screen.getAllByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/).length).toBeGreaterThan(0);
  });

  it('shows mixed bias slider only for mixed focus', () => {
    render(<MesocyclePlanner />);

    expect(screen.queryByLabelText('Mixed bias')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Program focus'), { target: { value: 'mixed' } });

    expect(screen.getByLabelText('Mixed bias')).toBeInTheDocument();
  });

  it('resets to recommended defaults', () => {
    render(<MesocyclePlanner />);

    fireEvent.change(screen.getByLabelText('Initial fitness level'), { target: { value: 'advanced' } });
    fireEvent.change(screen.getByLabelText('Program focus'), { target: { value: 'strength' } });

    const weeksInput = screen.getByLabelText('Mesocycle length (weeks)') as HTMLInputElement;
    fireEvent.change(weeksInput, { target: { value: '12' } });

    fireEvent.click(screen.getByRole('button', { name: 'Reset to recommended' }));

    expect((screen.getByLabelText('Mesocycle length (weeks)') as HTMLInputElement).value).toBe('10');
    expect((screen.getByLabelText('Sessions per week') as HTMLInputElement).value).toBe('5');
  });

  it('shows workout details with selected strength profile', () => {
    render(<MesocyclePlanner />);

    fireEvent.change(screen.getByLabelText('Strength profile'), { target: { value: 'endurance-support' } });
    expect(screen.getAllByText('Lower + Push Build').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Week 1, Mon, Strength/i }));

    expect(screen.getByRole('heading', { name: 'Session details' })).toBeInTheDocument();
    expect(screen.getAllByText('Lower + Push Build').length).toBeGreaterThan(0);
    expect(screen.getByText('Profile: Endurance Support Strength')).toBeInTheDocument();
    expect(screen.getAllByText(/RIR/).length).toBeGreaterThan(0);
  });

  it('opens PDF settings in a modal and exports from there', async () => {
    render(<MesocyclePlanner />);

    fireEvent.change(screen.getByLabelText('Export scope'), { target: { value: 'selected' } });
    fireEvent.change(screen.getByLabelText('Selected weeks'), { target: { value: '1,2' } });
    fireEvent.change(screen.getByLabelText('Export detail'), { target: { value: 'calendar-only' } });

    fireEvent.click(screen.getByRole('button', { name: 'Export Excel (.xlsx)' }));
    expect(screen.queryByLabelText('PDF mode')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(pdfMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'PDF export settings' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('PDF mode'), { target: { value: 'compact' } });
    fireEvent.change(screen.getByLabelText('Paper size'), { target: { value: 'a4' } });
    fireEvent.change(screen.getByLabelText('Orientation'), { target: { value: 'portrait' } });
    fireEvent.click(screen.getByLabelText('Grayscale'));
    fireEvent.click(screen.getByLabelText('Ink saver'));
    fireEvent.click(screen.getByLabelText('Include legend'));
    fireEvent.click(screen.getByLabelText('Include progression chart'));
    fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }));

    await waitFor(() => expect(excelMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(pdfMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Exported PDF file.')).toBeInTheDocument());
    expect(screen.queryByRole('dialog', { name: 'PDF export settings' })).not.toBeInTheDocument();
    expect(pdfMock).toHaveBeenCalledWith(expect.anything(), {
      scope: 'selected',
      selectedWeeks: [1, 2],
      detail: 'calendar-only',
      pdfMode: 'compact',
      paperSize: 'a4',
      orientation: 'portrait',
      grayscale: true,
      inkSaver: false,
      includeLegend: false,
      includeProgressionChart: true,
    });
  });

  it('blocks exports when selected-week input has no valid weeks', () => {
    render(<MesocyclePlanner />);

    fireEvent.change(screen.getByLabelText('Export scope'), { target: { value: 'selected' } });
    fireEvent.change(screen.getByLabelText('Selected weeks'), { target: { value: '0, abc, 99' } });

    fireEvent.click(screen.getByRole('button', { name: 'Export Excel (.xlsx)' }));
    expect(excelMock).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter at least one valid week number.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(screen.queryByRole('dialog', { name: 'PDF export settings' })).not.toBeInTheDocument();
    expect(pdfMock).not.toHaveBeenCalled();
  });

  it('closes PDF modal on cancel and escape', () => {
    render(<MesocyclePlanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(screen.getByRole('dialog', { name: 'PDF export settings' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'PDF export settings' })).not.toBeInTheDocument();
    expect(pdfMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(screen.getByRole('dialog', { name: 'PDF export settings' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'PDF export settings' })).not.toBeInTheDocument();
    expect(pdfMock).not.toHaveBeenCalled();
  });

  it('uses automatic theme mode by default and follows system preference', () => {
    systemPrefersDark = true;
    render(<MesocyclePlanner />);

    expect(screen.getByRole('button', { name: 'Use system theme' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('supports manual theme selection and persists it', () => {
    render(<MesocyclePlanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Use dark theme' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme-preference')).toBe('dark');
  });

  it('updates theme automatically when system preference changes in automatic mode', () => {
    render(<MesocyclePlanner />);
    expect(document.documentElement.dataset.theme).toBe('light');

    dispatchSystemThemeChange(true);
    expect(document.documentElement.dataset.theme).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Use light theme' }));
    dispatchSystemThemeChange(false);
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
