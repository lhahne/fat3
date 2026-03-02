import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrackingView } from './TrackingView';
import type { TrackedMesocycle } from '../lib/tracking/types';
import type { ProgramOutput } from '../lib/planner';

function makeMesocycle(): TrackedMesocycle {
  const program: ProgramOutput = {
    inputs: {
      focus: 'strength',
      mesocycleWeeks: 2,
      level: 'intermediate',
      sessionsPerWeek: 3,
      strengthProfile: 'balanced',
    },
    weeks: Array.from({ length: 2 }, (_, weekIndex) => ({
      weekIndex,
      objective: 'build' as const,
      isDeloadWeek: false,
      targetSessionCount: 1,
      plannedSessionCount: 1,
      days: [
        {
          weekIndex,
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
                title: 'Main',
                items: [{ slot: 'S1', name: 'Bench Press', prescription: '3x6 @ 2 RIR' }],
              },
            ],
          },
        },
        ...Array.from({ length: 6 }, (_, i) => ({
          weekIndex,
          dayIndex: i + 1,
          dateLabel: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          sessionType: 'rest' as const,
          effort: 1 as const,
          isTrainingDay: false,
        })),
      ],
      summary: { strengthSessions: 1, enduranceSessions: 0, mixedSessions: 0, restDays: 6, avgEffort: 1.3 },
    })),
  };

  return {
    id: 'meso-1',
    name: 'Test Meso',
    startedAt: '2026-01-01',
    program,
    logs: {},
  };
}

describe('TrackingView', () => {
  it('renders mesocycle name', () => {
    render(<TrackingView mesocycle={makeMesocycle()} onUpdateLog={vi.fn()} onStopTracking={vi.fn()} />);
    expect(screen.getByText('Test Meso')).toBeInTheDocument();
  });

  it('renders week navigation buttons', () => {
    render(<TrackingView mesocycle={makeMesocycle()} onUpdateLog={vi.fn()} onStopTracking={vi.fn()} />);
    expect(screen.getByText('Week 0')).toBeInTheDocument();
    expect(screen.getByText('Week 1')).toBeInTheDocument();
  });

  it('shows training day buttons for selected week', () => {
    render(<TrackingView mesocycle={makeMesocycle()} onUpdateLog={vi.fn()} onStopTracking={vi.fn()} />);
    expect(screen.getByText('Upper Body A')).toBeInTheDocument();
  });

  it('opens session tracker when a day is clicked', () => {
    render(<TrackingView mesocycle={makeMesocycle()} onUpdateLog={vi.fn()} onStopTracking={vi.fn()} />);
    fireEvent.click(screen.getByText('Upper Body A'));
    // Should now show the session tracker with exercise details
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('navigates back to day selection', () => {
    render(<TrackingView mesocycle={makeMesocycle()} onUpdateLog={vi.fn()} onStopTracking={vi.fn()} />);
    fireEvent.click(screen.getByText('Upper Body A'));
    fireEvent.click(screen.getByText('Back to days'));
    // Should be back to day selection
    expect(screen.getByText('Upper Body A')).toBeInTheDocument();
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();
  });

  it('calls onStopTracking when stop button is clicked', () => {
    const onStopTracking = vi.fn();
    render(<TrackingView mesocycle={makeMesocycle()} onUpdateLog={vi.fn()} onStopTracking={onStopTracking} />);
    fireEvent.click(screen.getByText('Stop Tracking'));
    expect(onStopTracking).toHaveBeenCalledTimes(1);
  });
});
