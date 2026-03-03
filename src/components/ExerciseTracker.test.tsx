import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseTracker } from './ExerciseTracker';
import type { ExerciseLog } from '../lib/tracking/types';
import type { WorkoutItem } from '../lib/planner';

describe('ExerciseTracker', () => {
  const defaultItem: WorkoutItem = {
    slot: 'S1',
    name: 'Bench Press',
    prescription: '3x6 @ 2 RIR',
  };

  const defaultLog: ExerciseLog = {
    sets: [
      { completed: false, weight: 40, reps: 6, warmup: true },
      { completed: false, weight: 60, reps: 6, warmup: true },
      { completed: false, weight: 80, reps: 6 },
      { completed: false, weight: 80, reps: 6 },
      { completed: true, weight: 80, reps: 5 },
    ],
  };

  const defaultProps = {
    exerciseKey: '0-0-Main-0',
    item: defaultItem,
    log: defaultLog,
    isWarmup: false,
    onToggleSet: vi.fn(),
    onUpdateWeight: vi.fn(),
    onUpdateReps: vi.fn(),
    onUpdateNotes: vi.fn(),
  };

  it('renders exercise name and prescription', () => {
    render(<ExerciseTracker {...defaultProps} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('3x6 @ 2 RIR')).toBeInTheDocument();
  });

  it('renders correct total number of set rows (warmup + working)', () => {
    render(<ExerciseTracker {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(5); // 2 warmup + 3 working
  });

  it('marks warmup sets with is-warmup-set class', () => {
    const { container } = render(<ExerciseTracker {...defaultProps} />);
    const warmupRows = container.querySelectorAll('.set-row.is-warmup-set');
    expect(warmupRows).toHaveLength(2);
  });

  it('labels warmup sets with W instead of numbers', () => {
    const { container } = render(<ExerciseTracker {...defaultProps} />);
    const setNumbers = container.querySelectorAll('.set-number');
    expect(setNumbers[0].textContent).toBe('W');
    expect(setNumbers[1].textContent).toBe('W');
    expect(setNumbers[2].textContent).toBe('1');
    expect(setNumbers[3].textContent).toBe('2');
    expect(setNumbers[4].textContent).toBe('3');
  });

  it('shows percentage-based placeholder for warmup weight when working weight is set', () => {
    render(<ExerciseTracker {...defaultProps} />);
    // First working set weight is 80, so warmup hints are ~40 (50%) and ~60 (75%)
    const warmupWeightInputs = screen.getAllByRole('spinbutton').filter(
      (el) => el.getAttribute('aria-label')?.includes('warmup'),
    );
    expect(warmupWeightInputs[0]).toHaveAttribute('placeholder', '~40');
    expect(warmupWeightInputs[1]).toHaveAttribute('placeholder', '~60');
  });

  it('shows completed state on checkboxes', () => {
    render(<ExerciseTracker {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).not.toBeChecked(); // warmup 1
    expect(checkboxes[4]).toBeChecked(); // last working set
  });

  it('calls onToggleSet when checkbox is clicked', () => {
    const onToggleSet = vi.fn();
    render(<ExerciseTracker {...defaultProps} onToggleSet={onToggleSet} />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(onToggleSet).toHaveBeenCalledWith('0-0-Main-0', 0);
  });

  it('calls onUpdateWeight when weight input changes', () => {
    const onUpdateWeight = vi.fn();
    render(<ExerciseTracker {...defaultProps} onUpdateWeight={onUpdateWeight} />);
    const weightInputs = screen.getAllByPlaceholderText('~40');
    fireEvent.change(weightInputs[0], { target: { value: '45' } });
    expect(onUpdateWeight).toHaveBeenCalledWith('0-0-Main-0', 0, 45);
  });

  it('calls onUpdateNotes when notes input changes', () => {
    const onUpdateNotes = vi.fn();
    render(<ExerciseTracker {...defaultProps} onUpdateNotes={onUpdateNotes} />);
    fireEvent.change(screen.getByPlaceholderText('Notes...'), { target: { value: 'Good form' } });
    expect(onUpdateNotes).toHaveBeenCalledWith('0-0-Main-0', 'Good form');
  });

  it('applies warmup class when isWarmup is true', () => {
    const { container } = render(<ExerciseTracker {...defaultProps} isWarmup={true} />);
    expect(container.querySelector('.is-warmup')).toBeInTheDocument();
  });

  it('shows kg placeholder when no working weight is set', () => {
    const logNoWeight: ExerciseLog = {
      sets: [
        { completed: false, reps: 6, warmup: true },
        { completed: false, reps: 6, warmup: true },
        { completed: false, reps: 6 },
      ],
    };
    render(<ExerciseTracker {...defaultProps} log={logNoWeight} />);
    const warmupWeightInputs = screen.getAllByPlaceholderText('kg');
    expect(warmupWeightInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('uses warmupPrescription percentages for warmup weight placeholders', () => {
    const itemWithWarmup: WorkoutItem = {
      ...defaultItem,
      warmupPrescription: '40%x8, 60%x5, 75%x3',
    };
    const logWithThreeWarmups: ExerciseLog = {
      sets: [
        { completed: false, reps: 8, warmup: true },
        { completed: false, reps: 5, warmup: true },
        { completed: false, reps: 3, warmup: true },
        { completed: false, weight: 100, reps: 6 },
      ],
    };

    render(<ExerciseTracker {...defaultProps} item={itemWithWarmup} log={logWithThreeWarmups} />);
    const warmupWeightInputs = screen.getAllByRole('spinbutton').filter(
      (el) => el.getAttribute('aria-label')?.includes('warmup'),
    );
    expect(warmupWeightInputs).toHaveLength(3);
    expect(warmupWeightInputs[0]).toHaveAttribute('placeholder', '~40');
    expect(warmupWeightInputs[1]).toHaveAttribute('placeholder', '~60');
    expect(warmupWeightInputs[2]).toHaveAttribute('placeholder', '~75');
  });
});
