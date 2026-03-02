import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabBar } from './TabBar';
import type { TrackedMesocycle } from '../lib/tracking/types';
import type { ProgramOutput } from '../lib/planner';

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

describe('TabBar', () => {
  it('renders Planner tab', () => {
    render(<TabBar activeView="planner" mesocycles={[]} onSelectView={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Planner' })).toBeInTheDocument();
  });

  it('renders tabs for tracked mesocycles', () => {
    const mesocycles: TrackedMesocycle[] = [
      { id: 'abc', name: 'My Meso', startedAt: '2026-01-01', program: fakeProgram, logs: {} },
    ];
    render(<TabBar activeView={{ tracking: 'abc' }} mesocycles={mesocycles} onSelectView={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'My Meso' })).toBeInTheDocument();
  });

  it('marks planner tab as selected when view is planner', () => {
    render(<TabBar activeView="planner" mesocycles={[]} onSelectView={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Planner' })).toHaveAttribute('aria-selected', 'true');
  });

  it('marks mesocycle tab as selected when tracking that mesocycle', () => {
    const mesocycles: TrackedMesocycle[] = [
      { id: 'abc', name: 'My Meso', startedAt: '2026-01-01', program: fakeProgram, logs: {} },
    ];
    render(<TabBar activeView={{ tracking: 'abc' }} mesocycles={mesocycles} onSelectView={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'My Meso' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Planner' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onSelectView when clicking planner tab', () => {
    const onSelectView = vi.fn();
    render(<TabBar activeView={{ tracking: 'abc' }} mesocycles={[]} onSelectView={onSelectView} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Planner' }));
    expect(onSelectView).toHaveBeenCalledWith('planner');
  });

  it('calls onSelectView when clicking mesocycle tab', () => {
    const onSelectView = vi.fn();
    const mesocycles: TrackedMesocycle[] = [
      { id: 'abc', name: 'My Meso', startedAt: '2026-01-01', program: fakeProgram, logs: {} },
    ];
    render(<TabBar activeView="planner" mesocycles={mesocycles} onSelectView={onSelectView} />);
    fireEvent.click(screen.getByRole('tab', { name: 'My Meso' }));
    expect(onSelectView).toHaveBeenCalledWith({ tracking: 'abc' });
  });
});
