// Deload weeks: after every N weeks of training, suggest an easier week.
import { addDays, daysBetween } from './dates';

export interface DeloadState {
  deloadEveryWeeks: number;
  deloadCycleStart: string | null;
  deloadUntil: string | null;
}

export type DeloadStatus =
  | { kind: 'none'; weeksIn: number }
  | { kind: 'due' }
  | { kind: 'active'; daysLeft: number };

export function deloadStatus(s: DeloadState, today: string): DeloadStatus {
  if (s.deloadUntil && daysBetween(today, s.deloadUntil) > 0) {
    return { kind: 'active', daysLeft: daysBetween(today, s.deloadUntil) };
  }
  if (!s.deloadCycleStart) return { kind: 'none', weeksIn: 0 };
  const days = daysBetween(s.deloadCycleStart, today);
  if (days >= s.deloadEveryWeeks * 7) return { kind: 'due' };
  return { kind: 'none', weeksIn: Math.floor(days / 7) };
}

/** Accept: deload runs 7 days from today, the next block starts after it. */
export function acceptDeload(today: string): Pick<DeloadState, 'deloadCycleStart' | 'deloadUntil'> {
  const until = addDays(today, 7);
  return { deloadUntil: until, deloadCycleStart: until };
}

/** Skip: start a fresh block today (asked again in N weeks). */
export function skipDeload(today: string): Pick<DeloadState, 'deloadCycleStart' | 'deloadUntil'> {
  return { deloadUntil: null, deloadCycleStart: today };
}
