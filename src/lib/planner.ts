export type Focus = 'strength' | 'endurance' | 'mixed';
export type Level = 'beginner' | 'intermediate' | 'advanced';

export type PlannerInputs = {
  focus: Focus;
  mixedBias?: number;
  mesocycleWeeks: number;
  level: Level;
  sessionsPerWeek: number;
  autoDeload: true;
};

export type RecommendedDefaults = {
  mesocycleWeeks: number;
  sessionsPerWeek: number;
  mixedBias?: number;
};

export type SessionType = 'strength' | 'endurance' | 'mixed' | 'rest' | 'recovery' | 'deload';
export type WeekObjective = 'build' | 'push' | 'deload' | 'taper';

export type DayPlan = {
  weekIndex: number;
  dayIndex: number;
  dateLabel: string;
  sessionType: SessionType;
  effort: 1 | 2 | 3 | 4 | 5;
  isTrainingDay: boolean;
  notes?: string;
};

export type WeekPlan = {
  weekIndex: number;
  objective: WeekObjective;
  isDeloadWeek: boolean;
  targetSessionCount: number;
  plannedSessionCount: number;
  days: DayPlan[];
  summary: {
    strengthSessions: number;
    enduranceSessions: number;
    mixedSessions: number;
    restDays: number;
    avgEffort: number;
  };
};

export type ProgramOutput = {
  inputs: PlannerInputs;
  weeks: WeekPlan[];
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_TEMPLATES: Record<number, number[]> = {
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toInt(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function objectiveForWeek(
  weekIndex: number,
  deloadWeeks: Set<number>,
  weekCount: number,
): WeekObjective {
  if (weekIndex === weekCount) {
    return 'taper';
  }

  if (deloadWeeks.has(weekIndex)) {
    return 'deload';
  }

  if (deloadWeeks.has(weekIndex + 1) || weekIndex + 1 === weekCount) {
    return 'push';
  }

  return 'build';
}

export function getRecommendedDefaults(level: Level, focus: Focus): RecommendedDefaults {
  if (level === 'advanced' && focus !== 'mixed') {
    return { mesocycleWeeks: 10, sessionsPerWeek: 5 };
  }

  if (level === 'advanced' && focus === 'mixed') {
    return { mesocycleWeeks: 8, sessionsPerWeek: 4, mixedBias: 50 };
  }

  if (level === 'intermediate') {
    return {
      mesocycleWeeks: 8,
      sessionsPerWeek: 4,
      ...(focus === 'mixed' ? { mixedBias: 50 } : {}),
    };
  }

  return {
    mesocycleWeeks: 6,
    sessionsPerWeek: 3,
    ...(focus === 'mixed' ? { mixedBias: 50 } : {}),
  };
}

export function normalizeInputs(inputs: PlannerInputs): PlannerInputs {
  const normalized: PlannerInputs = {
    ...inputs,
    mesocycleWeeks: clamp(toInt(inputs.mesocycleWeeks), 4, 12),
    sessionsPerWeek: clamp(toInt(inputs.sessionsPerWeek), 2, 6),
    autoDeload: true,
  };

  if (normalized.focus === 'mixed') {
    normalized.mixedBias = clamp(toInt(normalized.mixedBias ?? 50), 0, 100);
  } else {
    delete normalized.mixedBias;
  }

  return normalized;
}

export function getDeloadWeeks(weekCount: number): number[] {
  if (weekCount <= 6) {
    return [weekCount];
  }

  if (weekCount <= 9) {
    return Array.from(new Set([Math.round(weekCount / 2), weekCount]));
  }

  return Array.from(new Set([4, 8, weekCount])).filter((week) => week <= weekCount);
}

function allocateMixedSessions(sessionCount: number, mixedBias: number): Array<'strength' | 'endurance'> {
  const enduranceCount = Math.round((mixedBias / 100) * sessionCount);
  const strengthCount = sessionCount - enduranceCount;
  const sequence: Array<'strength' | 'endurance'> = [];

  let remainingStrength = strengthCount;
  let remainingEndurance = enduranceCount;
  let next: 'strength' | 'endurance' = remainingStrength >= remainingEndurance ? 'strength' : 'endurance';

  while (remainingStrength > 0 || remainingEndurance > 0) {
    if (next === 'strength' && remainingStrength > 0) {
      sequence.push('strength');
      remainingStrength -= 1;
      next = 'endurance';
      continue;
    }

    if (next === 'endurance' && remainingEndurance > 0) {
      sequence.push('endurance');
      remainingEndurance -= 1;
      next = 'strength';
      continue;
    }

    if (remainingStrength > 0) {
      sequence.push('strength');
      remainingStrength -= 1;
    } else if (remainingEndurance > 0) {
      sequence.push('endurance');
      remainingEndurance -= 1;
    }
  }

  return sequence;
}

function getTrainingEffort(objective: WeekObjective, sessionOrder: number, totalSessions: number): 1 | 2 | 3 | 4 | 5 {
  if (objective === 'deload' || objective === 'taper') {
    if (objective === 'taper' && sessionOrder === totalSessions) {
      return 1;
    }
    return 2;
  }

  if (objective === 'push') {
    return sessionOrder === Math.ceil(totalSessions / 2) ? 5 : 4;
  }

  return 3;
}

export function generateProgram(rawInputs: PlannerInputs): ProgramOutput {
  const inputs = normalizeInputs(rawInputs);
  const deloadWeekIndexes = new Set<number>(inputs.autoDeload ? getDeloadWeeks(inputs.mesocycleWeeks) : []);

  const weeks: WeekPlan[] = [];

  for (let weekIndex = 1; weekIndex <= inputs.mesocycleWeeks; weekIndex += 1) {
    const objective = objectiveForWeek(weekIndex, deloadWeekIndexes, inputs.mesocycleWeeks);
    const isDeloadWeek = objective === 'deload' || objective === 'taper';
    const targetSessionCount = inputs.sessionsPerWeek;
    const plannedSessionCount = isDeloadWeek
      ? Math.max(2, inputs.sessionsPerWeek - 1)
      : inputs.sessionsPerWeek;

    const dayTemplate = DAY_TEMPLATES[plannedSessionCount];
    const daySet = new Set<number>(dayTemplate);

    let mixedPlan: Array<'strength' | 'endurance'> = [];
    if (inputs.focus === 'mixed') {
      mixedPlan = allocateMixedSessions(plannedSessionCount, inputs.mixedBias ?? 50);
    }

    let trainingSlot = 0;
    const days: DayPlan[] = DAY_LABELS.map((label, idx) => {
      const dayIndex = idx + 1;
      const isTrainingDay = daySet.has(dayIndex);

      if (!isTrainingDay) {
        return {
          weekIndex,
          dayIndex,
          dateLabel: label,
          sessionType: 'rest',
          effort: 1,
          isTrainingDay: false,
        };
      }

      trainingSlot += 1;
      const effort = getTrainingEffort(objective, trainingSlot, plannedSessionCount);
      let sessionType: SessionType;

      if (isDeloadWeek) {
        sessionType = 'deload';
      } else if (inputs.focus === 'strength') {
        sessionType = 'strength';
      } else if (inputs.focus === 'endurance') {
        sessionType = 'endurance';
      } else {
        sessionType = mixedPlan[trainingSlot - 1] ?? 'mixed';
      }

      return {
        weekIndex,
        dayIndex,
        dateLabel: label,
        sessionType,
        effort,
        isTrainingDay: true,
      };
    });

    const strengthSessions = days.filter((day) => day.sessionType === 'strength').length;
    const enduranceSessions = days.filter((day) => day.sessionType === 'endurance').length;
    const mixedSessions = days.filter((day) => day.sessionType === 'mixed').length;
    const restDays = days.filter((day) => day.sessionType === 'rest' || day.sessionType === 'recovery').length;
    const avgEffort = Number((days.reduce((sum, day) => sum + day.effort, 0) / days.length).toFixed(1));

    weeks.push({
      weekIndex,
      objective,
      isDeloadWeek,
      targetSessionCount,
      plannedSessionCount,
      days,
      summary: {
        strengthSessions,
        enduranceSessions,
        mixedSessions,
        restDays,
        avgEffort,
      },
    });
  }

  return {
    inputs,
    weeks,
  };
}
