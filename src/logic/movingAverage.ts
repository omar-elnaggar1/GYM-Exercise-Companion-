import type { BodyweightEntry } from '../db/types';
import { daysBetween } from './dates';

/** For each entry: the average of all entries in the 7 days ending that day. */
export function movingAverage7(entries: BodyweightEntry[]): number[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((e) => {
    const window = sorted.filter((o) => {
      const d = daysBetween(o.date, e.date);
      return d >= 0 && d < 7;
    });
    return window.reduce((sum, o) => sum + o.kg, 0) / window.length;
  });
}
