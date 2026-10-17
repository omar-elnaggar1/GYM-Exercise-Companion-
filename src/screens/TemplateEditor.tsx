// Edit the 5 session templates: add / remove / reorder exercises,
// change sets, rep ranges, rest time and weight increment.
import { useState, type ReactNode } from 'react';
import type { Equipment, Exercise, TemplateItem } from '../db/types';
import { db } from '../db/db';
import { byId, useExercises, useTemplates } from '../hooks';
import { DEFAULT_REST_FIRST, DEFAULT_REST_OTHER } from '../db/actions';
import { DEFAULT_INCREMENT } from '../db/seed';
import { Stepper } from '../components/Stepper';
import { Sheet } from '../components/Sheet';

export function TemplateEditor({ onBack }: { onBack: () => void }) {
  const templates = useTemplates();
  const exercises = byId(useExercises());
  const [tid, setTid] = useState('upper');
  const [adding, setAdding] = useState(false);
  const t = templates.find((x) => x.id === tid) ?? templates[0];
  if (!t) return null;

  const save = (items: TemplateItem[]) => db.templates.put({ ...t, items });
  const setItem = (i: number, patch: Partial<TemplateItem>) => save(t.items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= t.items.length) return;
    const items = [...t.items];
    [items[i], items[j]] = [items[j], items[i]];
    void save(items);
  };

  return (
    <div>
      <button className="ghost small" onClick={onBack}>← Settings</button>
      <h1>Templates</h1>
      <div className="tabs">
        {templates.map((x) => (
          <button key={x.id} className={x.id === t.id ? 'active' : ''} onClick={() => setTid(x.id)}>{x.name}</button>
        ))}
      </div>
      <p className="muted small">Changes are saved instantly and apply from your next workout.</p>

      {t.items.map((item, i) => {
        const ex = exercises.get(item.exerciseId);
        const defRest = i === 0 ? DEFAULT_REST_FIRST : DEFAULT_REST_OTHER;
        return (
          <div className="card" key={i + item.exerciseId}>
            <div className="row spread">
              <h3 className="grow">{i + 1}. {ex?.name ?? item.exerciseId}</h3>
              <button className="icon small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
              <button className="icon small" onClick={() => move(i, 1)} disabled={i === t.items.length - 1} aria-label="Move down">▼</button>
              <button
                className="icon small danger"
                aria-label="Remove"
                onClick={() => confirm(`Remove ${ex?.name} from ${t.name}?`) && save(t.items.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
            <Param label="Sets">
              <Stepper compact value={item.sets} min={1} max={10} onChange={(v) => setItem(i, { sets: Math.round(v) })} label="sets" />
            </Param>
            <Param label={ex?.timed ? 'Min seconds' : 'Min reps'}>
              <Stepper compact value={item.repMin} min={1} step={ex?.timed ? 5 : 1} onChange={(v) => setItem(i, { repMin: Math.round(v), repMax: Math.max(item.repMax, Math.round(v)) })} label="minimum" />
            </Param>
            <Param label={ex?.timed ? 'Max seconds' : 'Max reps'}>
              <Stepper compact value={item.repMax} min={1} step={ex?.timed ? 5 : 1} onChange={(v) => setItem(i, { repMax: Math.round(v), repMin: Math.min(item.repMin, Math.round(v)) })} label="maximum" />
            </Param>
            <Param label={`Rest (s)${item.restSeconds === undefined ? ' · default' : ''}`}>
              <Stepper compact value={item.restSeconds ?? defRest} min={0} max={600} step={15} onChange={(v) => setItem(i, { restSeconds: Math.round(v) })} label="rest seconds" />
            </Param>
            {ex && (
              <Param label="Weight jump (kg)">
                <Stepper compact value={ex.increment} min={0} max={20} step={0.5} onChange={(v) => db.exercises.update(ex.id, { increment: v })} label="weight increment" />
              </Param>
            )}
          </div>
        );
      })}

      <button className="big" onClick={() => setAdding(true)}>+ Add exercise</button>
      {adding && (
        <ExercisePicker
          exercises={[...exercises.values()]}
          onClose={() => setAdding(false)}
          onPick={(ex) => {
            void save([...t.items, { exerciseId: ex.id, sets: 3, repMin: ex.timed ? 30 : 8, repMax: ex.timed ? 60 : 12 }]);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

function Param({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="param">
      <span>{label}</span>
      {children}
    </div>
  );
}

const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

function ExercisePicker({ exercises, onPick, onClose }: { exercises: Exercise[]; onPick: (e: Exercise) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [equipment, setEquipment] = useState<Equipment>('machine');
  const [timed, setTimed] = useState(false);
  const list = exercises
    .filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const create = async () => {
    const name = q.trim();
    if (!name) return;
    const ex: Exercise = {
      id: 'custom-' + Date.now().toString(36),
      name,
      equipment,
      increment: DEFAULT_INCREMENT[equipment],
      timed,
      alternatives: [],
    };
    await db.exercises.add(ex);
    onPick(ex);
  };

  return (
    <Sheet title="Add exercise" onClose={onClose}>
      <input placeholder="Search or type a new name…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div style={{ height: 10 }} />
      {!creating && q.trim() && (
        <button className="list-btn primary" onClick={() => setCreating(true)}>+ Create “{q.trim()}”</button>
      )}
      {creating && (
        <div className="card">
          <label className="field">
            <span>Equipment (sets the default weight jump)</span>
            <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
              {EQUIPMENT.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="row" style={{ marginBottom: 12 }}>
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} style={{ width: 28, minHeight: 28 }} />
            Time-based (seconds instead of reps)
          </label>
          <button className="primary big" onClick={create}>Create & add</button>
        </div>
      )}
      {list.map((e) => (
        <button key={e.id} className="list-btn" onClick={() => onPick(e)}>
          <span>{e.name}</span>
          <span className="muted small">{e.equipment}</span>
        </button>
      ))}
    </Sheet>
  );
}
