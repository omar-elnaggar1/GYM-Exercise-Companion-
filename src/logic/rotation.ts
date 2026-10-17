// Which session is next? The rotation ignores weekdays:
// - A training slot stays "up next" until you finish that workout.
// - A rest slot lasts one calendar day, then moves on by itself.
import type { RotationState, Slot } from '../db/types';
import { addDays, daysBetween } from './dates';

/** Move past any rest days that are already over. */
export function resolveRotation(state: RotationState, rotation: Slot[], today: string): RotationState {
  let { index, since } = state;
  // Guard: rotation may have been edited to be shorter.
  index = ((index % rotation.length) + rotation.length) % rotation.length;
  let guard = 0;
  while (rotation[index] === 'rest' && daysBetween(since, today) > 0 && guard++ < rotation.length * 2) {
    index = (index + 1) % rotation.length;
    since = addDays(since, 1);
  }
  return { index, since };
}

/**
 * Find the rotation slot a workout of `templateId` fulfils, searching forward
 * from the current slot (so training on a rest day uses the next session).
 * Returns -1 if the template isn't in the rotation.
 */
export function findSlotFor(state: RotationState, rotation: Slot[], templateId: string): number {
  for (let k = 0; k < rotation.length; k++) {
    const i = (state.index + k) % rotation.length;
    if (rotation[i] === templateId) return i;
  }
  return -1;
}

/** After finishing a workout on `date`, the slot after it becomes due tomorrow. */
export function advanceAfterWorkout(
  state: RotationState,
  rotation: Slot[],
  templateId: string,
  date: string,
): RotationState {
  const slot = findSlotFor(state, rotation, templateId);
  if (slot === -1) return state; // off-plan workout: rotation unchanged
  return { index: (slot + 1) % rotation.length, since: addDays(date, 1) };
}

/** What the Today screen should show. */
export type TodayStatus =
  | { kind: 'train'; slot: Slot; index: number }
  | { kind: 'rest'; index: number }
  /** Today's planned session is done; `index` is the next one. */
  | { kind: 'done'; index: number };

export function todayStatus(state: RotationState, rotation: Slot[], today: string): TodayStatus {
  const r = resolveRotation(state, rotation, today);
  if (daysBetween(today, r.since) > 0) return { kind: 'done', index: r.index };
  const slot = rotation[r.index];
  return slot === 'rest' ? { kind: 'rest', index: r.index } : { kind: 'train', slot, index: r.index };
}

/** The next training template from a slot (skipping rest days). */
export function nextTrainingSlot(rotation: Slot[], fromIndex: number): number {
  for (let k = 0; k < rotation.length; k++) {
    const i = (fromIndex + k) % rotation.length;
    if (rotation[i] !== 'rest') return i;
  }
  return -1;
}
