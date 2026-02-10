import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateProgram } from '../planner';
import { exportProgramAsExcel, exportProgramAsPdf } from './service';

describe('export service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers excel download', async () => {
    const createObjectURL = vi.fn(() => 'blob:excel');
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL });

    const originalCreateElement = document.createElement.bind(document);
    const click = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click,
        } as unknown as HTMLAnchorElement;
      }

      return originalCreateElement(tagName);
    });

    const program = generateProgram({
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
      autoDeload: true,
      strengthProfile: 'balanced',
    });

    await exportProgramAsExcel(program, {
      scope: 'all',
      detail: 'calendar-only',
      pdfMode: 'compact',
      paperSize: 'letter',
      orientation: 'auto',
      grayscale: false,
      includeLegend: true,
      includeProgressionChart: false,
    });

    expect(createObjectURL).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(click).toHaveBeenCalled();

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: originalCreate });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: originalRevoke });
  });

  it('triggers pdf download', async () => {
    const createObjectURL = vi.fn(() => 'blob:pdf');
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL });

    const originalCreateElement = document.createElement.bind(document);
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click,
        } as unknown as HTMLAnchorElement;
      }

      return originalCreateElement(tagName);
    });

    const program = generateProgram({
      focus: 'endurance',
      mesocycleWeeks: 4,
      level: 'beginner',
      sessionsPerWeek: 3,
      autoDeload: true,
      strengthProfile: 'balanced',
    });

    await exportProgramAsPdf(program, {
      scope: 'all',
      detail: 'full',
      pdfMode: 'compact',
      paperSize: 'letter',
      orientation: 'auto',
      grayscale: false,
      includeLegend: true,
      includeProgressionChart: false,
    });

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: originalCreate });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: originalRevoke });
  });
});
