// Calendar (colored by session), streak, and past workouts.
import { useState } from 'react';
import type { Settings, Workout } from '../db/types';
import { byId, useExercises, useTemplates } from '../hooks';
import { computeStreak, toStreakWorkouts } from '../logic/streak';
import { addDays, formatNiceDate, todayStr, toDateStr } from '../logic/dates';
import { formatLast } from '../logic/progression';
import { unitOf } from '../logic/units';
import { deleteWorkout, logPastWorkout } from '../db/actions';
import { todayStatus } from '../logic/rotation';
import { Sheet } from '../components/Sheet';

export function HistoryScreen({
  workouts,
  settings,
  onEditWorkout,
}: {
  workouts: Workout[];
  settings: Settings;
  onEditWorkout: (id: number) => void;
}) {
  const [logging, setLogging] = useState(false);
  const templates = byId(useTemplates());
  const exercises = byId(useExercises());
  const today = todayStr();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<Workout | null>(null);

  const finished = workouts.filter((w) => w.finishedAt).sort((a, b) => b.date.localeCompare(a.date) || (b.finishedAt! - a.finishedAt!));
  const byDate = new Map<string, Workout[]>();
  for (const w of finished) byDate.set(w.date, [...(byDate.get(w.date) ?? []), w]);

  const streak = computeStreak(toStreakWorkouts(finished, settings.rotation), settings.rotation, today);
  const thisMonth = finished.filter((w) => w.date.startsWith(today.slice(0, 7))).length;

  // Calendar grid: weeks start on Monday.
  const y = month.getFullYear();
  const m = month.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateStr(new Date(y, m, i + 1))),
  ];

  const list = selected ? byDate.get(selected) ?? [] : finished.slice(0, 20);

  return (
    <div>
      <h1>History</h1>
      <div className="stat-grid">
        <div className="card stat">
          <div className="n">🔥 {streak}</div>
          <div className="muted small">session streak</div>
        </div>
        <div className="card stat">
          <div className="n">{thisMonth}</div>
          <div className="muted small">workouts this month</div>
        </div>
      </div>

      <div className="card">
        <div className="row spread" style={{ marginBottom: 10 }}>
          <button className="icon" onClick={() => setMonth(new Date(y, m - 1, 1))} aria-label="Previous month">‹</button>
          <b>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
          <button className="icon" onClick={() => setMonth(new Date(y, m + 1, 1))} aria-label="Next month">›</button>
        </div>
        <div className="cal">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="dow">{d}</div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const ws = byDate.get(date);
            const color = ws ? templates.get(ws[0].templateId)?.color ?? '#888' : undefined;
            return (
              <button
                key={i}
                className={[ws && 'trained', date === today && 'today', date === selected && 'selected'].filter(Boolean).join(' ')}
                style={color ? { background: color } : undefined}
                onClick={() => setSelected(date === selected ? null : date)}
              >
                {Number(date.slice(8))}
                {ws && ws.length > 1 && <span className="more">+{ws.length - 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
          {[...templates.values()].filter((t) => !t.archived).map((t) => (
            <span key={t.id} className="row small" style={{ gap: 4 }}>
              <span className="dot" style={{ background: t.color }} />
              {t.name}
            </span>
          ))}
        </div>
      </div>

      <button className="big" onClick={() => setLogging(true)}>+ Log a past workout</button>

      <h2>{selected ? formatNiceDate(selected) : 'Recent workouts'}</h2>
      {list.length === 0 && <p className="muted">{selected ? 'No workout this day.' : 'No workouts yet. Your first one will show up here.'}</p>}
      {list.map((w) => {
        const t = templates.get(w.templateId);
        const sets = w.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
        return (
          <button key={w.id} className="list-btn" onClick={() => setOpen(w)}>
            <span className="row">
              <span className="dot" style={{ background: t?.color }} />
              <span>
                {t?.name ?? w.templateId} {w.deload && <span className="chip">Deload</span>}
                <div className="muted small">{formatNiceDate(w.date)} · {sets} sets</div>
              </span>
            </span>
            <span>›</span>
          </button>
        );
      })}

      {open && (
        <Sheet title={`${templates.get(open.templateId)?.name ?? ''} · ${formatNiceDate(open.date)}`} onClose={() => setOpen(null)}>
          {open.note && <div className="note-line" style={{ marginBottom: 10 }}>📝 {open.note}</div>}
          {open.entries.map((e, i) => {
            const ex = exercises.get(e.exerciseId);
            const txt = formatLast(e.sets, ex?.timed, unitOf(ex));
            return (
              <div key={i} className="ex-line">
                <b>{ex?.name ?? e.exerciseId}</b>
                <div className="muted small">{txt || 'skipped'}</div>
                {e.note && <div className="note-line">📝 {e.note}</div>}
              </div>
            );
          })}
          <button
            className="primary"
            style={{ width: '100%', marginTop: 14 }}
            onClick={() => {
              onEditWorkout(open.id!);
              setOpen(null);
            }}
          >
            ✏️ Edit workout
          </button>
          <button
            className="danger"
            style={{ width: '100%', marginTop: 10 }}
            onClick={async () => {
              if (!confirm('Delete this workout from your history?')) return;
              await deleteWorkout(open.id!);
              setOpen(null);
            }}
          >
            Delete workout
          </button>
        </Sheet>
      )}

      {logging && (
        <LogPastSheet
          settings={settings}
          defaultDate={selected && selected <= today ? selected : addDays(today, -1)}
          onClose={() => setLogging(false)}
          onCreated={(id) => {
            setLogging(false);
            onEditWorkout(id);
          }}
        />
      )}
    </div>
  );
}

/** Pick a date and a session, then fill in the sets. */
function LogPastSheet({
  settings,
  defaultDate,
  onClose,
  onCreated,
}: {
  settings: Settings;
  defaultDate: string;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const templates = useTemplates().filter((t) => !t.archived);
  const today = todayStr();
  const [date, setDate] = useState(defaultDate);
  const next = settings.rotation[todayStatus(settings.rotationState, settings.rotation, today).index];
  const [tid, setTid] = useState<string | null>(next !== 'rest' ? next : null);
  const [count, setCount] = useState(true);
  const [busy, setBusy] = useState(false);

  return (
    <Sheet title="Log a past workout" onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>For days you trained but didn't record it (forgot your phone, dead battery…).</p>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      <div className="small muted" style={{ marginBottom: 6 }}>Session</div>
      {templates.map((t) => (
        <button key={t.id} className={'list-btn' + (tid === t.id ? ' primary' : '')} onClick={() => setTid(t.id)}>
          <span className="row">
            <span className="dot" style={{ background: t.color }} />
            {t.name}
          </span>
          {tid === t.id && <span>✓</span>}
        </button>
      ))}
      <label className="row" style={{ margin: '8px 0 14px', alignItems: 'flex-start' }}>
        <input type="checkbox" checked={count} onChange={(e) => setCount(e.target.checked)} style={{ width: 28, minHeight: 28, flex: 'none' }} />
        <span className="small">
          Count it in my rotation (it replaced a planned session, so move my “next session” on)
        </span>
      </label>
      <button
        className="primary big"
        disabled={!tid || busy}
        onClick={async () => {
          setBusy(true);
          onCreated(await logPastWorkout(tid!, date, count));
        }}
      >
        Next: enter the sets
      </button>
    </Sheet>
  );
}
