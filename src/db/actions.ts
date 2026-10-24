// Everything that changes data lives here, so screens stay simple.
import { db, getSettings, updateSettings } from './db';
import type { Exercise, LoggedSet, Slot, Template, Workout, WorkoutEntry } from './types';
import { DEFAULT_INCREMENT, DEFAULT_ROTATION, buildTemplates } from './seed';
import { LB_STEP, toKg, type Unit } from '../logic/units';
import { advanceAfterWorkout, findSlotFor, resolveRotation } from '../logic/rotation';
import { prefillSets } from '../logic/progression';
import { addDays, daysBetween, todayStr } from '../logic/dates';

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
export function lastPerformanceMap(workouts: Workout[], excludeId?: number, beforeTs = Infinity): Map<string, LastPerf> {
  const finished = workouts
    // beforeTs: when editing an old workout, "last time" means before it.
    .filter((w) => w.finishedAt && w.id !== excludeId && w.finishedAt < beforeTs)
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
export function lastWorkoutNote(workouts: Workout[], templateId: string, beforeTs = Infinity): string {
  const last = workouts
    .filter((w) => w.finishedAt && w.templateId === templateId && w.finishedAt < beforeTs)
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

/** Today's exercises for a template, pre-filled from what you did before `beforeTs`. */
async function entriesFor(templateId: string, deload: boolean, beforeTs = Infinity): Promise<WorkoutEntry[]> {
  const [template, exercises, workouts] = await Promise.all([
    db.templates.get(templateId),
    db.exercises.toArray(),
    db.workouts.toArray(),
  ]);
  if (!template) throw new Error('Template not found');
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const last = lastPerformanceMap(workouts, undefined, beforeTs);
  return template.items.flatMap((item, i) => {
    const ex = exMap.get(item.exerciseId);
    if (!ex) return [];
    const rest = item.restSeconds ?? (i === 0 ? DEFAULT_REST_FIRST : DEFAULT_REST_OTHER);
    return [buildEntry(ex, item, rest, last.get(ex.id), deload)];
  });
}

export async function startWorkout(templateId: string, deload: boolean): Promise<number> {
  const settings = await getSettings();
  const entries = await entriesFor(templateId, deload);
  const today = todayStr();
  const state = resolveRotation(settings.rotationState, settings.rotation, today);

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

// ---------- Training split ----------

/**
 * Save a new rotation. `nextIndex` = which slot is up next afterwards
 * (the editor works this out so "next session" follows the slot you moved).
 */
export async function saveRotation(rotation: Slot[], nextIndex: number): Promise<void> {
  if (!rotation.some((s) => s !== 'rest')) throw new Error('Your split needs at least one training day.');
  const settings = await getSettings();
  const today = todayStr();
  const cur = resolveRotation(settings.rotationState, settings.rotation, today);
  const index = Math.min(Math.max(nextIndex, 0), rotation.length - 1);
  // Keep "done for today" if it was; otherwise the next slot is due today.
  const since = cur.since > today ? cur.since : today;
  await updateSettings({ rotation, rotationState: { index, since } });
}

export async function createTemplate(name: string, color: string): Promise<string> {
  const id = 'custom-' + Date.now().toString(36);
  await db.templates.add({ id, name, color, items: [] });
  return id;
}

export async function updateTemplate(id: string, patch: Partial<Template>): Promise<void> {
  await db.templates.update(id, patch);
}

/** Delete a session: hide it and take it out of the rotation. History keeps its name. */
export async function archiveTemplate(id: string): Promise<void> {
  const settings = await getSettings();
  const cur = resolveRotation(settings.rotationState, settings.rotation, todayStr());
  const rotation: Slot[] = [];
  let next = 0;
  settings.rotation.forEach((s, i) => {
    if (i === cur.index) next = rotation.length;
    if (s !== id) rotation.push(s);
  });
  if (!rotation.some((s) => s !== 'rest')) throw new Error("You can't delete your only training session.");
  await db.templates.update(id, { archived: true });
  await saveRotation(rotation, next % rotation.length);
}

/** Put back the original Upper/Lower/Rest/Push/Pull/Legs/Rest split. */
export async function restoreDefaultSplit(): Promise<void> {
  const defaults = buildTemplates();
  for (const t of defaults) {
    const existing = await db.templates.get(t.id);
    if (!existing) await db.templates.add(t);
    else if (existing.archived) await db.templates.update(t.id, { archived: false });
  }
  await saveRotation([...DEFAULT_ROTATION], 0);
}

// ---------- Past workouts ----------

/** A timestamp on that day: now for today, midday for earlier days. */
function stampFor(date: string): number {
  if (date === todayStr()) return Date.now();
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

/**
 * Log a workout you did but didn't record (e.g. forgot your phone).
 * countInRotation = it replaces a planned session, so the rotation moves on.
 * Returns the new workout id, ready to edit.
 */
export async function logPastWorkout(templateId: string, date: string, countInRotation: boolean): Promise<number> {
  const settings = await getSettings();
  const finishedAt = stampFor(date);
  const entries = await entriesFor(templateId, false, finishedAt);
  const id = await db.workouts.add({
    date,
    templateId,
    slotIndex: settings.rotation.indexOf(templateId),
    startedAt: finishedAt - 60 * 60_000,
    finishedAt,
    deload: false,
    note: '',
    entries,
  });
  const patch: Partial<typeof settings> = {};
  if (!settings.deloadCycleStart || date < settings.deloadCycleStart) patch.deloadCycleStart = date;
  if (countInRotation) {
    const state = resolveRotation(settings.rotationState, settings.rotation, todayStr());
    const next = advanceAfterWorkout(state, settings.rotation, templateId, date);
    // Never move "due" into the past beyond today: a training day waits for you.
    patch.rotationState = { index: next.index, since: next.since > todayStr() ? next.since : todayStr() };
  }
  await updateSettings(patch);
  return id;
}

/** Move a finished workout to another day (keeps its duration). */
export async function setWorkoutDate(id: number, date: string): Promise<void> {
  await mutateWorkout(id, (w) => {
    const shift = daysBetween(w.date, date) * 86_400_000;
    return {
      ...w,
      date,
      startedAt: w.startedAt + shift,
      finishedAt: w.finishedAt !== undefined ? w.finishedAt + shift : undefined,
    };
  });
}

export async function markAllSetsDone(id: number): Promise<void> {
  await mutateWorkout(id, (w) => ({
    ...w,
    entries: w.entries.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: true })) })),
  }));
}

// ---------- Backup reminder ----------

export async function markBackedUp(): Promise<void> {
  await updateSettings({ lastBackup: todayStr(), backupSnoozedUntil: undefined });
}

export async function snoozeBackupReminder(days = 3): Promise<void> {
  await updateSettings({ backupSnoozedUntil: addDays(todayStr(), days) });
}

// ---------- Units & bar weight ----------

/**
 * Switch an exercise between kg and lb. Weights stay stored in kg; only
 * how you enter/see them changes. The weight jump and bar reset to the
 * usual ones for that unit (5 lb / your kg default).
 */
export async function setExerciseUnit(id: string, unit: Unit): Promise<void> {
  const ex = await db.exercises.get(id);
  if (!ex || (ex.unit ?? 'kg') === unit) return;
  await db.exercises.update(id, {
    unit,
    increment: unit === 'lb' ? toKg(LB_STEP, 'lb') : DEFAULT_INCREMENT[ex.equipment],
    barWeight: undefined,
  });
}

/** Empty bar for one exercise, in kg (undefined = use the default). */
export async function setExerciseBar(id: string, kg: number | undefined): Promise<void> {
  await db.exercises.update(id, { barWeight: kg });
}
