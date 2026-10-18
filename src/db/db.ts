// The on-device database (IndexedDB via Dexie). Nothing ever leaves the phone.
import Dexie, { type Table } from 'dexie';
import type { BodyweightEntry, Exercise, Settings, Template, Workout } from './types';
import { buildExercises, buildSettings, buildTemplates } from './seed';
import { buildDemoData } from './demo';
import { todayStr } from '../logic/dates';

// ---------- Tutorial mode ----------
// During the tutorial the app opens a separate "demo" database full of
// sample data. Finishing the tutorial deletes it and reloads the app with
// your real database, which the tutorial never touches.
const REAL_DB = 'gym-companion';
const DEMO_DB = 'gym-companion-demo';
const TUTORIAL_FLAG = 'gym-tutorial-active';
const TUTORIAL_SEEN = 'gym-tutorial-seen';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export const isTutorial = readFlag(TUTORIAL_FLAG);
export const tutorialSeen = () => readFlag(TUTORIAL_SEEN);

class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<Template, string>;
  workouts!: Table<Workout, number>;
  bodyweight!: Table<BodyweightEntry, string>;
  settings!: Table<Settings, string>;

  constructor(name: string) {
    super(name);
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

export const db = new GymDB(isTutorial ? DEMO_DB : REAL_DB);

/** On first launch, load the preloaded program (or the tutorial's sample data). */
db.on('populate', (tx) => {
  if (isTutorial) {
    const demo = buildDemoData(todayStr());
    tx.table('exercises').bulkAdd(demo.exercises);
    tx.table('templates').bulkAdd(demo.templates);
    tx.table('settings').add(demo.settings);
    tx.table('workouts').bulkAdd(demo.workouts);
    tx.table('bodyweight').bulkAdd(demo.bodyweight);
    return;
  }
  tx.table('exercises').bulkAdd(buildExercises());
  tx.table('templates').bulkAdd(buildTemplates());
  tx.table('settings').add(buildSettings(todayStr()));
});

// Outside the tutorial, remove any leftover sample data. Doing it at startup
// (instead of when the tour ends) means nothing is still connected to it.
if (!isTutorial) void Dexie.delete(DEMO_DB).catch(() => {});

/** Switch to the sample-data database and reload. */
export function startTutorial(): void {
  try {
    localStorage.setItem(TUTORIAL_FLAG, '1');
    localStorage.removeItem('rest-timer');
  } catch {
    return; // storage blocked: can't run the tutorial safely
  }
  location.reload();
}

/** Leave the tutorial: back to your real data; the sample data is deleted on reload. */
export function endTutorial(): void {
  try {
    localStorage.removeItem(TUTORIAL_FLAG);
    localStorage.setItem(TUTORIAL_SEEN, '1');
    localStorage.removeItem('rest-timer');
  } catch {
    /* ignore */
  }
  location.reload();
}

/** First launch ever: mark the tour as seen and start it. */
export function maybeAutoStartTutorial(): boolean {
  if (isTutorial || tutorialSeen()) return false;
  try {
    localStorage.setItem(TUTORIAL_SEEN, '1');
  } catch {
    return false; // can't remember it -> don't risk a loop
  }
  startTutorial();
  return true;
}

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
