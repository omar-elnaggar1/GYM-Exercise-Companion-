import { describe, expect, it } from 'vitest';
import { formatLast, prefillSets, suggestProgression } from './progression';

const sets = (w: number, ...reps: number[]) => reps.map((r) => ({ weight: w, reps: r, done: true }));

describe('progression suggestion', () => {
  it('suggests +2.5 kg when all sets hit the top of the range', () => {
    expect(suggestProgression(sets(60, 10, 10, 10), 3, 10, 2.5)).toBe(62.5);
  });

  it('suggests +2 kg for dumbbells', () => {
    expect(suggestProgression(sets(20, 12, 12, 12), 3, 12, 2)).toBe(22);
  });

  it('no suggestion if any set fell short', () => {
    expect(suggestProgression(sets(60, 10, 10, 9), 3, 10, 2.5)).toBeNull();
  });

  it('no suggestion if fewer sets were done than planned', () => {
    expect(suggestProgression(sets(60, 10, 10), 3, 10, 2.5)).toBeNull();
  });

  it('ignores sets that were not ticked', () => {
    const s = [...sets(60, 10, 10, 10), { weight: 60, reps: 4, done: false }];
    expect(suggestProgression(s, 3, 10, 2.5)).toBe(62.5);
  });

  it('beating the top of the range also counts', () => {
    expect(suggestProgression(sets(60, 11, 10, 12), 3, 10, 2.5)).toBe(62.5);
  });

  it('uses the heaviest weight when weights differ', () => {
    const s = [{ weight: 60, reps: 10, done: true }, { weight: 62.5, reps: 10, done: true }];
    expect(suggestProgression(s, 2, 10, 2.5)).toBe(65);
  });
});

describe('prefill', () => {
  const base = { plannedSets: 3, repMin: 8, repMax: 10, increment: 2.5, deload: false };

  it('copies last session', () => {
    expect(prefillSets({ ...base, lastSets: sets(60, 9, 9, 8) })).toEqual(
      [9, 9, 8].map((r) => ({ weight: 60, reps: r, done: false })),
    );
  });

  it('uses the suggested weight at the bottom of the range', () => {
    expect(prefillSets({ ...base, lastSets: sets(60, 10, 10, 10) })[0]).toEqual({ weight: 62.5, reps: 8, done: false });
  });

  it('deload: half the sets (rounded up), ~90% weight', () => {
    const out = prefillSets({ ...base, deload: true, lastSets: sets(100, 8, 8, 8) });
    expect(out).toHaveLength(2);
    expect(out[0].weight).toBe(90);
  });

  it('no history: blank weight', () => {
    expect(prefillSets({ ...base, lastSets: null })).toHaveLength(3);
  });
});

describe('formatLast', () => {
  it('same weight', () => expect(formatLast(sets(60, 9, 9, 8))).toBe('60 kg × 9, 9, 8'));
  it('mixed weights', () =>
    expect(formatLast([{ weight: 60, reps: 9, done: true }, { weight: 62.5, reps: 8, done: true }])).toBe('60×9, 62.5×8'));
  it('bodyweight', () => expect(formatLast(sets(0, 10, 8))).toBe('BW × 10, 8'));
  it('timed', () => expect(formatLast(sets(0, 45, 40), true)).toBe('45 s, 40 s'));
});
