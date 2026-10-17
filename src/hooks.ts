// React hooks that read from the database and re-render when data changes.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import type { Exercise, Template } from './db/types';

export const useSettings = () => useLiveQuery(() => db.settings.get('main'));
// Show templates in rotation order (Upper, Lower, Push, Pull, Legs).
const ORDER = ['upper', 'lower', 'push', 'pull', 'legs'];
const rank = (id: string) => (ORDER.includes(id) ? ORDER.indexOf(id) : ORDER.length);
export const useTemplates = () =>
  useLiveQuery(async () => (await db.templates.toArray()).sort((a, b) => rank(a.id) - rank(b.id)), [], [] as Template[]);
export const useExercises = () => useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[]);
export const useWorkouts = () => useLiveQuery(() => db.workouts.toArray());
/** The workout you started but haven't finished (if any). */
export const useActiveWorkout = () =>
  useLiveQuery(async () => (await db.workouts.filter((w) => !w.finishedAt).toArray())[0] ?? null);

export function byId<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]));
}
