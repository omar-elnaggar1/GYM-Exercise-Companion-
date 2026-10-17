// Daily weigh-in + chart.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addDays, formatNiceDate, todayStr } from '../logic/dates';
import { movingAverage7 } from '../logic/movingAverage';
import { Stepper } from '../components/Stepper';
import { WeightChart } from '../components/WeightChart';

const RANGES = [
  { label: '30 d', days: 30 },
  { label: '90 d', days: 90 },
  { label: '1 y', days: 365 },
  { label: 'All', days: 0 },
];

export function BodyScreen() {
  const entries = useLiveQuery(() => db.bodyweight.orderBy('date').toArray(), [], []);
  const today = todayStr();
  const todays = entries.find((e) => e.date === today);
  const latest = entries[entries.length - 1];
  const [kg, setKg] = useState<number | null>(null);
  const [range, setRange] = useState(30);

  // Start the stepper at today's (or the latest) value so you just nudge it.
  useEffect(() => {
    if (kg === null && entries.length) setKg((todays ?? latest).kg);
  }, [entries, kg, todays, latest]);

  const value = kg ?? 75;
  const shown = range ? entries.filter((e) => e.date >= addDays(today, -range)) : entries;
  const avg = movingAverage7(entries);

  return (
    <div>
      <h1>Bodyweight</h1>
      <div className="card">
        <div className="muted small" style={{ marginBottom: 8 }}>
          {todays ? `Today: ${todays.kg} kg (tap Save to change)` : 'Today’s weigh-in'}
        </div>
        <Stepper value={value} onChange={setKg} step={0.1} min={20} max={300} label="bodyweight in kg" />
        <div style={{ height: 10 }} />
        <button className="primary big" onClick={() => db.bodyweight.put({ date: today, kg: Math.round(value * 10) / 10 })}>
          {todays ? 'Update' : 'Save'} {value.toFixed(1)} kg
        </button>
        {avg.length > 0 && <div className="muted small center" style={{ marginTop: 8 }}>7-day average: {avg[avg.length - 1].toFixed(1)} kg</div>}
      </div>

      <div className="card">
        <div className="tabs">
          {RANGES.map((r) => (
            <button key={r.label} className={range === r.days ? 'active' : ''} onClick={() => setRange(r.days)}>{r.label}</button>
          ))}
        </div>
        <WeightChart entries={shown} />
      </div>

      <h2>Entries</h2>
      {entries.length === 0 && <p className="muted">No weigh-ins yet.</p>}
      {[...entries].reverse().slice(0, 30).map((e) => (
        <div key={e.date} className="row spread ex-line">
          <span>{formatNiceDate(e.date)}</span>
          <span className="row">
            <b>{e.kg} kg</b>
            <button className="small ghost danger" onClick={() => confirm('Delete this entry?') && db.bodyweight.delete(e.date)} aria-label="Delete entry">✕</button>
          </span>
        </div>
      ))}
    </div>
  );
}
