// The workout logger. Every tap is saved to the phone immediately.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise, LoggedSet, Settings, Workout, WorkoutEntry } from '../db/types';
import { byId, useExercises, useTemplates } from '../hooks';
import {
  deleteWorkout,
  finishWorkout,
  setExerciseBar,
  setExerciseUnit,
  lastPerformanceMap,
  lastWorkoutNote,
  markAllSetsDone,
  mutateWorkout,
  setWorkoutDate,
  swapExercise,
  type LastPerf,
} from '../db/actions';
import { fmtKg, formatLast, suggestProgression } from '../logic/progression';
import { formatNiceDate, todayStr } from '../logic/dates';
import { warmupSets, type WarmupSet } from '../logic/warmup';
import { unlockAudio } from '../logic/alerts';
import { useWakeLock } from '../useWakeLock';
import { findPRs, fmtSet, isSetPR, type PRRecord } from '../logic/progress';
import { PLATES, PLATES_LB, PLATE_COLOR, PLATE_COLOR_LB, platesPerSide } from '../logic/plates';
import { BAR_OPTIONS, LB_STEP, barKgFor, fmtNum, fmtWeight, fromKg, toKg, unitOf, type Unit } from '../logic/units';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { NoteField } from '../components/NoteField';

interface Props {
  workout: Workout | null;
  settings: Settings;
  workouts: Workout[];
  onStartRest: (seconds: number, label: string) => void;
  onClose: () => void;
  /** Called with the workout id after Finish (to show the summary). */
  onFinished: (id: number) => void;
  onGoToday: () => void;
  /** 'edit' = fixing a finished workout from History (no timer, no Finish). */
  mode?: 'live' | 'edit';
  onDone?: () => void;
}

export function WorkoutScreen({ workout, settings, workouts, onStartRest, onClose, onFinished, onGoToday, mode = 'live', onDone }: Props) {
  const isEdit = mode === 'edit';
  const exercises = byId(useExercises());
  const templates = byId(useTemplates());
  const [editing, setEditing] = useState<{ entry: number; set: number } | null>(null);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  useWakeLock(settings.keepAwake && !!workout && !isEdit);
  // Your records BEFORE this workout, to spot new PRs as you tick sets.
  // (When editing an old workout, only what came before it counts.)
  const exList = useExercises();
  const beforeTs = isEdit ? workout?.finishedAt ?? Infinity : Infinity;
  const records = useMemo(
    () => findPRs(workouts.filter((w) => w.id !== workout?.id && (w.finishedAt ?? 0) < beforeTs), exList).records,
    [workouts, exList, workout?.id, beforeTs],
  );
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  const elapsed = useElapsed(workout?.startedAt);

  if (!workout) {
    return (
      <div className="center" style={{ paddingTop: 60 }}>
        <h1>No workout running</h1>
        <p className="muted">Start one from the Today tab.</p>
        <button className="primary big" onClick={onGoToday}>Go to Today</button>
      </div>
    );
  }

  const id = workout.id!;
  const template = templates.get(workout.templateId);
  const last = lastPerformanceMap(workouts, id, beforeTs);
  const prevNote = lastWorkoutNote(workouts.filter((w) => w.id !== id), workout.templateId, beforeTs);
  const defaultBar = settings.barWeight ?? 20;
  // Warm-ups: for the first weighted exercise, and for every barbell lift.
  const firstWeighted = workout.entries.findIndex((e) => {
    const ex = exercises.get(e.exerciseId);
    return ex && ex.equipment !== 'bodyweight' && !ex.timed;
  });
  const warmupFor = (i: number, ex: Exercise, entry: WorkoutEntry): WarmupSet[] => {
    if (isEdit || workout.deload || (i !== firstWeighted && ex.equipment !== 'barbell')) return [];
    // Worked out in the exercise's own unit, so lb machines get 5 lb steps.
    const unit = unitOf(ex);
    const work = fromKg(Math.max(0, ...entry.sets.map((s) => s.weight)), unit);
    const bar = fromKg(barKgFor(ex, defaultBar), unit);
    const step = unit === 'lb' ? LB_STEP : ex.equipment === 'barbell' ? 2.5 : ex.increment || 2.5;
    return warmupSets(work, ex.equipment, bar, step);
  };

  const updateEntry = (i: number, fn: (e: WorkoutEntry) => WorkoutEntry) =>
    mutateWorkout(id, (w) => ({ ...w, entries: w.entries.map((e, j) => (j === i ? fn(e) : e)) }));
  const updateSet = (i: number, s: number, patch: Partial<LoggedSet>) =>
    updateEntry(i, (e) => ({ ...e, sets: e.sets.map((x, k) => (k === s ? { ...x, ...patch } : x)) }));

  const celebrate = (i: number, set: LoggedSet) => {
    const exId = workout.entries[i].exerciseId;
    const rec = records.get(exId);
    if (!isSetPR({ ...set, done: true }, rec)) return;
    navigator.vibrate?.([80, 60, 80]);
    setToast(`🏆 New PR! ${exercises.get(exId)?.name}: ${fmtSet(set, rec!.metric, unitOf(exercises.get(exId)))}`);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3500);
  };

  const tick = (i: number, s: number) => {
    const set = workout.entries[i].sets[s];
    void updateSet(i, s, { done: !set.done });
    if (!set.done && !isEdit) {
      unlockAudio();
      celebrate(i, set);
      onStartRest(workout.entries[i].restSeconds, exercises.get(workout.entries[i].exerciseId)?.name ?? '');
    }
  };

  const finish = async () => {
    const open = workout.entries.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
    const doneAny = workout.entries.some((e) => e.sets.some((s) => s.done));
    if (!doneAny && !confirm('No sets ticked. Finish anyway?')) return;
    if (doneAny && open > 0 && !confirm(`${open} set${open === 1 ? '' : 's'} not ticked. Finish anyway? (Unticked sets are not counted.)`)) return;
    await finishWorkout(workout);
    onFinished(id);
  };

  const discard = async () => {
    if (!confirm('Delete this workout? Nothing from it will be saved.')) return;
    await deleteWorkout(id);
    onClose();
  };

  // Leaving edit mode: an entry with nothing ticked is probably a mistake.
  const done = async () => {
    const any = workout.entries.some((e) => e.sets.some((s) => s.done));
    if (!any && confirm('No sets are ticked, so this workout is empty. Delete it?')) await deleteWorkout(id);
    onDone?.();
  };

  const edit = editing && workout.entries[editing.entry];
  const editEx = edit ? exercises.get(edit.exerciseId) : undefined;

  return (
    <div>
      <div className="workout-head">
        <div className="row spread">
          <div>
            <h3 style={{ color: template?.color }}>
              {isEdit ? 'Editing: ' : ''}{template?.name ?? 'Workout'} {workout.deload && <span className="chip">Deload</span>}
            </h3>
            <div className="muted small">{formatNiceDate(workout.date)}{isEdit ? '' : ` · ${elapsed}`}</div>
          </div>
          {isEdit ? (
            <button className="primary" onClick={done}>Done ✓</button>
          ) : (
            <button className="primary" onClick={finish}>Finish ✓</button>
          )}
        </div>
      </div>

      {isEdit && (
        <div className="card">
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={workout.date}
              max={todayStr()}
              onChange={(e) => e.target.value && e.target.value <= todayStr() && setWorkoutDate(id, e.target.value)}
            />
          </label>
          <p className="small muted" style={{ margin: '0 0 10px' }}>
            Tap a set to change it, ✓ to count it. Only ticked sets are saved as done. Changes save instantly.
          </p>
          <button className="small" style={{ width: '100%' }} onClick={() => markAllSetsDone(id)}>✓ Tick all sets</button>
        </div>
      )}

      {prevNote && <div className="note-line" style={{ marginBottom: 10 }}>📝 Last time: {prevNote}</div>}

      {workout.entries.map((entry, i) => {
        const ex = exercises.get(entry.exerciseId);
        if (!ex) return null;
        return (
          <ExerciseCard
            key={i + entry.exerciseId}
            entry={entry}
            ex={ex}
            last={last.get(ex.id)}
            record={records.get(ex.id)}
            warmup={warmupFor(i, ex, entry)}
            barDisplay={fromKg(barKgFor(ex, defaultBar), unitOf(ex))}
            deload={workout.deload}
            onTick={(s) => tick(i, s)}
            onEdit={(s) => setEditing({ entry: i, set: s })}
            onAddSet={() =>
              updateEntry(i, (e) => {
                const prev = e.sets[e.sets.length - 1] ?? { weight: 0, reps: e.repMin, done: false };
                return { ...e, sets: [...e.sets, { ...prev, done: false }] };
              })
            }
            onRemoveSet={() => updateEntry(i, (e) => ({ ...e, sets: e.sets.slice(0, -1) }))}
            onSwap={() => setSwapping(i)}
            onNote={(note) => updateEntry(i, (e) => ({ ...e, note }))}
          />
        );
      })}

      <h2>Workout note</h2>
      <NoteField
        value={workout.note}
        placeholder="How did it go? e.g. slept badly, gym was busy…"
        onSave={(note) => mutateWorkout(id, (w) => ({ ...w, note }))}
      />
      <div style={{ height: 16 }} />
      {isEdit ? (
        <button className="primary big" onClick={done}>Done ✓</button>
      ) : (
        <>
          <button className="primary big" onClick={finish}>Finish workout ✓</button>
          <button className="danger ghost" style={{ width: '100%', marginTop: 10 }} onClick={discard}>Discard workout</button>
        </>
      )}

      {editing && edit && editEx && (
        <SetEditor
          ex={editEx}
          defaultBar={defaultBar}
          set={edit.sets[editing.set]}
          index={editing.set}
          onSave={(patch, andTick) => {
            const k = editing.set;
            void updateEntry(editing.entry, (e) => ({
              ...e,
              sets: e.sets.map((x, j) => {
                if (j === k) return { ...x, ...patch, done: andTick || x.done };
                // First time doing this exercise: copy the weight to later empty sets.
                if (j > k && !x.done && x.weight === 0 && patch.weight) return { ...x, weight: patch.weight };
                return x;
              }),
            }));
            if (andTick && !isEdit) {
              unlockAudio();
              celebrate(editing.entry, { ...edit.sets[k], ...patch });
              onStartRest(edit.restSeconds, editEx.name);
            }
            setEditing(null);
          }}
          onDelete={() => {
            void updateEntry(editing.entry, (e) => ({ ...e, sets: e.sets.filter((_, k) => k !== editing.set) }));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

      {swapping !== null && (
        <SwapSheet
          current={exercises.get(workout.entries[swapping].exerciseId)!}
          exercises={exercises}
          last={last}
          onPick={async (newId, permanent) => {
            await swapExercise(id, swapping, newId, permanent);
            setSwapping(null);
          }}
          onClose={() => setSwapping(null)}
        />
      )}
    </div>
  );
}

function useElapsed(startedAt?: number): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  if (!startedAt) return '';
  const min = Math.max(0, Math.floor((now - startedAt) / 60_000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

function ExerciseCard({
  entry,
  ex,
  last,
  record,
  warmup,
  barDisplay,
  deload,
  onTick,
  onEdit,
  onAddSet,
  onRemoveSet,
  onSwap,
  onNote,
}: {
  entry: WorkoutEntry;
  ex: Exercise;
  last?: LastPerf;
  record?: PRRecord;
  warmup: WarmupSet[];
  /** Empty bar in the exercise's unit. */
  barDisplay: number;
  deload: boolean;
  onTick: (s: number) => void;
  onEdit: (s: number) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
  onSwap: () => void;
  onNote: (n: string) => void;
}) {
  const [showNote, setShowNote] = useState(!!entry.note);
  const up = last && !deload ? suggestProgression(last.sets, entry.sets.length, entry.repMax, ex.increment) : null;
  const unit = ex.timed ? 's' : 'reps';
  const wu = unitOf(ex);
  const doneCount = entry.sets.filter((s) => s.done).length;

  return (
    <div className="card">
      <div className="row spread" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <h3>{ex.name}</h3>
          <div className="muted small">
            {entry.repMin}–{entry.repMax} {unit}
            {ex.perSide ? ' each side' : ''} · rest {entry.restSeconds}s · {doneCount}/{entry.sets.length} done
          </div>
        </div>
        <button className="small swap-btn" onClick={onSwap}>⇄ Swap</button>
      </div>
      <div className="small" style={{ marginTop: 6 }}>
        {last ? (
          <>
            <span className="muted">Last ({formatNiceDate(last.date)}):</span> <b>{formatLast(last.sets, ex.timed, wu)}</b>
          </>
        ) : (
          <span className="muted">First time - pick a weight you can do with good form.</span>
        )}
      </div>
      {last?.note && <div className="note-line">📝 {last.note}</div>}
      {up !== null && (
        <span className="badge-up">⬆ Add weight today: {fmtWeight(up, wu)} (+{fmtNum(fromKg(ex.increment, wu))})</span>
      )}
      {warmup.length > 0 && <Warmup sets={warmup} barbell={ex.equipment === 'barbell'} bar={barDisplay} unit={wu} />}

      {entry.sets.map((s, k) => (
        <div key={k} className={'set-row' + (s.done ? ' done' : '') + (isSetPR(s, record) ? ' pr' : '')}>
          <span className="num">{k + 1}</span>
          <button className="val" onClick={() => onEdit(k)} aria-label={`Edit set ${k + 1}`}>
            {ex.timed ? (
              <>
                {s.weight > 0 && <>{fmtKg(s.weight, wu)}<span className="unit"> {wu} · </span></>}
                {s.reps}<span className="unit"> s</span>
              </>
            ) : (
              <>
                {s.weight === 0 ? (
                  <span className="unit">{ex.equipment === 'bodyweight' ? 'BW' : `– ${wu}`}</span>
                ) : (
                  <>
                    {fmtKg(s.weight, wu)}
                    <span className="unit"> {wu}</span>
                  </>
                )}
                <span className="unit"> × </span>
                {s.reps}
              </>
            )}
            {isSetPR(s, record) && <span className="pr-tag" aria-label="Personal record">🏆</span>}
          </button>
          <button className="tick" onClick={() => onTick(k)} aria-label={s.done ? 'Untick set' : 'Tick set'}>
            ✓
          </button>
        </div>
      ))}

      <div className="btn-row" style={{ marginTop: 10 }}>
        <button className="small" onClick={onAddSet}>+ Set</button>
        <button className="small" onClick={onRemoveSet} disabled={entry.sets.length === 0}>− Set</button>
        <button className="small" onClick={() => setShowNote((v) => !v)}>📝 Note</button>
      </div>
      {showNote && (
        <div style={{ marginTop: 10 }}>
          <NoteField value={entry.note} onSave={onNote} placeholder="e.g. shoulder felt off, use the blue bench" />
        </div>
      )}
    </div>
  );
}

function SetEditor({
  ex,
  defaultBar,
  set,
  index,
  onSave,
  onDelete,
  onClose,
}: {
  ex: Exercise;
  /** Settings bar weight in kg, used when the exercise has none of its own. */
  defaultBar: number;
  set: LoggedSet;
  index: number;
  onSave: (patch: Partial<LoggedSet>, andTick: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  // What you type is in the exercise's unit; it is saved in kg.
  const [unit, setUnit] = useState<Unit>(unitOf(ex));
  const [value, setValue] = useState(fromKg(set.weight, unit));
  const [reps, setReps] = useState(set.reps);
  const weight = toKg(value, unit);
  // Weight jump in the unit you're typing in (5 lb after switching to lb).
  const step = unit === 'lb' ? (unitOf(ex) === 'lb' ? fromKg(ex.increment, 'lb') : LB_STEP) : ex.increment || 1;

  const switchUnit = (u: Unit) => {
    if (u === unit) return;
    setValue(fromKg(weight, u));
    setUnit(u);
    void setExerciseUnit(ex.id, u); // remembered for this exercise
  };

  return (
    <Sheet title={`${ex.name} · set ${index + 1}`} onClose={onClose}>
      <div className="field">
        <div className="row spread" style={{ marginBottom: 4 }}>
          <span className="muted small">Weight{ex.equipment === 'bodyweight' ? ' (extra, 0 = bodyweight)' : ''}</span>
          <div className="seg" role="group" aria-label="Weight unit">
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <button key={u} className={u === unit ? 'active' : ''} onClick={() => switchUnit(u)} aria-pressed={u === unit}>
                {u}
              </button>
            ))}
          </div>
        </div>
        <Stepper value={value} onChange={setValue} step={step} label={`weight in ${unit}`} />
        {unit === 'lb' && value > 0 && <div className="small muted conv">= {fmtNum(weight)} kg (saved in kg)</div>}
      </div>
      {ex.equipment === 'barbell' && weight > 0 && <PlateView total={weight} ex={ex} defaultBar={defaultBar} />}
      <label className="field">
        <span>{ex.timed ? 'Seconds' : 'Reps'}</span>
        <Stepper value={reps} onChange={(v) => setReps(Math.round(v))} step={ex.timed ? 5 : 1} label={ex.timed ? 'seconds' : 'reps'} />
      </label>
      <div className="btn-row">
        <button onClick={() => onSave({ weight, reps }, false)}>Save</button>
        <button className="primary" onClick={() => onSave({ weight, reps }, !set.done)}>
          {set.done ? 'Save' : 'Save & ✓'}
        </button>
      </div>
      <button className="danger ghost" style={{ width: '100%', marginTop: 10 }} onClick={onDelete}>Remove this set</button>
    </Sheet>
  );
}

function SwapSheet({
  current,
  exercises,
  last,
  onPick,
  onClose,
}: {
  current: Exercise;
  exercises: Map<string, Exercise>;
  last: Map<string, LastPerf>;
  onPick: (id: string, permanent: boolean) => void;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const alts = current.alternatives.map((id) => exercises.get(id)).filter((e): e is Exercise => !!e);
  const picked = chosen ? exercises.get(chosen) : undefined;

  if (picked) {
    return (
      <Sheet title={`Swap to ${picked.name}`} onClose={onClose}>
        <p className="muted">Your history is kept separately for each exercise.</p>
        <button className="primary big" onClick={() => onPick(picked.id, false)}>Just for today</button>
        <div style={{ height: 10 }} />
        <button className="big" onClick={() => onPick(picked.id, true)}>Permanently (update the template)</button>
        <button className="ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setChosen(null)}>← Back</button>
      </Sheet>
    );
  }
  return (
    <Sheet title={`Swap ${current.name}`} onClose={onClose}>
      {alts.length === 0 && <p className="muted">No alternatives listed for this exercise.</p>}
      {alts.map((e) => {
        const lp = last.get(e.id);
        return (
          <button key={e.id} className="list-btn" onClick={() => setChosen(e.id)}>
            <span>
              {e.name}
              <div className="muted small">{lp ? `Last: ${formatLast(lp.sets, e.timed, unitOf(e))}` : e.equipment}</div>
            </span>
            <span>›</span>
          </button>
        );
      })}
    </Sheet>
  );
}

/** Shows which plates to load on each side of the bar, and lets you change the bar. */
function PlateView({ total, ex, defaultBar }: { total: number; ex: Exercise; defaultBar: number }) {
  const [picking, setPicking] = useState(false);
  const unit = unitOf(ex);
  const bar = fromKg(barKgFor(ex, defaultBar), unit);
  const r = platesPerSide(fromKg(total, unit), bar, unit === 'lb' ? PLATES_LB : PLATES);
  const colors = unit === 'lb' ? PLATE_COLOR_LB : PLATE_COLOR;
  const options = [...new Set([...BAR_OPTIONS[unit], bar])].sort((a, b) => b - a);

  return (
    <div className="card" style={{ background: 'var(--card-2)', marginTop: -4 }}>
      <div className="row spread">
        <span className="small muted">Plates per side</span>
        <button className="small bar-btn" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
          Bar: {fmtNum(bar)} {unit} ✎
        </button>
      </div>
      {picking && (
        <div className="bar-pick">
          <div className="small muted">Empty bar for {ex.name}:</div>
          <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
            {options.map((o) => (
              <button
                key={o}
                className={'small' + (o === bar ? ' primary' : '')}
                onClick={() => {
                  void setExerciseBar(ex.id, toKg(o, unit));
                  setPicking(false);
                }}
              >
                {fmtNum(o)} {unit}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <Stepper compact value={bar} min={0} max={100} step={unit === 'lb' ? 5 : 0.5} onChange={(v) => setExerciseBar(ex.id, toKg(v, unit))} label="bar weight" />
          </div>
        </div>
      )}
      {!r ? (
        <div className="small">Lighter than the bar.</div>
      ) : (
        <>
          <div className="plates" aria-hidden="true">
            <span className="bar" />
            {r.perSide.map((p, i) => (
              <span
                key={i}
                className="plate"
                style={{ height: 30 + (unit === 'lb' ? p * 0.64 : p * 1.4), background: colors[p], color: colors[p] === '#e5e7eb' || colors[p] === '#eab308' ? '#111' : '#fff' }}
              >
                {p}
              </span>
            ))}
          </div>
          <b>{r.perSide.length ? `${r.perSide.join(' + ')} ${unit} each side` : 'Empty bar'}</b>
          {r.remainder > 0 && (
            <div className="small" style={{ color: 'var(--warn)' }}>+{r.remainder} {unit} per side can't be made with standard plates</div>
          )}
        </>
      )}
    </div>
  );
}

/** Collapsible warm-up suggestion. Tap a row to cross it off (not saved). Weights are in `unit`. */
function Warmup({ sets, barbell, bar, unit }: { sets: WarmupSet[]; barbell: boolean; bar: number; unit: Unit }) {
  const [open, setOpen] = useState(false);
  const [crossed, setCrossed] = useState<Set<number>>(new Set());
  return (
    <div className="warmup">
      <button className="small ghost warmup-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        🔥 Warm-up · {sets.length} sets {open ? '▾' : '▸'}
      </button>
      {open && (
        <div>
          {sets.map((w, i) => {
            const plates = barbell ? platesPerSide(w.weight, bar, unit === 'lb' ? PLATES_LB : PLATES) : null;
            const label = barbell && w.weight === bar ? 'Empty bar' : `${fmtNum(w.weight)} ${unit}`;
            return (
              <button
                key={i}
                className={'warmup-row' + (crossed.has(i) ? ' crossed' : '')}
                onClick={() => setCrossed((c) => {
                  const n = new Set(c);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                })}
              >
                <b>{label} × {w.reps}</b>
                {plates && plates.perSide.length > 0 && <span className="muted small">{plates.perSide.join(' + ')} each side</span>}
              </button>
            );
          })}
          <div className="muted small">Light and easy - just to get warm. Not logged.</div>
        </div>
      )}
    </div>
  );
}
