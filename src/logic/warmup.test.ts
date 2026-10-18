import { describe, expect, it } from 'vitest';
import { warmupSets } from './warmup';

describe('warm-up sets', () => {
  it('barbell 100 kg: bar, 40, 60, 80', () =>
    expect(warmupSets(100, 'barbell')).toEqual([
      { weight: 20, reps: 10 },
      { weight: 40, reps: 5 },
      { weight: 60, reps: 3 },
      { weight: 80, reps: 2 },
    ]));
  it('barbell 60 kg skips steps lighter than the bar', () =>
    expect(warmupSets(60, 'barbell')).toEqual([
      { weight: 20, reps: 10 },
      { weight: 25, reps: 5 },
      { weight: 35, reps: 3 },
      { weight: 47.5, reps: 2 },
    ]));
  it('rounds to the plate step', () => expect(warmupSets(62.5, 'barbell').every((s) => s.weight % 2.5 === 0)).toBe(true));
  it('no warm-up for a light bar', () => expect(warmupSets(25, 'barbell')).toEqual([]));
  it('dumbbells: 2 ramp sets with their own step', () =>
    expect(warmupSets(24, 'dumbbell', 20, 2)).toEqual([
      { weight: 12, reps: 8 },
      { weight: 18, reps: 4 },
    ]));
  it('none for bodyweight', () => expect(warmupSets(10, 'bodyweight')).toEqual([]));
  it('none without a weight', () => expect(warmupSets(0, 'machine')).toEqual([]));
});
