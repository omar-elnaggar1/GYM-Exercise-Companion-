// The rest timer. It stores the END time (not a countdown), so it stays
// correct even if the phone sleeps or you switch apps.
import { useEffect, useState } from 'react';
import { beep, vibrate } from '../logic/alerts';
import { showNotification } from '../logic/reminders';

export interface TimerState {
  endsAt: number;
  total: number;
  label: string;
}

const KEY = 'rest-timer';

export function loadTimer(): TimerState | null {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TimerState | null;
    return t && t.endsAt > Date.now() ? t : null;
  } catch {
    return null;
  }
}

export function saveTimer(t: TimerState | null): void {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked - timer still works in memory */
  }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function RestTimer({
  timer,
  onChange,
  sound,
  vibration,
}: {
  timer: TimerState;
  onChange: (t: TimerState | null) => void;
  sound: boolean;
  vibration: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const [overAt, setOverAt] = useState<number | null>(null);
  const left = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // New timer started -> reset the "time's up" state.
  useEffect(() => setOverAt(null), [timer.endsAt]);

  useEffect(() => {
    if (left > 0 || overAt !== null) return;
    setOverAt(Date.now());
    if (sound) beep();
    if (vibration) vibrate();
    if (document.hidden) void showNotification('Rest over', `Time for your next set: ${timer.label}`);
  }, [left, overAt, sound, vibration, timer.label]);

  // Hide 4 seconds after it finished.
  useEffect(() => {
    if (overAt === null) return;
    const id = window.setTimeout(() => onChange(null), 4000);
    return () => window.clearTimeout(id);
  }, [overAt, onChange]);

  const add = (sec: number) => {
    const endsAt = Math.max(Date.now() + 1000, timer.endsAt + sec * 1000);
    onChange({ ...timer, endsAt, total: Math.max(timer.total, Math.ceil((endsAt - Date.now()) / 1000)) });
  };

  const over = left === 0;
  return (
    <div className={'timer' + (over ? ' over' : '')} role="timer">
      <div className="inner">
        <div className="row spread small muted">
          <span>Rest · {timer.label}</span>
          <span>{fmt(timer.total)}</span>
        </div>
        <div className="count">{over ? 'GO!' : fmt(left)}</div>
        <div className="progress">
          <div style={{ width: `${(left / timer.total) * 100}%` }} />
        </div>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button onClick={() => add(-15)} disabled={over}>−15s</button>
          <button onClick={() => add(15)} disabled={over}>+15s</button>
          <button className="primary" onClick={() => onChange(null)}>{over ? 'Close' : 'Skip'}</button>
        </div>
      </div>
    </div>
  );
}
