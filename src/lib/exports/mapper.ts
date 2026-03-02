import type { DayPlan, ProgramOutput } from '../planner';
import type { CalendarRow, ExportModel, ExportOptions, ProgressionRow, SessionRow, WorkoutRow } from './types';

const WEEKDAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function sessionTypeLabel(day: DayPlan): string {
  return day.workout?.kind ?? day.sessionType;
}

function parseRirPrescription(value: string): { sets: string; reps: string; rir: string } {
  const match = value.match(/^(\d+)x([\d-]+)\s@\s(\d+)\sRIR$/i);
  if (!match) {
    return { sets: '', reps: '', rir: '' };
  }

  return {
    sets: match[1] ?? '',
    reps: match[2] ?? '',
    rir: match[3] ?? '',
  };
}

function selectWeeks(program: ProgramOutput, options: ExportOptions): ProgramOutput['weeks'] {
  if (options.scope !== 'selected' || !options.selectedWeeks?.length) {
    return program.weeks;
  }

  const selected = new Set(options.selectedWeeks);
  return program.weeks.filter((week) => selected.has(week.weekIndex));
}

function mapCalendarRows(weeks: ProgramOutput['weeks']): CalendarRow[] {
  return weeks.map((week) => {
    const dayMap = Object.fromEntries(
      week.days.map((day) => {
        const text = `${day.workout?.title ?? day.sessionType}\n${day.sessionType}\nEffort: ${day.effort}/5`;
        return [day.dateLabel, text];
      }),
    );

    return {
      Week: week.weekIndex,
      Objective: week.objective,
      Mon: dayMap.Mon ?? '',
      Tue: dayMap.Tue ?? '',
      Wed: dayMap.Wed ?? '',
      Thu: dayMap.Thu ?? '',
      Fri: dayMap.Fri ?? '',
      Sat: dayMap.Sat ?? '',
      Sun: dayMap.Sun ?? '',
    };
  });
}

function mapWorkoutRows(weeks: ProgramOutput['weeks']): WorkoutRow[] {
  const rows: WorkoutRow[] = [];

  for (const week of weeks) {
    for (const day of week.days) {
      if (!day.workout) continue;

      for (const block of day.workout.blocks) {
        for (const item of block.items) {
          const parsed = parseRirPrescription(item.prescription);
          rows.push({
            Week: week.weekIndex,
            Day: day.dateLabel,
            'Session Title': day.workout.title,
            'Session Type': sessionTypeLabel(day),
            'Week Objective': week.objective,
            'Day Type': day.workout.dayType ?? '',
            Block: block.title,
            Slot: item.slot ?? '',
            Exercise: item.name,
            Prescription: item.prescription,
            Sets: parsed.sets,
            Reps: parsed.reps,
            RIR: parsed.rir,
            'Target Mode': day.workout.targetMode ?? '',
            'Target Value': day.workout.targetValue ?? '',
            Flags: item.flags?.join(', ') ?? '',
            Notes: day.notes ?? '',
          });
        }
      }
    }
  }

  return rows;
}

function mapSessionRows(weeks: ProgramOutput['weeks']): SessionRow[] {
  const rows: SessionRow[] = [];

  for (const week of weeks) {
    for (const day of week.days) {
      if (!day.workout) continue;

      for (const block of day.workout.blocks) {
        for (const item of block.items) {
          rows.push({
            Week: week.weekIndex,
            'Week Objective': week.objective,
            Effort: day.effort,
            'Day Label': day.dateLabel,
            'Session Type': day.workout.title,
            Exercise: item.name,
            Prescription: item.prescription,
            'Actual Reps': '',
            Weight: '',
            Notes: '',
          });
        }
      }
    }
  }

  return rows;
}

function mapProgressionRows(weeks: ProgramOutput['weeks']): ProgressionRow[] {
  return weeks.map((week) => {
    const hardEnduranceSessions = week.days.filter(
      (day) => day.workout?.kind === 'endurance' && day.workout.targetMode === 'rpe',
    ).length;

    const collisionAdjustments = week.days.reduce((total, day) => {
      const dayAdjustments = day.workout?.blocks.reduce((blockTotal, block) => {
        return blockTotal + block.items.filter((item) => item.flags?.includes('cardio-collision-adjusted')).length;
      }, 0);
      return total + (dayAdjustments ?? 0);
    }, 0);

    return {
      Week: week.weekIndex,
      Objective: week.objective,
      'Is Deload Week': week.isDeloadWeek ? 'yes' : 'no',
      'Planned Sessions': week.plannedSessionCount,
      'Strength Sessions': week.summary.strengthSessions,
      'Endurance Sessions': week.summary.enduranceSessions,
      'Mixed Sessions': week.summary.mixedSessions,
      'Rest Days': week.summary.restDays,
      'Avg Effort': week.summary.avgEffort,
      'Hard Endurance Sessions': hardEnduranceSessions,
      'Collision Adjustments': collisionAdjustments,
    };
  });
}

export function mapProgramToExportModel(program: ProgramOutput, options: ExportOptions, nowIso?: string): ExportModel {
  const filteredWeeks = selectWeeks(program, options);
  const resolvedNowIso = nowIso ?? new Date().toISOString();

  const totalSessions = filteredWeeks.reduce((acc, week) => acc + week.plannedSessionCount, 0);
  const totalStrength = filteredWeeks.reduce((acc, week) => acc + week.summary.strengthSessions, 0);
  const totalEndurance = filteredWeeks.reduce((acc, week) => acc + week.summary.enduranceSessions, 0);
  const deloadWeeks = filteredWeeks.filter((week) => week.isDeloadWeek).length;
  const averageEffort = filteredWeeks.length
    ? (filteredWeeks.reduce((acc, week) => acc + week.summary.avgEffort, 0) / filteredWeeks.length).toFixed(2)
    : '0.00';

  const overview = [
    { key: 'Program Focus', value: program.inputs.focus },
    { key: 'Strength Profile', value: program.inputs.strengthProfile },
    { key: 'Initial Level', value: program.inputs.level },
    { key: 'Mesocycle Length (weeks)', value: String(program.inputs.mesocycleWeeks) },
    { key: 'Sessions / Week', value: String(program.inputs.sessionsPerWeek) },
    { key: 'Mixed Bias (%)', value: program.inputs.mixedBias != null ? String(program.inputs.mixedBias) : '' },
    { key: 'Auto Deload', value: 'true' },
    { key: 'Exported At', value: resolvedNowIso },
    { key: 'Total Sessions', value: String(totalSessions) },
    { key: 'Total Strength Sessions', value: String(totalStrength) },
    { key: 'Total Endurance Sessions', value: String(totalEndurance) },
    { key: 'Total Deload Weeks', value: String(deloadWeeks) },
    { key: 'Average Weekly Effort', value: averageEffort },
  ];

  const sessionRows = mapSessionRows(filteredWeeks);
  const calendarRows = mapCalendarRows(filteredWeeks);
  const workoutRows = options.detail === 'calendar-only' ? [] : mapWorkoutRows(filteredWeeks);
  const progressionRows = mapProgressionRows(filteredWeeks);

  return {
    program,
    options,
    filteredWeeks,
    overview,
    sessionRows,
    calendarRows,
    workoutRows,
    progressionRows,
  };
}

export const exportHeaders = {
  calendar: ['Week', 'Objective', ...WEEKDAY_KEYS],
  workouts: [
    'Week',
    'Day',
    'Session Title',
    'Session Type',
    'Week Objective',
    'Day Type',
    'Block',
    'Slot',
    'Exercise',
    'Prescription',
    'Sets',
    'Reps',
    'RIR',
    'Target Mode',
    'Target Value',
    'Flags',
    'Notes',
  ],
  progression: [
    'Week',
    'Objective',
    'Is Deload Week',
    'Planned Sessions',
    'Strength Sessions',
    'Endurance Sessions',
    'Mixed Sessions',
    'Rest Days',
    'Avg Effort',
    'Hard Endurance Sessions',
    'Collision Adjustments',
  ],
};
