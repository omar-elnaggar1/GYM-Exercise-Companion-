// Streak = how many planned sessions in a row you've completed on time.
// Rest days in the rotation never break it: after a session that is followed
// by N rest slots, you may have N idle days before the next workout.
import type { Slot } from '../db/types';
import { daysBetween } from './dates';

export interface StreakWorkout {
  date: string;
  slotIndex: number;
}

/** Number of rest slots straight after `slotIndex` in the rotation. */
export function restDaysAfter(rotation: Slot[], slotIndex: number): number {
  let n = 0;
  for (let k = 1; k < rotation.length; k++) {
    if (rotation[(slotIndex + k) % rotation.length] !== 'rest') break;
    n++;
  }
  return n;
}

export function computeStreak(workouts: StreakWorkout[], rotation: Slot[], today: string): number {
  // Only one workout per day counts; keep the last one of each day.
  const byDay = new Map<string, StreakWorkout>();
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    if (w.slotIndex >= 0) byDay.set(w.date, w);
  }
  const list = [...byDay.values()];
  if (list.length === 0) return 0;

  let streak = 0;
  for (let i = 0; i < list.length; i++) {
    if (i === 0) {
      streak = 1;
      continue;
    }
    const idle = daysBetween(list[i - 1].date, list[i].date) - 1;
    streak = idle <= restDaysAfter(rotation, list[i - 1].slotIndex) ? streak + 1 : 1;
  }

  // Has the streak already broken since the last workout? Today itself
  // doesn't count as missed - you still have time to train.
  const last = list[list.length - 1];
  const idleSince = daysBetween(last.date, today) - 1;
  if (idleSince > restDaysAfter(rotation, last.slotIndex)) return 0;
  return streak;
}
