export type Focus = 'strength' | 'endurance' | 'mixed';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type StrengthProfile = 'bodybuilding' | 'powerlifting' | 'balanced' | 'endurance-support';

export type PlannerInputs = {
  focus: Focus;
  mixedBias?: number;
  mesocycleWeeks: number;
  level: Level;
  sessionsPerWeek: number;
  autoDeload: true;
  strengthProfile: StrengthProfile;
};

export type RecommendedDefaults = {
  mesocycleWeeks: number;
  sessionsPerWeek: number;
  mixedBias?: number;
};

export type SessionType = 'strength' | 'endurance' | 'mixed' | 'rest' | 'recovery' | 'deload';
export type WeekObjective = 'build' | 'push' | 'deload' | 'taper';
export type EnduranceTargetMode = 'zone' | 'rpe';

export type WorkoutItem = {
  slot?: string;
  name: string;
  prescription: string;
  flags?: string[];
};

export type WorkoutBlock = {
  title: string;
  items: WorkoutItem[];
};

export type WorkoutSession = {
  kind: 'strength' | 'endurance';
  type: string;
  title: string;
  objective: WeekObjective;
  dayType?: 'A' | 'B' | 'C' | 'A2' | 'B2' | 'C2';
  strengthProfile?: StrengthProfile;
  targetMode?: EnduranceTargetMode;
  targetValue?: string;
  blocks: WorkoutBlock[];
};

export type DayPlan = {
  weekIndex: number;
  dayIndex: number;
  dateLabel: string;
  sessionType: SessionType;
  effort: 1 | 2 | 3 | 4 | 5;
  isTrainingDay: boolean;
  notes?: string;
  workout?: WorkoutSession;
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

type StrengthDayTemplate = {
  A: Record<string, string[]>;
  B: Record<string, string[]>;
  C: Record<string, string[]>;
};

type EnduranceWorkoutType = 'easy' | 'long-easy' | 'tempo' | 'interval';

type SessionPrescription = {
  sets: number;
  reps: string;
  rir: number;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_TEMPLATES: Record<number, number[]> = {
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};

const DAY_TYPE_ROTATION: Array<'A' | 'B' | 'C' | 'A2' | 'B2' | 'C2'> = ['A', 'B', 'C', 'A2', 'B2', 'C2'];

export const STRENGTH_PROFILE_LABELS: Record<StrengthProfile, string> = {
  bodybuilding: 'Bodybuilding',
  powerlifting: 'Powerlifting',
  balanced: 'Balanced',
  'endurance-support': 'Endurance Support Strength',
};

const STRENGTH_TEMPLATES: Record<StrengthProfile, StrengthDayTemplate> = {
  bodybuilding: {
    A: {
      S1: ['Back Squat', 'Front Squat', 'Hack Squat', 'Leg Press'],
      S2: ['Bench Press', 'Incline DB Press', 'Machine Chest Press', 'Weighted Push-up'],
      S3: ['Barbell Row', 'Chest-Supported Row', 'Cable Row', 'One-Arm DB Row'],
      S4: ['Bulgarian Split Squat', 'Walking Lunge', 'Leg Extension', 'Step-up'],
      S5: ['Lateral Raise', 'Cable Fly', 'Triceps Pressdown', 'EZ Curl'],
      S6: ['Ab Wheel', 'Hanging Knee Raise', 'Pallof Press', 'Farmer Carry'],
    },
    B: {
      S1: ['Romanian Deadlift', 'Deadlift (moderate)', 'Good Morning', 'Hip Thrust'],
      S2: ['Overhead Press', 'Seated DB Press', 'Arnold Press', 'Landmine Press'],
      S3: ['Pull-up', 'Lat Pulldown', 'Neutral-Grip Pulldown', 'Assisted Pull-up'],
      S4: ['Hamstring Curl', 'Glute Bridge', '45° Back Extension', 'Single-Leg RDL'],
      S5: ['Rear Delt Fly', 'Face Pull', 'Incline Curl', 'Overhead Triceps Extension'],
      S6: ['Side Plank', 'Dead Bug', 'Cable Chop', 'Suitcase Carry'],
    },
    C: {
      S1: ['Front Squat', 'Leg Press (feet low)', 'Goblet Squat', 'Split Squat'],
      S2: ['Incline Bench Press', 'DB Bench Press', 'Close-Grip Bench', 'Dip'],
      S3: ['T-Bar Row', 'Seated Cable Row', 'Pull-up', 'DB Row'],
      S4: ['Hip Thrust', 'Reverse Lunge', 'Leg Curl', 'Step-up'],
      S5: ['Calf Raise', 'Lateral Raise', 'Preacher Curl', 'Rope Pushdown'],
      S6: ['Plank', 'Ab Wheel', 'Copenhagen Plank', 'Farmer Carry'],
    },
  },
  powerlifting: {
    A: {
      S1: ['Back Squat', 'Pause Squat', 'Tempo Squat', 'Front Squat'],
      S2: ['Bench Press (volume)', 'Close-Grip Bench', 'Spoto Press', 'DB Bench'],
      S3: ['Barbell Row', 'Pendlay Row', 'Weighted Pull-up', 'Chest-Supported Row'],
      S4: ['RDL', 'Good Morning', 'Hip Thrust', 'Hamstring Curl'],
      S5: ['Plank', 'Ab Wheel', 'Pallof Press', 'Back Extension'],
      S6: ['Farmer Carry', 'Suitcase Carry', 'Dead Bug', 'Side Plank'],
    },
    B: {
      S1: ['Deadlift', 'Deficit Deadlift', 'Pause Deadlift', 'Trap Bar Deadlift'],
      S2: ['Bench Press (technique)', 'Incline Bench', 'Larsen Press', 'Close-Grip Bench'],
      S3: ['Weighted Pull-up', 'Barbell Row', 'Lat Pulldown', 'Cable Row'],
      S4: ['RDL', 'Back Extension', 'Glute-Ham Raise', 'Hip Thrust'],
      S5: ['Side Plank', 'Farmer Carry', 'Dead Bug', 'Pallof Press'],
      S6: ['Ab Wheel', 'Plank', 'Carry', 'Back Extension'],
    },
    C: {
      S1: ['Bench Press', 'Pause Bench', 'Spoto Press', 'Close-Grip Bench'],
      S2: ['Front Squat', 'Tempo Squat', 'Leg Press', 'Goblet Squat'],
      S3: ['Barbell Row', 'Pull-up', 'Chest-Supported Row', 'Cable Row'],
      S4: ['Hamstring Curl', 'Good Morning (light)', 'RDL (light)', 'Back Extension'],
      S5: ['Plank', 'Ab Wheel', 'Copenhagen Plank', 'Carry'],
      S6: ['Pallof Press', 'Side Plank', 'Dead Bug', 'Farmer Carry'],
    },
  },
  balanced: {
    A: {
      S1: ['Back Squat', 'Front Squat', 'Trap Bar Deadlift', 'Goblet Squat'],
      S2: ['Bench Press', 'DB Bench Press', 'Incline DB Press', 'Push-up'],
      S3: ['Pull-up', 'Lat Pulldown', 'Seated Row', 'One-Arm DB Row'],
      S4: ['RDL', 'Split Squat', 'Step-up', 'Hip Thrust'],
      S5: ['Face Pull', 'Lateral Raise', 'Calf Raise', 'Rear Delt Fly'],
      S6: ['Pallof Press', 'Farmer Carry', 'Plank', 'Dead Bug'],
    },
    B: {
      S1: ['Deadlift (moderate)', 'RDL', 'Trap Bar Deadlift', 'Cable Pull-through'],
      S2: ['Overhead Press', 'Seated DB Press', 'Landmine Press', 'Incline Press'],
      S3: ['Chest-Supported Row', 'Pull-up', 'Cable Row', 'Lat Pulldown'],
      S4: ['Reverse Lunge', 'Front Squat (light)', 'Single-Leg RDL', 'Leg Press'],
      S5: ['Face Pull', 'Calf Raise', 'Lateral Raise', 'External Rotation Cable'],
      S6: ['Side Plank', 'Suitcase Carry', 'Ab Wheel', 'Copenhagen Plank'],
    },
    C: {
      S1: ['Front Squat', 'Split Squat', 'Step-up', 'Goblet Squat'],
      S2: ['Incline Bench', 'Close-Grip Bench', 'DB Press', 'Dip/Assisted Dip'],
      S3: ['Row Variant', 'Pull-up Variant', 'Cable Row', 'Machine Row'],
      S4: ['Hip Thrust', 'Hamstring Curl', 'RDL (light)', 'Glute Bridge'],
      S5: ['Rear Delt Fly', 'Lateral Raise', 'Calf Raise', 'Arm Superset'],
      S6: ['Carry', 'Pallof Press', 'Dead Bug', 'Plank'],
    },
  },
  'endurance-support': {
    A: {
      S1: ['Bulgarian Split Squat', 'Step-up', 'Reverse Lunge', 'Single-Leg Press'],
      S2: ['RDL', 'Single-Leg RDL', 'Hip Thrust', 'Cable Pull-through'],
      S3: ['Seated Row', 'Pull-up/Assisted', 'Chest-Supported Row', 'Band Row'],
      S4: ['Standing Calf Raise', 'Seated Calf Raise', 'Bent-Knee Calf Raise', 'Tibialis Raise'],
      S5: ['Pallof Press', 'Side Plank', 'Dead Bug', 'Copenhagen Plank'],
      S6: ['KB Swing (low dose)', 'Med Ball Slam', 'Box Step Drive', 'Easy Mobility Circuit'],
    },
    B: {
      S1: ['Trap Bar Deadlift (submax)', 'RDL', 'Hip Thrust', 'Good Morning (light)'],
      S2: ['Landmine Press', 'Push-up', 'DB Incline Press', 'Seated DB Press (light)'],
      S3: ['Pull-up/Assisted', 'Lat Pulldown', 'Cable Row', 'Face Pull'],
      S4: ['Split Squat', 'Step-down', 'Lateral Lunge', 'Glute Bridge'],
      S5: ['Farmer Carry', 'Suitcase Carry', 'Sled Push (light)', 'March Carry'],
      S6: ['Anti-rotation press', 'Plank Reach', 'Side Plank', 'Dead Bug'],
    },
    C: {
      S1: ['Goblet Squat', 'Front Squat (light)', 'Step-up', 'Split Squat'],
      S2: ['KB Swing', 'Trap Bar Jump (light)', 'Med Ball Throw', 'Easy Mobility Circuit'],
      S3: ['Seated Row', 'Pull-up/Assisted', 'Single-Arm Cable Row', 'Band Row'],
      S4: ['Calf Complex', 'Tibialis Raise', 'Soleus Raise', 'Isometric Calf Hold'],
      S5: ['Copenhagen Plank', 'Pallof Press', 'Dead Bug', 'Bird Dog'],
      S6: ['Easy Mobility Circuit', 'Easy Mobility Circuit', 'Easy Mobility Circuit', 'Easy Mobility Circuit'],
    },
  },
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

function chooseExercise(list: string[], weekIndex: number, variantOffset: number): string {
  const index = (weekIndex - 1 + variantOffset) % list.length;
  return list[index];
}

function slotIsMain(slot: string): boolean {
  return slot === 'S1' || slot === 'S2' || slot === 'S3';
}

function slotIsLower(slot: string): boolean {
  return slot === 'S1' || slot === 'S4';
}

function getPrescription(objective: WeekObjective, isMain: boolean): SessionPrescription {
  if (isMain) {
    if (objective === 'push') return { sets: 5, reps: '4', rir: 1 };
    if (objective === 'deload') return { sets: 2, reps: '5', rir: 4 };
    if (objective === 'taper') return { sets: 2, reps: '4', rir: 3 };
    return { sets: 4, reps: '6', rir: 2 };
  }

  if (objective === 'push') return { sets: 3, reps: '8', rir: 1 };
  if (objective === 'deload') return { sets: 2, reps: '10', rir: 3 };
  if (objective === 'taper') return { sets: 1, reps: '8', rir: 3 };
  return { sets: 3, reps: '10', rir: 2 };
}

function toPrescriptionString(value: SessionPrescription): string {
  return `${value.sets}x${value.reps} @ ${value.rir} RIR`;
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

function getStrengthDayType(strengthSessionIndex: number): 'A' | 'B' | 'C' | 'A2' | 'B2' | 'C2' {
  return DAY_TYPE_ROTATION[strengthSessionIndex % DAY_TYPE_ROTATION.length];
}

function getEnduranceWorkoutType(objective: WeekObjective, order: number, total: number): EnduranceWorkoutType {
  if (objective === 'deload' || objective === 'taper') {
    return 'easy';
  }

  if (objective === 'push') {
    return order % 2 === 0 ? 'tempo' : 'interval';
  }

  if (order === total && total >= 3) {
    return 'long-easy';
  }

  return order % 2 === 0 ? 'tempo' : 'easy';
}

function strengthSessionTitle(dayType: 'A' | 'B' | 'C' | 'A2' | 'B2' | 'C2', objective: WeekObjective): string {
  const base = dayType.startsWith('A') ? 'Lower + Push' : dayType.startsWith('B') ? 'Hinge + Press' : 'Mixed Strength';
  if (objective === 'push') return `${base} Peak`;
  if (objective === 'deload') return `${base} Deload`;
  if (objective === 'taper') return `${base} Taper`;
  return `${base} Build`;
}

function enduranceSessionTitle(type: EnduranceWorkoutType, objective: WeekObjective): string {
  if (objective === 'deload') return 'Recovery Aerobic';
  if (objective === 'taper') return 'Taper Endurance';
  if (type === 'interval') return 'Interval Power';
  if (type === 'tempo') return 'Tempo Control';
  if (type === 'long-easy') return 'Long Easy Endurance';
  return 'Aerobic Base';
}

function targetModeForEndurance(type: EnduranceWorkoutType): EnduranceTargetMode {
  if (type === 'easy' || type === 'long-easy') {
    return 'zone';
  }

  return 'rpe';
}

function enduranceTargetValue(type: EnduranceWorkoutType): string {
  if (type === 'easy') return 'Zone 2';
  if (type === 'long-easy') return 'Zone 2 (extended)';
  if (type === 'tempo') return 'RPE 7';
  return 'RPE 8';
}

function endurancePrescription(type: EnduranceWorkoutType): string {
  if (type === 'easy') return '40 min easy aerobic';
  if (type === 'long-easy') return '60 min easy aerobic';
  if (type === 'tempo') return '3x8 min tempo, 3 min easy';
  return '6x3 min hard, 2 min easy';
}

function isHardEndurance(type: EnduranceWorkoutType): boolean {
  return type === 'tempo' || type === 'interval';
}

function generateEnduranceWorkout(
  objective: WeekObjective,
  sessionOrder: number,
  totalSessions: number,
): WorkoutSession {
  const type = getEnduranceWorkoutType(objective, sessionOrder, totalSessions);
  const targetMode = targetModeForEndurance(type);
  const targetValue = enduranceTargetValue(type);

  return {
    kind: 'endurance',
    type,
    title: enduranceSessionTitle(type, objective),
    objective,
    targetMode,
    targetValue,
    blocks: [
      {
        title: 'Warm-up',
        items: [{ name: 'Easy progression', prescription: '10 min ramp to working effort' }],
      },
      {
        title: 'Main',
        items: [{ name: 'Primary set', prescription: `${endurancePrescription(type)} (${targetValue})` }],
      },
      {
        title: 'Cool-down',
        items: [{ name: 'Easy finish', prescription: '8-10 min easy + mobility' }],
      },
    ],
  };
}

function generateStrengthWorkout(
  weekIndex: number,
  objective: WeekObjective,
  profile: StrengthProfile,
  dayType: 'A' | 'B' | 'C' | 'A2' | 'B2' | 'C2',
  cardioCollision: boolean,
): WorkoutSession {
  const template = STRENGTH_TEMPLATES[profile];
  const baseDay = dayType.startsWith('A') ? 'A' : dayType.startsWith('B') ? 'B' : 'C';
  const variantOffset = dayType.endsWith('2') ? 1 : 0;
  const dayTemplate = template[baseDay as 'A' | 'B' | 'C'];

  const mainItems: WorkoutItem[] = ['S1', 'S2', 'S3'].map((slot) => {
    const chosen = chooseExercise(dayTemplate[slot], weekIndex, variantOffset);
    const basePrescription = getPrescription(objective, true);
    const adjusted = slotIsLower(slot) && cardioCollision
      ? {
          sets: Math.max(2, basePrescription.sets - 1),
          reps: basePrescription.reps,
          rir: Math.max(2, basePrescription.rir + 1),
        }
      : basePrescription;

    return {
      slot,
      name: chosen,
      prescription: toPrescriptionString(adjusted),
      ...(slotIsLower(slot) && cardioCollision ? { flags: ['cardio-collision-adjusted'] } : {}),
    };
  });

  const accessoryItems: WorkoutItem[] = ['S4', 'S5'].map((slot) => {
    const chosen = chooseExercise(dayTemplate[slot], weekIndex, variantOffset);
    const basePrescription = getPrescription(objective, false);
    const adjusted = slotIsLower(slot) && cardioCollision
      ? {
          sets: Math.max(1, basePrescription.sets - 1),
          reps: basePrescription.reps,
          rir: Math.max(2, basePrescription.rir + 1),
        }
      : basePrescription;

    return {
      slot,
      name: chosen,
      prescription: toPrescriptionString(adjusted),
      ...(slotIsLower(slot) && cardioCollision ? { flags: ['cardio-collision-adjusted'] } : {}),
    };
  });

  const trunkExercise = chooseExercise(dayTemplate.S6, weekIndex, variantOffset);
  const includeTrunk = objective !== 'deload' || profile !== 'endurance-support';
  const trunkItems: WorkoutItem[] = includeTrunk
    ? [{ slot: 'S6', name: trunkExercise, prescription: '2x8 @ 3 RIR' }]
    : [];

  return {
    kind: 'strength',
    type: 'strength-session',
    title: strengthSessionTitle(dayType, objective),
    objective,
    dayType,
    strengthProfile: profile,
    blocks: [
      {
        title: 'Warm-up',
        items: [{ name: 'General warm-up + ramp sets', prescription: '8-10 min dynamic + 2 ramp sets' }],
      },
      { title: 'Main work', items: mainItems },
      { title: 'Accessory work', items: accessoryItems },
      { title: 'Trunk / power', items: trunkItems },
    ],
  };
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
    strengthProfile: inputs.strengthProfile ?? 'balanced',
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

    const disciplines: Array<'strength' | 'endurance'> = (() => {
      if (inputs.focus === 'strength') {
        return Array.from({ length: plannedSessionCount }, () => 'strength');
      }

      if (inputs.focus === 'endurance') {
        return Array.from({ length: plannedSessionCount }, () => 'endurance');
      }

      return allocateMixedSessions(plannedSessionCount, inputs.mixedBias ?? 50);
    })();

    const dayAssignments = new Map<number, { discipline: 'strength' | 'endurance'; order: number }>();
    let trainingOrder = 0;
    for (const dayIndex of dayTemplate) {
      dayAssignments.set(dayIndex, {
        discipline: disciplines[trainingOrder] ?? 'strength',
        order: trainingOrder + 1,
      });
      trainingOrder += 1;
    }

    const enduranceTotal = disciplines.filter((item) => item === 'endurance').length;
    const enduranceWorkoutsByDay = new Map<number, WorkoutSession>();
    const hardCardioDays = new Set<number>();
    let enduranceOrder = 0;

    for (const dayIndex of dayTemplate) {
      const assignment = dayAssignments.get(dayIndex);
      if (!assignment || assignment.discipline !== 'endurance') continue;

      const workout = generateEnduranceWorkout(objective, enduranceOrder + 1, enduranceTotal || 1);
      enduranceWorkoutsByDay.set(dayIndex, workout);
      if (isHardEndurance(workout.type as EnduranceWorkoutType)) {
        hardCardioDays.add(dayIndex);
      }
      enduranceOrder += 1;
    }

    const days: DayPlan[] = [];
    let strengthOrder = 0;

    for (let dayIndex = 1; dayIndex <= 7; dayIndex += 1) {
      const label = DAY_LABELS[dayIndex - 1];
      const assignment = dayAssignments.get(dayIndex);

      if (!assignment || !daySet.has(dayIndex)) {
        days.push({
          weekIndex,
          dayIndex,
          dateLabel: label,
          sessionType: 'rest',
          effort: 1,
          isTrainingDay: false,
        });
        continue;
      }

      const effort = getTrainingEffort(objective, assignment.order, plannedSessionCount);
      const shownSessionType: SessionType = isDeloadWeek ? 'deload' : assignment.discipline;
      let workout: WorkoutSession;

      if (assignment.discipline === 'endurance') {
        workout = enduranceWorkoutsByDay.get(dayIndex) as WorkoutSession;
      } else {
        const dayType = getStrengthDayType(strengthOrder);
        const collision = hardCardioDays.has(dayIndex) || hardCardioDays.has(dayIndex + 1);
        workout = generateStrengthWorkout(weekIndex, objective, inputs.strengthProfile, dayType, collision);
        strengthOrder += 1;
      }

      days.push({
        weekIndex,
        dayIndex,
        dateLabel: label,
        sessionType: shownSessionType,
        effort,
        isTrainingDay: true,
        workout,
      });
    }

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
