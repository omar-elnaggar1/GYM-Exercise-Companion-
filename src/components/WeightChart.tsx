// A small SVG line chart: daily weigh-ins (dots) + 7-day average (line).
import type { BodyweightEntry } from '../db/types';
import { daysBetween, formatNiceDate } from '../logic/dates';
import { movingAverage7 } from '../logic/movingAverage';

const W = 340;
const H = 200;
const PAD = { l: 36, r: 10, t: 12, b: 24 };

export function WeightChart({ entries }: { entries: BodyweightEntry[] }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return <p className="muted">Log at least two weigh-ins to see the chart.</p>;

  const avg = movingAverage7(sorted);
  const first = sorted[0].date;
  const span = Math.max(1, daysBetween(first, sorted[sorted.length - 1].date));
  const all = [...sorted.map((e) => e.kg), ...avg];
  const lo = Math.floor(Math.min(...all) - 0.5);
  const hi = Math.ceil(Math.max(...all) + 0.5);
  const x = (d: string) => PAD.l + (daysBetween(first, d) / span) * (W - PAD.l - PAD.r);
  const yy = (kg: number) => PAD.t + (1 - (kg - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const line = sorted.map((e, i) => `${i ? 'L' : 'M'}${x(e.date).toFixed(1)},${yy(avg[i]).toFixed(1)}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Bodyweight chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yy(t)} y2={yy(t)} stroke="#2b303b" />
            <text x={PAD.l - 6} y={yy(t) + 4} fill="#9aa3b2" fontSize="11" textAnchor="end">{t.toFixed(1)}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} fill="#9aa3b2" fontSize="11">{formatNiceDate(first)}</text>
        <text x={W - PAD.r} y={H - 6} fill="#9aa3b2" fontSize="11" textAnchor="end">{formatNiceDate(sorted[sorted.length - 1].date)}</text>
        {sorted.map((e) => (
          <circle key={e.date} cx={x(e.date)} cy={yy(e.kg)} r="3" fill="#9aa3b2" />
        ))}
        <path d={line} fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <div className="row small muted" style={{ gap: 16 }}>
        <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: '#9aa3b2' }} />Daily</span>
        <span className="row" style={{ gap: 6 }}><span style={{ width: 16, height: 3, background: '#4ade80', display: 'inline-block' }} />7-day average</span>
      </div>
    </div>
  );
}
