// The on-device database (IndexedDB via Dexie). Nothing ever leaves the phone.
import Dexie, { type Table } from 'dexie';
import type { BodyweightEntry, Exercise, Settings, Template, Workout } from './types';
import { buildExercises, buildSettings, buildTemplates } from './seed';
import { todayStr } from '../logic/dates';

class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<Template, string>;
  workouts!: Table<Workout, number>;
  bodyweight!: Table<BodyweightEntry, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('gym-companion');
    // Only indexed fields are listed here; everything else is stored too.
    this.version(1).stores({
      exercises: 'id',
      templates: 'id',
      workouts: '++id, date, finishedAt',
      bodyweight: 'date',
      settings: 'id',
    });
  }
}

export const db = new GymDB();

/** On first launch, load the preloaded program. */
db.on('populate', (tx) => {
  tx.table('exercises').bulkAdd(buildExercises());
  tx.table('templates').bulkAdd(buildTemplates());
  tx.table('settings').add(buildSettings(todayStr()));
});

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('main');
  if (s) return s;
  const fresh = buildSettings(todayStr());
  await db.settings.put(fresh);
  return fresh;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.update('main', patch);
}

/** Ask the browser not to wipe our data when storage is low. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* not supported - fine */
  }
}
