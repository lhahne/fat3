import { describe, expect, it } from 'vitest';
import { parsePrescription } from './prescription';

describe('parsePrescription', () => {
  it('parses standard RIR prescription "4x6 @ 2 RIR" with 2 warmup sets', () => {
    expect(parsePrescription('4x6 @ 2 RIR')).toEqual({ sets: 4, reps: 6, warmupSets: 2 });
  });

  it('parses rep range prescription "3x8-12 @ 1 RIR" with 2 warmup sets', () => {
    expect(parsePrescription('3x8-12 @ 1 RIR')).toEqual({ sets: 3, reps: 12, warmupSets: 2 });
  });

  it('parses "2x8 @ 3 RIR" with 2 warmup sets', () => {
    expect(parsePrescription('2x8 @ 3 RIR')).toEqual({ sets: 2, reps: 8, warmupSets: 2 });
  });

  it('parses strength warmup "8-10 min dynamic + 2 ramp sets" with no warmup sets', () => {
    expect(parsePrescription('8-10 min dynamic + 2 ramp sets')).toEqual({ sets: 2, warmupSets: 0 });
  });

  it('parses endurance warmup "10 min ramp to working effort" with no warmup sets', () => {
    expect(parsePrescription('10 min ramp to working effort')).toEqual({ sets: 1, warmupSets: 0 });
  });

  it('parses endurance prescription with no warmup sets', () => {
    expect(parsePrescription('40 min easy aerobic (Zone 2)')).toEqual({ sets: 1, warmupSets: 0 });
  });

  it('parses tempo prescription with no warmup sets', () => {
    expect(parsePrescription('3x8 min tempo, 3 min easy (RPE 8)')).toEqual({ sets: 1, warmupSets: 0 });
  });

  it('parses cool-down prescription with no warmup sets', () => {
    expect(parsePrescription('8-10 min easy + mobility')).toEqual({ sets: 1, warmupSets: 0 });
  });

  it('returns { sets: 1, warmupSets: 0 } for unrecognized formats', () => {
    expect(parsePrescription('something unknown')).toEqual({ sets: 1, warmupSets: 0 });
  });

  it('uses warmupPrescription with three ramp sets when provided', () => {
    expect(parsePrescription('4x6 @ 2 RIR', '40%x8, 60%x5, 75%x3')).toEqual({
      sets: 4,
      reps: 6,
      warmupSets: 3,
      warmupReps: [8, 5, 3],
    });
  });

  it('uses warmupPrescription with two ramp sets when provided', () => {
    expect(parsePrescription('3x8 @ 2 RIR', '50%x8, 70%x4')).toEqual({
      sets: 3,
      reps: 8,
      warmupSets: 2,
      warmupReps: [8, 4],
    });
  });

  it('uses warmupPrescription with one ramp set when provided', () => {
    expect(parsePrescription('3x12 @ 2 RIR', '1 preparatory set @ ~50% x12')).toEqual({
      sets: 3,
      reps: 12,
      warmupSets: 1,
      warmupReps: [12],
    });
  });

  it('uses zero warmup sets for explicit no-ramp warmupPrescription', () => {
    expect(parsePrescription('2x8 @ 3 RIR', 'No additional ramp sets')).toEqual({ sets: 2, reps: 8, warmupSets: 0 });
  });
});
