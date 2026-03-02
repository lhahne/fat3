import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionTracker } from './SessionTracker';
import type { ProgramOutput } from '../lib/planner';

function makeProgram(): ProgramOutput {
  return {
    inputs: {
      focus: 'strength',
      mesocycleWeeks: 4,
      level: 'intermediate',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    },
    weeks: [
      {
        weekIndex: 0,
        objective: 'build',
        isDeloadWeek: false,
        targetSessionCount: 3,
        plannedSessionCount: 3,
        days: [
          {
            weekIndex: 0,
            dayIndex: 0,
            dateLabel: 'Mon',
            sessionType: 'strength' as const,
            effort: 3 as const,
            isTrainingDay: true,
            workout: {
              kind: 'strength' as const,
              type: 'upper',
              title: 'Upper Body A',
              objective: 'build' as const,
              dayType: 'A' as const,
              blocks: [
                {
                  title: 'Warm-up',
                  items: [{ name: 'General warm-up + ramp sets', prescription: '8-10 min dynamic + 2 ramp sets' }],
                },
                {
                  title: 'Main',
                  items: [
                    { slot: 'S1', name: 'Bench Press', prescription: '3x6 @ 2 RIR' },
                  ],
                },
              ],
            },
          },
          ...Array.from({ length: 6 }, (_, i) => ({
            weekIndex: 0,
            dayIndex: i + 1,
            dateLabel: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            sessionType: 'rest' as const,
            effort: 1 as const,
            isTrainingDay: false,
          })),
        ],
        summary: { strengthSessions: 1, enduranceSessions: 0, mixedSessions: 0, restDays: 6, avgEffort: 1.3 },
      },
    ],
  };
}

describe('SessionTracker', () => {
  it('renders workout blocks', () => {
    const program = makeProgram();
    render(<SessionTracker program={program} logs={{}} weekIndex={0} dayIndex={0} onSave={vi.fn()} />);
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('renders exercise names', () => {
    const program = makeProgram();
    render(<SessionTracker program={program} logs={{}} weekIndex={0} dayIndex={0} onSave={vi.fn()} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('General warm-up + ramp sets')).toBeInTheDocument();
  });

  it('renders correct number of sets for each exercise', () => {
    const program = makeProgram();
    render(<SessionTracker program={program} logs={{}} weekIndex={0} dayIndex={0} onSave={vi.fn()} />);
    // 2 ramp sets + (2 warmup + 3 working) bench press = 7 checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(7);
  });

  it('calls onSave when a set is toggled', () => {
    const onSave = vi.fn();
    const program = makeProgram();
    render(<SessionTracker program={program} logs={{}} weekIndex={0} dayIndex={0} onSave={onSave} />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('applies warmup styling to warmup blocks', () => {
    const program = makeProgram();
    const { container } = render(
      <SessionTracker program={program} logs={{}} weekIndex={0} dayIndex={0} onSave={vi.fn()} />,
    );
    expect(container.querySelector('.tracking-block.is-warmup')).toBeInTheDocument();
  });
});
