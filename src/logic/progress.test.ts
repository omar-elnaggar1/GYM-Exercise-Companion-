import { describe, expect, it } from 'vitest';
import type { Exercise, Workout } from '../db/types';
import { e1rm, exerciseSeries, findPRs, improvements, isSetPR, metricFor, weekStart, weeklyVolume } from './progress';

const bench: Exercise = { id: 'bench', name: 'Bench', equipment: 'barbell', increment: 2.5, alternatives: [] };
const pullup: Exercise = { id: 'pullup', name: 'Pull-up', equipment: 'bodyweight', increment: 2.5, alternatives: [] };
const plank: Exercise = { id: 'plank', name: 'Plank', equipment: 'bodyweight', increment: 2.5, timed: true, alternatives: [] };

let nextId = 1;
const wo = (date: string, entries: [string, [number, number][]][], deload = false): Workout => ({
  id: nextId++,
  date,
  templateId: 'upper',
  slotIndex: 0,
  startedAt: 0,
  finishedAt: Date.parse(date),
  deload,
  note: '',
  entries: entries.map(([exerciseId, sets]) => ({
    exerciseId, repMin: 6, repMax: 10, restSeconds: 90, note: '',
    sets: sets.map(([weight, reps]) => ({ weight, reps, done: true })),
  })),
});

describe('e1rm', () => {
  it('1 rep = the weight', () => expect(e1rm(100, 1)).toBe(100));
  it('60 × 10 ≈ 80', () => expect(e1rm(60, 10)).toBeCloseTo(80));
  it('0 kg = 0', () => expect(e1rm(0, 10)).toBe(0));
});

describe('metric', () => {
  const ws = [wo('2026-01-01', [['pullup', [[0, 8]]]])];
  it('weighted lift', () => expect(metricFor(bench, [])).toBe('e1rm'));
  it('bodyweight without extra weight counts reps', () => expect(metricFor(pullup, ws)).toBe('reps'));
  it('timed counts seconds', () => expect(metricFor(plank, ws)).toBe('seconds'));
});

describe('personal records', () => {
  const ws = [
    wo('2026-01-05', [['bench', [[60, 8], [60, 8]]]]),
    wo('2026-01-08', [['bench', [[60, 10], [60, 9]]]]), // more reps -> best e1RM PR
    wo('2026-01-12', [['bench', [[62.5, 6]]]]), // heavier, lower e1RM -> heaviest PR only
    wo('2026-01-15', [['bench', [[50, 5]]]], true), // deload ignored
    wo('2026-01-19', [['bench', [[60, 8]]]]), // nothing new
  ];
  const { records, events } = findPRs(ws, [bench]);

  it('first session is the baseline, not a PR', () => expect(events.find((e) => e.date === '2026-01-05')).toBeUndefined());
  it('more reps at the same weight is a PR', () =>
    expect(events.find((e) => e.date === '2026-01-08')?.kinds).toEqual(['best']));
  it('heavier weight is a PR even if the e1RM is lower', () =>
    expect(events.find((e) => e.date === '2026-01-12')?.kinds).toEqual(['heaviest']));
  it('deloads and repeats are not PRs', () => expect(events).toHaveLength(2));
  it('keeps the records', () => {
    const r = records.get('bench')!;
    expect(r.best.set).toEqual({ weight: 60, reps: 10, done: true });
    expect(r.heaviest.weight).toBe(62.5);
    expect(r.sessions).toBe(4);
  });
  it('heaviest keeps the best reps at that weight', () => {
    const more = findPRs([...ws, wo('2026-01-22', [['bench', [[62.5, 8]]]])], [bench]).records.get('bench')!;
    expect(more.heaviest).toEqual({ weight: 62.5, reps: 8, date: '2026-01-22' });
  });
  it('detects a live PR set', () => {
    const r = records.get('bench')!;
    expect(isSetPR({ weight: 60, reps: 11, done: true }, r)).toBe(true);
    expect(isSetPR({ weight: 65, reps: 3, done: true }, r)).toBe(true);
    expect(isSetPR({ weight: 60, reps: 10, done: true }, r)).toBe(false);
    expect(isSetPR({ weight: 70, reps: 10, done: false }, r)).toBe(false);
    expect(isSetPR({ weight: 70, reps: 10, done: true }, undefined)).toBe(false);
  });
});

describe('series & improvements', () => {
  const ws = [
    wo('2026-01-05', [['bench', [[60, 8]]], ['pullup', [[0, 5]]]]),
    wo('2026-01-12', [['bench', [[62.5, 8]]], ['pullup', [[0, 6]]]]),
    wo('2026-01-19', [['bench', [[65, 8]]], ['pullup', [[0, 8]]]]),
  ];
  it('one point per session, best set wins', () => {
    const s = exerciseSeries(ws, bench);
    expect(s.map((p) => p.top.weight)).toEqual([60, 62.5, 65]);
    expect(s[2].volume).toBe(520);
  });
  it('ranks by % improvement', () => {
    const imp = improvements(ws, [bench, pullup]);
    expect(imp[0].exerciseId).toBe('pullup'); // 5 -> 8 reps = +60%
    expect(imp[0].pct).toBeCloseTo(60);
    expect(imp[1].pct).toBeCloseTo(((65 - 60) / 60) * 100);
  });
});

describe('weekly volume', () => {
  it('weeks start on Monday', () => {
    expect(weekStart('2026-10-18')).toBe('2026-10-12'); // Sunday -> Monday before
    expect(weekStart('2026-10-12')).toBe('2026-10-12');
  });
  it('sums weight × reps per week', () => {
    const ws = [wo('2026-10-13', [['bench', [[60, 10]]]]), wo('2026-10-14', [['bench', [[50, 10]]]]), wo('2026-10-06', [['bench', [[40, 10]]]])];
    const v = weeklyVolume(ws, '2026-10-18', 3);
    expect(v.map((x) => x.volume)).toEqual([0, 400, 1100]);
    expect(v[2].sessions).toBe(2);
  });
});
