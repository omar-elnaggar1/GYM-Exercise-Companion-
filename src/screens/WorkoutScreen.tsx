// The workout logger. Every tap is saved to the phone immediately.
import { useEffect, useState } from 'react';
import type { Exercise, LoggedSet, Settings, Workout, WorkoutEntry } from '../db/types';
import { byId, useExercises, useTemplates } from '../hooks';
import { deleteWorkout, finishWorkout, lastPerformanceMap, lastWorkoutNote, mutateWorkout, swapExercise, type LastPerf } from '../db/actions';
import { fmtKg, formatLast, suggestProgression } from '../logic/progression';
import { formatNiceDate } from '../logic/dates';
import { unlockAudio } from '../logic/alerts';
import { useWakeLock } from '../useWakeLock';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { NoteField } from '../components/NoteField';

interface Props {
  workout: Workout | null;
  settings: Settings;
  workouts: Workout[];
  onStartRest: (seconds: number, label: string) => void;
  onClose: () => void;
  onGoToday: () => void;
}

export function WorkoutScreen({ workout, settings, workouts, onStartRest, onClose, onGoToday }: Props) {
  const exercises = byId(useExercises());
  const templates = byId(useTemplates());
  const [editing, setEditing] = useState<{ entry: number; set: number } | null>(null);
  const [swapping, setSwapping] = useState<number | null>(null);
  useWakeLock(settings.keepAwake && !!workout);
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
  const last = lastPerformanceMap(workouts, id);
  const prevNote = lastWorkoutNote(workouts.filter((w) => w.id !== id), workout.templateId);

  const updateEntry = (i: number, fn: (e: WorkoutEntry) => WorkoutEntry) =>
    mutateWorkout(id, (w) => ({ ...w, entries: w.entries.map((e, j) => (j === i ? fn(e) : e)) }));
  const updateSet = (i: number, s: number, patch: Partial<LoggedSet>) =>
    updateEntry(i, (e) => ({ ...e, sets: e.sets.map((x, k) => (k === s ? { ...x, ...patch } : x)) }));

  const tick = (i: number, s: number) => {
    const set = workout.entries[i].sets[s];
    void updateSet(i, s, { done: !set.done });
    if (!set.done) {
      unlockAudio();
      onStartRest(workout.entries[i].restSeconds, exercises.get(workout.entries[i].exerciseId)?.name ?? '');
    }
  };

  const finish = async () => {
    const open = workout.entries.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
    const doneAny = workout.entries.some((e) => e.sets.some((s) => s.done));
    if (!doneAny && !confirm('No sets ticked. Finish anyway?')) return;
    if (doneAny && open > 0 && !confirm(`${open} set${open === 1 ? '' : 's'} not ticked. Finish anyway? (Unticked sets are not counted.)`)) return;
    await finishWorkout(workout);
    onClose();
  };

  const discard = async () => {
    if (!confirm('Delete this workout? Nothing from it will be saved.')) return;
    await deleteWorkout(id);
    onClose();
  };

  const edit = editing && workout.entries[editing.entry];
  const editEx = edit ? exercises.get(edit.exerciseId) : undefined;

  return (
    <div>
      <div className="workout-head">
        <div className="row spread">
          <div>
            <h3 style={{ color: template?.color }}>
              {template?.name ?? 'Workout'} {workout.deload && <span className="chip">Deload</span>}
            </h3>
            <div className="muted small">{formatNiceDate(workout.date)} · {elapsed}</div>
          </div>
          <button className="primary" onClick={finish}>Finish ✓</button>
        </div>
      </div>

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
      <button className="primary big" onClick={finish}>Finish workout ✓</button>
      <button className="danger ghost" style={{ width: '100%', marginTop: 10 }} onClick={discard}>Discard workout</button>

      {editing && edit && editEx && (
        <SetEditor
          ex={editEx}
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
            if (andTick) {
              unlockAudio();
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
        <button className="small" onClick={onSwap}>⇄ Swap</button>
      </div>
      <div className="small" style={{ marginTop: 6 }}>
        {last ? (
          <>
            <span className="muted">Last ({formatNiceDate(last.date)}):</span> <b>{formatLast(last.sets, ex.timed)}</b>
          </>
        ) : (
          <span className="muted">First time - pick a weight you can do with good form.</span>
        )}
      </div>
      {last?.note && <div className="note-line">📝 {last.note}</div>}
      {up !== null && <span className="badge-up">⬆ Add weight today: {up} kg (+{ex.increment})</span>}

      {entry.sets.map((s, k) => (
        <div key={k} className={'set-row' + (s.done ? ' done' : '')}>
          <span className="num">{k + 1}</span>
          <button className="val" onClick={() => onEdit(k)} aria-label={`Edit set ${k + 1}`}>
            {ex.timed ? (
              <>
                {s.weight > 0 && <>{fmtKg(s.weight)}<span className="unit"> kg · </span></>}
                {s.reps}<span className="unit"> s</span>
              </>
            ) : (
              <>
                {s.weight === 0 ? <span className="unit">{ex.equipment === 'bodyweight' ? 'BW' : '– kg'}</span> : <>{fmtKg(s.weight)}<span className="unit"> kg</span></>}
                <span className="unit"> × </span>
                {s.reps}
              </>
            )}
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
  set,
  index,
  onSave,
  onDelete,
  onClose,
}: {
  ex: Exercise;
  set: LoggedSet;
  index: number;
  onSave: (patch: Partial<LoggedSet>, andTick: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState(set.weight);
  const [reps, setReps] = useState(set.reps);
  return (
    <Sheet title={`${ex.name} · set ${index + 1}`} onClose={onClose}>
      <label className="field">
        <span>Weight (kg){ex.equipment === 'bodyweight' ? ' - extra weight, 0 = bodyweight' : ''}</span>
        <Stepper value={weight} onChange={setWeight} step={ex.increment || 1} label="weight" />
      </label>
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
              <div className="muted small">{lp ? `Last: ${formatLast(lp.sets, e.timed)}` : e.equipment}</div>
            </span>
            <span>›</span>
          </button>
        );
      })}
    </Sheet>
  );
}
