export type ParsedPrescription = {
  sets: number;
  reps?: number;
  /** Number of warmup sets to prepend (only for strength exercises) */
  warmupSets: number;
  /** Rep targets for each warmup set, in order */
  warmupReps?: number[];
};

function warmupSetCountFromWarmupPrescription(warmupPrescription?: string): number | undefined {
  if (!warmupPrescription) return undefined;

  if (/no additional ramp sets/i.test(warmupPrescription)) {
    return 0;
  }

  const preparatoryMatch = warmupPrescription.match(/(\d+)\s+preparatory\s+set/i);
  if (preparatoryMatch) {
    return Number(preparatoryMatch[1]);
  }

  const rampSteps = warmupPrescription
    .split(',')
    .map((step) => step.trim())
    .filter((step) => /\d+(?:\.\d+)?%\s*x\d+/i.test(step));

  if (rampSteps.length > 0) {
    return rampSteps.length;
  }

  return undefined;
}

function warmupRepTargetsFromWarmupPrescription(warmupPrescription?: string): number[] | undefined {
  if (!warmupPrescription || /no additional ramp sets/i.test(warmupPrescription)) {
    return undefined;
  }

  const rampReps = Array.from(warmupPrescription.matchAll(/\d+(?:\.\d+)?%\s*x(\d+)/gi)).map((match) =>
    Number(match[1]),
  );
  if (rampReps.length > 0) {
    return rampReps;
  }

  const preparatoryReps = warmupPrescription.match(/preparatory\s+set.*x(\d+)/i);
  if (preparatoryReps) {
    return [Number(preparatoryReps[1])];
  }

  return undefined;
}

/**
 * Parse a prescription string into trackable set/rep counts.
 *
 * Formats:
 * - "4x6 @ 2 RIR" → { sets: 4, reps: 6, warmupSets: 2 }
 * - "3x8-12 @ 1 RIR" → { sets: 3, reps: 12, warmupSets: 2 }
 * - "8-10 min dynamic + 2 ramp sets" → { sets: 2, warmupSets: 0 }
 * - "10 min ramp to working effort" → { sets: 1, warmupSets: 0 }
 * - Endurance/cool-down/unrecognized → { sets: 1, warmupSets: 0 }
 */
export function parsePrescription(prescription: string, warmupPrescription?: string): ParsedPrescription {
  const warmupSetsFromItem = warmupSetCountFromWarmupPrescription(warmupPrescription);
  const warmupRepsFromItem = warmupRepTargetsFromWarmupPrescription(warmupPrescription);

  // Standard strength: "4x6 @ 2 RIR" or "3x8-12 @ 1 RIR"
  const rirMatch = prescription.match(/^(\d+)x(\d+)(?:-(\d+))?\s@\s\d+\sRIR$/i);
  if (rirMatch) {
    const sets = Number(rirMatch[1]);
    const reps = rirMatch[3] ? Number(rirMatch[3]) : Number(rirMatch[2]);
    return { sets, reps, warmupSets: warmupSetsFromItem ?? 2, warmupReps: warmupRepsFromItem };
  }

  // Strength warmup: "8-10 min dynamic + 2 ramp sets"
  const rampMatch = prescription.match(/(\d+)\sramp\ssets/i);
  if (rampMatch) {
    return { sets: Number(rampMatch[1]), warmupSets: 0 };
  }

  // Everything else (endurance warmup, main sets, cool-down): single completable item
  return { sets: 1, warmupSets: 0 };
}
