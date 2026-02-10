import { fireEvent, render, screen } from '@testing-library/react';
import MesocyclePlanner from './MesocyclePlanner';

describe('MesocyclePlanner', () => {
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
});
