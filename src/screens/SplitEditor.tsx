// Edit the training split: the order of days in the rotation, and the
// sessions themselves (create, rename, recolor, delete).
import { useState } from 'react';
import type { Settings, Slot, Template } from '../db/types';
import { useTemplates } from '../hooks';
import { todayStatus } from '../logic/rotation';
import { todayStr } from '../logic/dates';
import { archiveTemplate, createTemplate, restoreDefaultSplit, saveRotation, updateTemplate } from '../db/actions';
import { Sheet } from '../components/Sheet';

export const COLORS = ['#60a5fa', '#f97316', '#f43f5e', '#a78bfa', '#facc15', '#2dd4bf', '#f472b6', '#a3e635'];

export function SplitEditor({
  settings,
  onBack,
  onEditExercises,
}: {
  settings: Settings;
  onBack: () => void;
  onEditExercises: (templateId: string) => void;
}) {
  const all = useTemplates();
  const sessions = all.filter((t) => !t.archived);
  const tMap = new Map(all.map((t) => [t.id, t]));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const [error, setError] = useState('');
  const rot = settings.rotation;
  const cur = todayStatus(settings.rotationState, rot, todayStr()).index;

  const run = async (fn: () => Promise<void>) => {
    try {
      setError('');
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Each change also works out where "next session" ends up.
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rot.length) return;
    const next = [...rot];
    [next[i], next[j]] = [next[j], next[i]];
    void run(() => saveRotation(next, cur === i ? j : cur === j ? i : cur));
  };
  const remove = (i: number) => {
    const next = rot.filter((_, k) => k !== i);
    void run(() => saveRotation(next, cur > i ? cur - 1 : cur === i ? i % Math.max(next.length, 1) : cur));
  };
  const add = (slot: Slot) => {
    setAdding(false);
    void run(() => saveRotation([...rot, slot], cur));
  };

  const name = (s: Slot) => (s === 'rest' ? 'Rest' : tMap.get(s)?.name ?? '?');
  const trainingDays = rot.filter((s) => s !== 'rest').length;

  return (
    <div>
      <button className="ghost small" onClick={onBack}>← Settings</button>
      <h1>Training split</h1>
      <p className="muted small">
        The app goes through these days in order, then starts again. A training day waits until you do it; a rest day
        lasts one calendar day. {rot.length} days · {trainingDays} training.
      </p>
      {error && <div className="banner warn">{error}</div>}

      <div className="card">
        {rot.map((s, i) => (
          <div key={i} className="row ex-line">
            <span className="muted small" style={{ width: 44 }}>Day {i + 1}</span>
            <span className="grow">
              <span className="row" style={{ gap: 8 }}>
                {s !== 'rest' && <span className="dot" style={{ background: tMap.get(s)?.color }} />}
                <b>{name(s)}</b>
              </span>
              {i === cur && <span className="small" style={{ color: 'var(--accent)' }}>▶ up next</span>}
            </span>
            <button className="icon small slot-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
            <button className="icon small slot-btn" onClick={() => move(i, 1)} disabled={i === rot.length - 1} aria-label="Move down">▼</button>
            <button className="icon small danger slot-btn" onClick={() => remove(i)} disabled={rot.length <= 1} aria-label="Remove day">✕</button>
          </div>
        ))}
        <button className="big" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>+ Add a day</button>
      </div>

      <h2>Sessions</h2>
      {sessions.map((t) => (
        <div key={t.id} className="card">
          <div className="row spread">
            <span className="row">
              <span className="dot" style={{ background: t.color, width: 14, height: 14 }} />
              <h3>{t.name}</h3>
            </span>
            <span className="muted small">{t.items.length} exercise{t.items.length === 1 ? '' : 's'}</span>
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="small" onClick={() => onEditExercises(t.id)}>Exercises</button>
            <button className="small" onClick={() => setEditing(t)}>Edit</button>
            <button
              className="small danger"
              onClick={() =>
                confirm(`Delete "${t.name}"? It is removed from your split. Past workouts stay in your history.`) &&
                run(() => archiveTemplate(t.id))
              }
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <button className="big" onClick={() => setEditing('new')}>+ New session</button>
      <div style={{ height: 12 }} />
      <button
        className="ghost"
        style={{ width: '100%' }}
        onClick={() => confirm('Go back to Upper / Lower / Rest / Push / Pull / Legs / Rest?') && run(restoreDefaultSplit)}
      >
        Restore my original split
      </button>

      {adding && (
        <Sheet title="Add a day" onClose={() => setAdding(false)}>
          <button className="list-btn" onClick={() => add('rest')}>
            <span>😴 Rest day</span>
          </button>
          {sessions.map((t) => (
            <button key={t.id} className="list-btn" onClick={() => add(t.id)}>
              <span className="row">
                <span className="dot" style={{ background: t.color }} />
                {t.name}
              </span>
              <span className="muted small">{t.items.length} exercise{t.items.length === 1 ? '' : 's'}</span>
            </button>
          ))}
        </Sheet>
      )}

      {editing && (
        <SessionForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(n, color) =>
            run(async () => {
              if (editing === 'new') {
                const id = await createTemplate(n, color);
                setEditing(null);
                onEditExercises(id);
              } else {
                await updateTemplate(editing.id, { name: n, color });
                setEditing(null);
              }
            })
          }
        />
      )}
    </div>
  );
}

function SessionForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Template;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
}) {
  const [n, setN] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? COLORS[5]);
  return (
    <Sheet title={initial ? 'Edit session' : 'New session'} onClose={onClose}>
      <label className="field">
        <span>Name</span>
        <input value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. Arms, Full body" autoFocus />
      </label>
      <label className="field">
        <span>Color (used in the calendar)</span>
        <div className="row wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
              style={{ background: c, width: 48, padding: 0, outline: c === color ? '3px solid var(--text)' : 'none', outlineOffset: 2 }}
            />
          ))}
        </div>
      </label>
      <button className="primary big" disabled={!n.trim()} onClick={() => onSave(n.trim(), color)}>
        {initial ? 'Save' : 'Create & add exercises'}
      </button>
      {!initial && <p className="muted small">Then add it to your split with “+ Add a day”.</p>}
    </Sheet>
  );
}
