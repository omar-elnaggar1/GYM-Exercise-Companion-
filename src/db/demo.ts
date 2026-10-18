// Sample data for the tutorial: ~6 weeks of made-up workouts and weigh-ins.
// It lives in a SEPARATE database that is deleted when the tutorial ends,
// so it can never mix with your real data.
import type { BodyweightEntry, Exercise, LoggedSet, Settings, Template, Workout } from './types';
import { buildExercises, buildSettings, buildTemplates } from './seed';
import { advanceAfterWorkout, findSlotFor, todayStatus } from '../logic/rotation';
import { addDays } from '../logic/dates';

export interface DemoData {
  exercises: Exercise[];
  templates: Template[];
  settings: Settings;
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
}

const BASE_KG: Record<Exercise['equipment'], number> = {
  barbell: 40,
  dumbbell: 12,
  machine: 35,
  cable: 20,
  bodyweight: 0,
};

const at = (date: string, hour: number) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime();

function simulate(today: string, daysBack: number): DemoData {
  const exercises = buildExercises();
  const templates = buildTemplates();
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const start = addDays(today, -daysBack);
  const settings = buildSettings(start);
  const rot = settings.rotation;
  let state = { index: 0, since: start };
  const timesDone = new Map<string, number>();
  const workouts: Workout[] = [];

  for (let d = 0; d < daysBack; d++) {
    const date = addDays(start, d);
    if (d === 9) continue; // one missed day, so the streak isn't the whole history
    const status = todayStatus(state, rot, date);
    if (status.kind !== 'train') continue;
    const t = templates.find((x) => x.id === status.slot)!;
    const entries = t.items.map((item) => {
      const ex = exMap.get(item.exerciseId)!;
      const k = timesDone.get(ex.id) ?? 0;
      timesDone.set(ex.id, k + 1);
      // Every 2nd session hits the top of the range, then the weight goes up.
      const topSession = k % 2 === 1;
      const weight = ex.timed ? 0 : BASE_KG[ex.equipment] + ex.increment * Math.floor(k / 2);
      const sets: LoggedSet[] = Array.from({ length: item.sets }, (_, i) => ({
        weight,
        reps: ex.timed
          ? Math.min(item.repMax, item.repMin + 5 * k)
          : topSession
            ? item.repMax
            : Math.max(item.repMin, item.repMax - 1 - i),
        done: true,
      }));
      return { exerciseId: ex.id, repMin: item.repMin, repMax: item.repMax, restSeconds: 90, sets, note: '' };
    });
    workouts.push({
      id: workouts.length + 1,
      date,
      templateId: t.id,
      slotIndex: findSlotFor(state, rot, t.id),
      startedAt: at(date, 18),
      finishedAt: at(date, 19),
      deload: false,
      note: '',
      entries,
    });
    state = advanceAfterWorkout(state, rot, t.id, date);
  }

  // A couple of notes so "last time" notes show up.
  const lastUpper = [...workouts].reverse().find((w) => w.templateId === 'upper');
  if (lastUpper) lastUpper.entries[0].note = 'Shoulder felt a bit off - warm up longer';
  if (workouts.length > 2) workouts[workouts.length - 2].note = 'Great session, gym was quiet';

  const bodyweight: BodyweightEntry[] = Array.from({ length: daysBack }, (_, i) => ({
    date: addDays(start, i + 1),
    kg: Math.round((80 - i * 0.06 + Math.sin(i * 1.7) * 0.5) * 10) / 10,
  }));

  return {
    exercises,
    templates,
    workouts,
    bodyweight,
    settings: {
      ...settings,
      rotationState: state,
      // Started 6 weeks ago, so the "deload suggested" banner shows.
      deloadCycleStart: start,
    },
  };
}

/** Builds sample data where today is a training day (so the tour has something to show). */
export function buildDemoData(today: string): DemoData {
  for (let back = 42; back < 50; back++) {
    const data = simulate(today, back);
    if (todayStatus(data.settings.rotationState, data.settings.rotation, today).kind === 'train') return data;
  }
  return simulate(today, 42);
}
