// "Last time", progression suggestions and pre-filling today's sets.
import type { LoggedSet } from '../db/types';
import { fmtNum, fromKg, type Unit } from './units';

/** Remove float noise (62.50000001 -> 62.5) but keep lb conversions precise. */
export const roundKg = (kg: number) => Math.round(kg * 1000) / 1000;

/** Format a weight number in `unit`: "60", "62.5", "100", or "BW" for 0. */
export function fmtKg(kg: number, unit: Unit = 'kg'): string {
  return kg === 0 ? 'BW' : fmtNum(fromKg(kg, unit));
}

/**
 * "60 kg × 9, 9, 8" when every set used the same weight,
 * otherwise "60×9, 62.5×8". Timed: "45 s, 40 s". `unit` = how to show it.
 */
export function formatLast(sets: LoggedSet[], timed = false, unit: Unit = 'kg'): string {
  const done = sets.filter((s) => s.done);
  if (done.length === 0) return '';
  if (timed) {
    const w = done[0].weight;
    const secs = done.map((s) => `${s.reps} s`).join(', ');
    return w > 0 && done.every((s) => s.weight === w) ? `${fmtKg(w, unit)} ${unit} · ${secs}` : secs;
  }
  const w = done[0].weight;
  if (done.every((s) => s.weight === w)) {
    return `${fmtKg(w, unit)}${w === 0 ? '' : ` ${unit}`} × ${done.map((s) => s.reps).join(', ')}`;
  }
  return done.map((s) => `${fmtKg(s.weight, unit)}×${s.reps}`).join(', ');
}

/**
 * If last session hit the TOP of the rep range on ALL planned sets, suggest
 * adding `increment` kg to the heaviest weight used. Otherwise null.
 */
export function suggestProgression(
  lastSets: LoggedSet[],
  plannedSets: number,
  repMax: number,
  increment: number,
): number | null {
  const done = lastSets.filter((s) => s.done);
  if (done.length === 0 || done.length < plannedSets) return null;
  if (!done.every((s) => s.reps >= repMax)) return null;
  const top = Math.max(...done.map((s) => s.weight));
  return roundKg(top + increment);
}

/** Round a weight to a multiple of `step` (used for deload weights). */
export function roundToStep(kg: number, step: number): number {
  if (step <= 0) return roundKg(kg);
  return roundKg(Math.round(kg / step) * step);
}

/**
 * Build today's sets for an exercise:
 * - copy last session's weight/reps set by set (extra sets copy the last one)
 * - with a progression suggestion: use the new weight, reps at bottom of range
 * - deload: ~half the sets (rounded up) and ~90% of the weight
 * - no history: empty weight, reps at bottom of range
 */
export function prefillSets(opts: {
  lastSets: LoggedSet[] | null;
  plannedSets: number;
  repMin: number;
  repMax: number;
  increment: number;
  deload: boolean;
}): LoggedSet[] {
  const { lastSets, plannedSets, repMin, repMax, increment, deload } = opts;
  const count = deload ? Math.max(1, Math.ceil(plannedSets / 2)) : plannedSets;
  const prev = (lastSets ?? []).filter((s) => s.done);
  const suggestion = deload || !lastSets ? null : suggestProgression(lastSets, plannedSets, repMax, increment);

  return Array.from({ length: count }, (_, i) => {
    const src = prev[Math.min(i, prev.length - 1)];
    if (!src) return { weight: 0, reps: repMin, done: false };
    if (suggestion !== null) return { weight: suggestion, reps: repMin, done: false };
    if (deload) return { weight: roundToStep(src.weight * 0.9, increment / 2 || 0.5), reps: src.reps, done: false };
    return { weight: src.weight, reps: src.reps, done: false };
  });
}
