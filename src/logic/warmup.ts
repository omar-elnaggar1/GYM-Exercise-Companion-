// Warm-up sets before your first heavy lift. They are a suggestion only
// (not logged), ramping up so the last warm-up is ~80% of your work weight.
import type { Equipment } from '../db/types';

export interface WarmupSet {
  weight: number;
  reps: number;
}

const roundTo = (kg: number, step: number) => Math.round(kg / step) * step;

export function warmupSets(workWeight: number, equipment: Equipment, bar = 20, step = 2.5): WarmupSet[] {
  if (equipment === 'bodyweight' || workWeight <= 0) return [];
  const ramp: [number, number][] =
    equipment === 'barbell'
      ? [[0.4, 5], [0.6, 3], [0.8, 2]]
      : [[0.5, 8], [0.75, 4]];
  // Too light to need a warm-up.
  if (workWeight < (equipment === 'barbell' ? bar + 10 : 10)) return [];

  const out: WarmupSet[] = equipment === 'barbell' ? [{ weight: bar, reps: 10 }] : [];
  for (const [pct, reps] of ramp) {
    const w = roundTo(workWeight * pct, step);
    const prev = out[out.length - 1]?.weight ?? 0;
    // Skip steps that aren't heavier than the last one, or are basically the work weight.
    if (w <= prev || w >= workWeight - step / 2 || (equipment === 'barbell' && w < bar)) continue;
    out.push({ weight: w, reps });
  }
  return out;
}
