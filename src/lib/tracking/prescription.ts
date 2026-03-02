export type ParsedPrescription = {
  sets: number;
  reps?: number;
  /** Number of warmup sets to prepend (only for strength exercises) */
  warmupSets: number;
};

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
export function parsePrescription(prescription: string): ParsedPrescription {
  // Standard strength: "4x6 @ 2 RIR" or "3x8-12 @ 1 RIR"
  const rirMatch = prescription.match(/^(\d+)x(\d+)(?:-(\d+))?\s@\s\d+\sRIR$/i);
  if (rirMatch) {
    const sets = Number(rirMatch[1]);
    const reps = rirMatch[3] ? Number(rirMatch[3]) : Number(rirMatch[2]);
    return { sets, reps, warmupSets: 2 };
  }

  // Strength warmup: "8-10 min dynamic + 2 ramp sets"
  const rampMatch = prescription.match(/(\d+)\sramp\ssets/i);
  if (rampMatch) {
    return { sets: Number(rampMatch[1]), warmupSets: 0 };
  }

  // Everything else (endurance warmup, main sets, cool-down): single completable item
  return { sets: 1, warmupSets: 0 };
}
