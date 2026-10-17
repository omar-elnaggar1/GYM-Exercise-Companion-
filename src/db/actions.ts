// Everything that changes data lives here, so screens stay simple.
import { db, getSettings, updateSettings } from './db';
import type { Exercise, LoggedSet, Workout, WorkoutEntry } from './types';
import { advanceAfterWorkout, findSlotFor, resolveRotation } from '../logic/rotation';
import { prefillSets } from '../logic/progression';
import { todayStr } from '../logic/dates';

export const DEFAULT_REST_FIRST = 150;
export const DEFAULT_REST_OTHER = 90;

export interface LastPerf {
  date: string;
  sets: LoggedSet[];
  note: string;
}

/**
 * For every exercise: what you did the last time you trained it.
 * Normal (non-deload) workouts win, so a deload week doesn't reset your
 * "last time" weights.
 */
export function lastPerformanceMap(workouts: Workout[], excludeId?: number): Map<string, LastPerf> {
  const finished = workouts
    .filter((w) => w.finishedAt && w.id !== excludeId)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
  const map = new Map<string, LastPerf>();
  for (const pass of [false, true]) {
    for (const w of finished) {
      if (w.deload !== pass) continue;
      for (const e of w.entries) {
        if (map.has(e.exerciseId) || !e.sets.some((s) => s.done)) continue;
        map.set(e.exerciseId, { date: w.date, sets: e.sets, note: e.note });
      }
    }
  }
  return map;
}

/** The note from the last finished workout of this template. */
export function lastWorkoutNote(workouts: Workout[], templateId: string): string {
  const last = workouts
    .filter((w) => w.finishedAt && w.templateId === templateId)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))[0];
  return last?.note ?? '';
}

function buildEntry(
  ex: Exercise,
  item: { sets: number; repMin: number; repMax: number },
  restSeconds: number,
  last: LastPerf | undefined,
  deload: boolean,
): WorkoutEntry {
  return {
    exerciseId: ex.id,
    repMin: item.repMin,
    repMax: item.repMax,
    restSeconds,
    note: '',
    sets: prefillSets({
      lastSets: last?.sets ?? null,
      plannedSets: item.sets,
      repMin: item.repMin,
      repMax: item.repMax,
      increment: ex.increment,
      deload,
    }),
  };
}

export async function startWorkout(templateId: string, deload: boolean): Promise<number> {
  const [settings, template, exercises, workouts] = await Promise.all([
    getSettings(),
    db.templates.get(templateId),
    db.exercises.toArray(),
    db.workouts.toArray(),
  ]);
  if (!template) throw new Error('Template not found');
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const last = lastPerformanceMap(workouts);
  const today = todayStr();
  const state = resolveRotation(settings.rotationState, settings.rotation, today);

  const entries = template.items.flatMap((item, i) => {
    const ex = exMap.get(item.exerciseId);
    if (!ex) return [];
    const rest = item.restSeconds ?? (i === 0 ? DEFAULT_REST_FIRST : DEFAULT_REST_OTHER);
    return [buildEntry(ex, item, rest, last.get(ex.id), deload)];
  });

  return db.workouts.add({
    date: today,
    templateId,
    slotIndex: findSlotFor(state, settings.rotation, templateId),
    startedAt: Date.now(),
    deload,
    note: '',
    entries,
  });
}

export async function saveWorkout(w: Workout): Promise<void> {
  await db.workouts.put(w);
}

export async function finishWorkout(w: Workout): Promise<void> {
  const settings = await getSettings();
  const state = resolveRotation(settings.rotationState, settings.rotation, w.date);
  await db.transaction('rw', db.workouts, db.settings, async () => {
    await db.workouts.put({ ...w, finishedAt: Date.now() });
    await updateSettings({
      rotationState: advanceAfterWorkout(state, settings.rotation, w.templateId, w.date),
      // The first workout ever starts the first training block.
      deloadCycleStart: settings.deloadCycleStart ?? w.date,
    });
  });
}

export async function deleteWorkout(id: number): Promise<void> {
  await db.workouts.delete(id);
}

/**
 * Swap an exercise in the current workout for an alternative.
 * permanent = also change the template for future sessions.
 */
export async function swapExercise(workoutId: number, entryIndex: number, newId: string, permanent: boolean): Promise<void> {
  const w = await db.workouts.get(workoutId);
  if (!w?.entries[entryIndex]) return;
  const [newEx, oldEx, workouts] = await Promise.all([
    db.exercises.get(newId),
    db.exercises.get(w.entries[entryIndex].exerciseId),
    db.workouts.toArray(),
  ]);
  if (!newEx) return;
  const old = w.entries[entryIndex];
  // Switching between timed (plank) and rep-based: pick a sensible range.
  let { repMin, repMax } = old;
  if (!!newEx.timed !== !!oldEx?.timed) [repMin, repMax] = newEx.timed ? [30, 60] : [10, 15];
  const plannedSets = Math.max(old.sets.length, 1);
  const entry = buildEntry(newEx, { sets: plannedSets, repMin, repMax }, old.restSeconds, lastPerformanceMap(workouts, w.id).get(newId), w.deload);
  const entries = w.entries.map((e, i) => (i === entryIndex ? entry : e));
  await db.workouts.put({ ...w, entries });

  if (permanent) {
    const t = await db.templates.get(w.templateId);
    if (t) {
      const idx = t.items.findIndex((it) => it.exerciseId === old.exerciseId);
      if (idx >= 0) {
        const items = t.items.map((it, i) => (i === idx ? { ...it, exerciseId: newId, repMin, repMax } : it));
        await db.templates.put({ ...t, items });
      }
    }
  }
}

// ---------- Backup ----------

const BACKUP_APP = 'gym-companion';

export async function exportAll(): Promise<string> {
  const data = {
    app: BACKUP_APP,
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: await db.exercises.toArray(),
    templates: await db.templates.toArray(),
    workouts: await db.workouts.toArray(),
    bodyweight: await db.bodyweight.toArray(),
    settings: await db.settings.toArray(),
  };
  return JSON.stringify(data, null, 1);
}

/** Replaces ALL data with the backup. Throws a readable error if invalid. */
export async function importAll(json: string): Promise<void> {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const keys = ['exercises', 'templates', 'workouts', 'bodyweight', 'settings'] as const;
  if (data.app !== BACKUP_APP || !keys.every((k) => Array.isArray(data[k]))) {
    throw new Error('That file is not a Gym Companion backup.');
  }
  await db.transaction('rw', [db.exercises, db.templates, db.workouts, db.bodyweight, db.settings], async () => {
    for (const k of keys) {
      await db.table(k).clear();
      await db.table(k).bulkPut(data[k] as object[]);
    }
  });
}

/** Change the workout safely: read the latest copy, apply `fn`, save. */
export async function mutateWorkout(id: number, fn: (w: Workout) => Workout): Promise<void> {
  await db.transaction('rw', db.workouts, async () => {
    const cur = await db.workouts.get(id);
    if (cur) await db.workouts.put(fn(cur));
  });
}
