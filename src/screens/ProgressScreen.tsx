// Progress: strength over time per exercise, personal records,
// biggest improvements and weekly training volume.
import { useMemo, useState } from 'react';
import type { Exercise, Workout } from '../db/types';
import { byId, useExercises } from '../hooks';
import { addDays, daysBetween, formatNiceDate, formatShortDate, todayStr } from '../logic/dates';
import {
  METRIC_LABEL,
  exerciseSeries,
  findPRs,
  fmtSet,
  fmtValue,
  fmtVolume,
  improvements,
  metricFor,
  weeklyVolume,
} from '../logic/progress';
import { LineChart } from '../components/LineChart';
import { BarChart } from '../components/BarChart';

const RANGES = [
  { label: '4 wk', days: 28 },
  { label: '12 wk', days: 84 },
  { label: '1 y', days: 365 },
  { label: 'All', days: 0 },
];

export function ProgressScreen({ workouts }: { workouts: Workout[] }) {
  const exList = useExercises();
  const exercises = byId(exList);
  const today = todayStr();
  const [range, setRange] = useState(84);
  const [picked, setPicked] = useState<string | null>(null);
  const [showAllPRs, setShowAllPRs] = useState(false);

  const finished = useMemo(() => workouts.filter((w) => w.finishedAt), [workouts]);
  const { records, events } = useMemo(() => findPRs(finished, exList), [finished, exList]);
  const improved = useMemo(() => improvements(finished, exList).filter((i) => i.pct > 0).slice(0, 5), [finished, exList]);
  const weeks = useMemo(() => weeklyVolume(finished, today, 8), [finished, today]);

  // Exercises you've actually done, most recent first.
  const done = [...records.entries()]
    .sort((a, b) => b[1].lastDate.localeCompare(a[1].lastDate))
    .map(([id]) => exercises.get(id))
    .filter((e): e is Exercise => !!e);

  if (finished.length === 0) {
    return (
      <div>
        <h1>Progress</h1>
        <div className="card center">
          <div style={{ fontSize: 44 }}>📈</div>
          <p>Finish your first workout and your progress, personal records and trends will show up here.</p>
        </div>
      </div>
    );
  }

  const ex = (picked && exercises.get(picked)) || done[0];
  const metric = ex ? metricFor(ex, finished) : 'e1rm';
  const series = ex ? exerciseSeries(finished, ex) : [];
  const inRange = range ? series.filter((p) => daysBetween(p.date, today) <= range) : series;
  const firstInRange = inRange[0];
  const lastInRange = inRange[inRange.length - 1];
  const change = firstInRange && lastInRange ? lastInRange.value - firstInRange.value : 0;
  const rec = ex ? records.get(ex.id) : undefined;

  const last30 = addDays(today, -30);
  const prs30 = events.filter((e) => e.date > last30).length;
  const workouts30 = finished.filter((w) => w.date > last30).length;
  const thisWeek = weeks[weeks.length - 1].volume;
  const lastWeek = weeks[weeks.length - 2].volume;
  const weekDelta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  return (
    <div>
      <h1>Progress</h1>

      <div className="stat-grid stat-tiles">
        <div className="card stat">
          <div className="n">{workouts30}</div>
          <div className="muted small">workouts · 30 days</div>
        </div>
        <div className="card stat">
          <div className="n">🏆 {prs30}</div>
          <div className="muted small">new PRs · 30 days</div>
        </div>
        <div className="card stat">
          <div className="n">{fmtVolume(thisWeek)}</div>
          <div className="muted small">lifted this week</div>
        </div>
        <div className="card stat">
          <div className="n" style={{ color: weekDelta === null ? undefined : weekDelta >= 0 ? 'var(--accent)' : 'var(--warn)' }}>
            {weekDelta === null ? '–' : `${weekDelta >= 0 ? '+' : ''}${weekDelta}%`}
          </div>
          <div className="muted small">vs last week</div>
        </div>
      </div>

      {events.length > 0 && (
        <>
          <h2>Recent PRs 🏆</h2>
          <div className="card">
            {[...events].reverse().slice(0, 5).map((e, i) => {
              const r = records.get(e.exerciseId);
              return (
                <button key={i} className="pr-line" onClick={() => setPicked(e.exerciseId)}>
                  <span className="grow">
                    <b>{exercises.get(e.exerciseId)?.name ?? e.exerciseId}</b>
                    <div className="muted small">
                      {fmtSet(e.set, r?.metric ?? 'e1rm')} · {e.kinds.includes('best') ? (r?.metric === 'e1rm' ? 'best set' : 'most') : 'heaviest'}
                      {e.kinds.length > 1 ? ' + heaviest' : ''}
                    </div>
                  </span>
                  <span className="muted small nowrap">{formatNiceDate(e.date)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <h2>Exercise progress</h2>
      <div className="card">
        <select value={ex?.id} onChange={(e) => setPicked(e.target.value)} aria-label="Exercise">
          {done.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <div className="tabs" style={{ marginTop: 10 }}>
          {RANGES.map((r) => (
            <button key={r.label} className={range === r.days ? 'active' : ''} onClick={() => setRange(r.days)}>{r.label}</button>
          ))}
        </div>
        <div className="muted small" style={{ marginBottom: 4 }}>{METRIC_LABEL[metric]}</div>
        {ex && (
          <LineChart
            key={ex.id + range}
            ariaLabel={`${ex.name} progress`}
            format={(v) => fmtValue(v, metric)}
            points={inRange.map((p) => ({ date: p.date, value: p.value, detail: fmtSet(p.top, metric) }))}
          />
        )}
        {inRange.length > 1 && (
          <p className="small" style={{ margin: '8px 0 0' }}>
            {change > 0 ? '📈' : change < 0 ? '📉' : '➡️'}{' '}
            <b style={{ color: change > 0 ? 'var(--accent)' : undefined }}>
              {change >= 0 ? '+' : '−'}{fmtValue(Math.abs(change), metric)}
            </b>{' '}
            ({firstInRange.value > 0 ? `${change >= 0 ? '+' : ''}${Math.round((change / firstInRange.value) * 100)}%` : '–'}) over {inRange.length} sessions
          </p>
        )}
        {rec && (
          <div className="pr-box">
            <div>
              <div className="muted small">{metric === 'e1rm' ? 'Best set' : 'Record'}</div>
              <b>{fmtSet(rec.best.set, metric)}</b>
              <div className="muted small">{formatNiceDate(rec.best.date)}</div>
            </div>
            {metric === 'e1rm' && (
              <>
                <div>
                  <div className="muted small">Heaviest</div>
                  <b>{rec.heaviest.weight} kg × {rec.heaviest.reps}</b>
                  <div className="muted small">{formatNiceDate(rec.heaviest.date)}</div>
                </div>
                <div>
                  <div className="muted small">Est. 1RM</div>
                  <b>{fmtValue(rec.best.value, metric)}</b>
                  <div className="muted small">{rec.sessions} sessions</div>
                </div>
              </>
            )}
          </div>
        )}
        <details style={{ marginTop: 10 }}>
          <summary className="small">Session log</summary>
          {[...inRange].reverse().map((p) => (
            <div key={p.workoutId} className="row spread ex-line small">
              <span className="muted">{formatNiceDate(p.date)}</span>
              <span>{p.sets.map((s) => (metric === 'seconds' ? `${s.reps}s` : s.weight > 0 ? `${s.weight}×${s.reps}` : `${s.reps}`)).join(', ')}</span>
            </div>
          ))}
        </details>
      </div>

      {improved.length > 0 && (
        <>
          <h2>Biggest improvements</h2>
          <div className="card">
            {improved.map((i) => (
              <button key={i.exerciseId} className="pr-line" onClick={() => setPicked(i.exerciseId)}>
                <span className="grow">
                  <b>{exercises.get(i.exerciseId)?.name}</b>
                  <div className="muted small">
                    {fmtValue(i.first, i.metric)} → {fmtValue(i.last, i.metric)} · {i.sessions} sessions
                  </div>
                </span>
                <b style={{ color: 'var(--accent)' }}>+{Math.round(i.pct)}%</b>
              </button>
            ))}
          </div>
        </>
      )}

      <h2>Weekly volume</h2>
      <div className="card">
        <div className="muted small" style={{ marginBottom: 4 }}>Total weight lifted (kg × reps) per week</div>
        <BarChart
          ariaLabel="Weekly volume"
          bars={weeks.map((w, i) => ({
            label: i === weeks.length - 1 ? 'Now' : formatShortDate(w.weekStart),
            value: w.volume,
            detail: `${fmtVolume(w.volume)} · ${w.sessions} workout${w.sessions === 1 ? '' : 's'}`,
            partial: i === weeks.length - 1,
          }))}
        />
      </div>

      <h2>All personal records</h2>
      <div className="card">
        {(showAllPRs ? done : done.slice(0, 6)).map((e) => {
          const r = records.get(e.id)!;
          return (
            <button key={e.id} className="pr-line" onClick={() => setPicked(e.id)}>
              <span className="grow">{e.name}</span>
              <span className="nowrap"><b>{fmtSet(r.best.set, r.metric)}</b></span>
            </button>
          );
        })}
        {done.length > 6 && (
          <button className="small ghost" style={{ width: '100%' }} onClick={() => setShowAllPRs((v) => !v)}>
            {showAllPRs ? 'Show less' : `Show all ${done.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
