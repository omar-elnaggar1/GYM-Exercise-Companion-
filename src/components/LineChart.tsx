// Single-series line chart over time. Tap (or hover) anywhere to see the
// nearest session's value; the latest value is labelled by default.
import { useState, type PointerEvent } from 'react';
import { daysBetween, formatNiceDate } from '../logic/dates';

export interface LinePoint {
  date: string;
  value: number;
  /** Extra text for the tooltip, e.g. the top set. */
  detail?: string;
}

const W = 340;
const H = 190;
const PAD = { l: 40, r: 14, t: 18, b: 24 };

export function LineChart({ points, format, ariaLabel }: { points: LinePoint[]; format: (v: number) => string; ariaLabel: string }) {
  const [sel, setSel] = useState<number | null>(null);
  if (points.length === 0) return <p className="muted">No sessions in this range.</p>;

  const first = points[0].date;
  const span = Math.max(1, daysBetween(first, points[points.length - 1].date));
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.15, hi * 0.03, 1);
  lo = Math.max(0, lo - pad);
  hi = hi + pad;
  const x = (d: string) => (points.length === 1 ? (W + PAD.l - PAD.r) / 2 : PAD.l + (daysBetween(first, d) / span) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const shown = sel ?? points.length - 1;
  const sp = points[shown];

  // Pick the point nearest to where you touched.
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i;
    });
    setSel(best);
  };

  return (
    <div>
      <div className="chart-readout">
        <b>{format(sp.value)}</b>
        <span className="muted small"> · {formatNiceDate(sp.date)}{sp.detail ? ` · ${sp.detail}` : ''}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        style={{ touchAction: 'pan-y' }}
        onPointerDown={pick}
        onPointerMove={(e) => (e.buttons || e.pointerType === 'mouse') && pick(e)}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={PAD.l - 6} y={y(t) + 4} fill="var(--muted)" fontSize="11" textAnchor="end">{Math.round(t)}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} fill="var(--muted)" fontSize="11">{formatNiceDate(first)}</text>
        {points.length > 1 && (
          <text x={W - PAD.r} y={H - 6} fill="var(--muted)" fontSize="11" textAnchor="end">{formatNiceDate(points[points.length - 1].date)}</text>
        )}
        <line x1={x(sp.date)} x2={x(sp.date)} y1={PAD.t} y2={H - PAD.b} stroke="var(--muted)" strokeDasharray="3 3" opacity="0.6" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(p.date)} cy={y(p.value)} r={i === shown ? 5.5 : 4} fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />
        ))}
      </svg>
    </div>
  );
}
