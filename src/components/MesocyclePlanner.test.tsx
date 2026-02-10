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
  beforeEach(() => {
    excelMock.mockClear();
    pdfMock.mockClear();
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

  it('triggers excel and pdf exports with UI controls', async () => {
    render(<MesocyclePlanner />);

    fireEvent.change(screen.getByLabelText('Export scope'), { target: { value: 'selected' } });
    fireEvent.change(screen.getByLabelText('Selected weeks'), { target: { value: '1,2' } });
    fireEvent.change(screen.getByLabelText('Export detail'), { target: { value: 'calendar-only' } });
    fireEvent.change(screen.getByLabelText('PDF mode'), { target: { value: 'compact' } });

    fireEvent.click(screen.getByRole('button', { name: 'Export Excel (.xlsx)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));

    await waitFor(() => expect(excelMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(pdfMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Exported PDF file.')).toBeInTheDocument());
  });
});
