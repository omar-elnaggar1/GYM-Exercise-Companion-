// Progress maths: estimated 1-rep max, per-exercise history, personal
// records, biggest improvements and weekly volume. All pure functions.
import type { Exercise, LoggedSet, Workout } from '../db/types';
import { addDays, daysBetween } from './dates';

/** Estimated 1-rep max (Epley formula). 60 kg × 10 ≈ 80 kg. */
export function e1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/**
 * What "better" means for an exercise:
 * - e1rm: weighted lifts (estimated 1-rep max)
 * - reps: bodyweight moves done without extra weight
 * - seconds: timed holds like the plank
 */
export type Metric = 'e1rm' | 'reps' | 'seconds';

export const METRIC_LABEL: Record<Metric, string> = { e1rm: 'Est. 1-rep max (kg)', reps: 'Best reps', seconds: 'Best hold (s)' };

export function setValue(s: LoggedSet, metric: Metric): number {
  return metric === 'e1rm' ? e1rm(s.weight, s.reps) : s.reps;
}

export interface SessionPoint {
  date: string;
  workoutId: number;
  /** Best value of the session by the exercise's metric. */
  value: number;
  /** The set that gave that value. */
  top: LoggedSet;
  /** Sum of weight × reps over done sets. */
  volume: number;
  sets: LoggedSet[];
}

/** Finished, non-deload workouts oldest first (deloads would look like a dip). */
function chronological(workouts: Workout[]): Workout[] {
  return workouts
    .filter((w) => w.finishedAt && !w.deload)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
}

function doneSetsFor(w: Workout, exerciseId: string): LoggedSet[] {
  return w.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter((s) => s.done));
}

export function metricFor(ex: Pick<Exercise, 'id' | 'timed' | 'equipment'>, workouts: Workout[]): Metric {
  if (ex.timed) return 'seconds';
  if (ex.equipment !== 'bodyweight') return 'e1rm';
  // Bodyweight moves count reps, until you start adding weight (e.g. a dip belt).
  const anyWeight = workouts.some((w) => doneSetsFor(w, ex.id).some((s) => s.weight > 0));
  return anyWeight ? 'e1rm' : 'reps';
}

function bestSet(sets: LoggedSet[], metric: Metric): LoggedSet {
  // Ties go to the heavier set.
  return sets.reduce((a, b) => {
    const d = setValue(b, metric) - setValue(a, metric);
    return d > 1e-9 || (Math.abs(d) <= 1e-9 && b.weight > a.weight) ? b : a;
  });
}

/** One point per session where the exercise was done. */
export function exerciseSeries(workouts: Workout[], ex: Pick<Exercise, 'id' | 'timed' | 'equipment'>): SessionPoint[] {
  const metric = metricFor(ex, workouts);
  return chronological(workouts).flatMap((w) => {
    const sets = doneSetsFor(w, ex.id);
    if (sets.length === 0) return [];
    const top = bestSet(sets, metric);
    return [{
      date: w.date,
      workoutId: w.id!,
      value: setValue(top, metric),
      top,
      volume: sets.reduce((n, s) => n + s.weight * s.reps, 0),
      sets,
    }];
  });
}

export interface PRRecord {
  metric: Metric;
  best: { value: number; set: LoggedSet; date: string };
  heaviest: { weight: number; reps: number; date: string };
  sessions: number;
  lastDate: string;
}

export type PRKind = 'best' | 'heaviest';

export interface PREvent {
  date: string;
  workoutId: number;
  exerciseId: string;
  set: LoggedSet;
  kinds: PRKind[];
}

/**
 * Walk through history and note every time a record was beaten.
 * The first session of an exercise sets the baseline (not a PR).
 */
export function findPRs(workouts: Workout[], exercises: Exercise[]): { records: Map<string, PRRecord>; events: PREvent[] } {
  const records = new Map<string, PRRecord>();
  const events: PREvent[] = [];
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const metrics = new Map<string, Metric>();
  const metricOf = (id: string) => {
    if (!metrics.has(id)) metrics.set(id, metricFor(exMap.get(id) ?? { id, equipment: 'barbell' }, workouts));
    return metrics.get(id)!;
  };

  for (const w of chronological(workouts)) {
    const ids = [...new Set(w.entries.map((e) => e.exerciseId))];
    for (const id of ids) {
      const sets = doneSetsFor(w, id);
      if (sets.length === 0) continue;
      const metric = metricOf(id);
      const top = bestSet(sets, metric);
      const value = setValue(top, metric);
      const heavy = sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
      const rec = records.get(id);
      if (!rec) {
        records.set(id, {
          metric,
          best: { value, set: top, date: w.date },
          heaviest: { weight: heavy.weight, reps: heavy.reps, date: w.date },
          sessions: 1,
          lastDate: w.date,
        });
        continue;
      }
      const kinds: PRKind[] = [];
      if (value > rec.best.value + 1e-9) {
        kinds.push('best');
        rec.best = { value, set: top, date: w.date };
      }
      if (metric === 'e1rm' && heavy.weight > rec.heaviest.weight) {
        kinds.push('heaviest');
        rec.heaviest = { weight: heavy.weight, reps: heavy.reps, date: w.date };
      } else if (heavy.weight === rec.heaviest.weight && heavy.reps > rec.heaviest.reps) {
        // Same top weight for more reps: keep the better set (the e1RM PR covers it).
        rec.heaviest = { weight: heavy.weight, reps: heavy.reps, date: w.date };
      }
      rec.sessions++;
      rec.lastDate = w.date;
      if (kinds.length) events.push({ date: w.date, workoutId: w.id!, exerciseId: id, set: kinds[0] === 'best' ? top : heavy, kinds });
    }
  }
  return { records, events };
}

/** Would this set beat the record? (used live during a workout) */
export function isSetPR(s: LoggedSet, rec: PRRecord | undefined): boolean {
  if (!rec || !s.done) return false;
  if (setValue(s, rec.metric) > rec.best.value + 1e-9) return true;
  return rec.metric === 'e1rm' && s.weight > rec.heaviest.weight;
}

export interface Improvement {
  exerciseId: string;
  metric: Metric;
  first: number;
  last: number;
  change: number;
  pct: number;
  sessions: number;
}

/** Exercises ranked by how much they improved (first vs latest session). */
export function improvements(workouts: Workout[], exercises: Exercise[], minSessions = 3): Improvement[] {
  return exercises
    .flatMap((ex) => {
      const s = exerciseSeries(workouts, ex);
      if (s.length < minSessions || s[0].value <= 0) return [];
      const first = s[0].value;
      const last = s[s.length - 1].value;
      return [{ exerciseId: ex.id, metric: metricFor(ex, workouts), first, last, change: last - first, pct: ((last - first) / first) * 100, sessions: s.length }];
    })
    .sort((a, b) => b.pct - a.pct);
}

/** Monday of the week a date falls in. */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

export interface WeekVolume {
  weekStart: string;
  volume: number;
  sessions: number;
}

/** Total kg lifted (weight × reps) per week, for the last `weeks` weeks. */
export function weeklyVolume(workouts: Workout[], today: string, weeks = 8): WeekVolume[] {
  const thisWeek = weekStart(today);
  const out: WeekVolume[] = Array.from({ length: weeks }, (_, i) => ({
    weekStart: addDays(thisWeek, -7 * (weeks - 1 - i)),
    volume: 0,
    sessions: 0,
  }));
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    const idx = (weeks - 1) - Math.round(daysBetween(weekStart(w.date), thisWeek) / 7);
    if (idx < 0 || idx >= weeks) continue;
    out[idx].sessions++;
    for (const e of w.entries) for (const s of e.sets) if (s.done) out[idx].volume += s.weight * s.reps;
  }
  return out;
}

export function workoutVolume(w: Workout): number {
  return w.entries.reduce((n, e) => n + e.sets.reduce((m, s) => m + (s.done ? s.weight * s.reps : 0), 0), 0);
}

/** "62.5 kg × 8", "BW × 12", "45 s" */
export function fmtSet(s: LoggedSet, metric: Metric): string {
  if (metric === 'seconds') return `${s.reps} s`;
  return s.weight > 0 ? `${Math.round(s.weight * 4) / 4} kg × ${s.reps}` : `BW × ${s.reps}`;
}

export function fmtValue(v: number, metric: Metric): string {
  if (metric === 'e1rm') return `${Math.round(v * 2) / 2} kg`;
  return metric === 'seconds' ? `${Math.round(v)} s` : `${Math.round(v)} reps`;
}

/** "12.4 t" for big numbers, "850 kg" for small. */
export function fmtVolume(kg: number): string {
  return kg >= 10_000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg).toLocaleString()} kg`;
}
