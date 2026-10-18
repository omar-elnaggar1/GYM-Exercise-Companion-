// Simple vertical bar chart. Tap a bar to read its value.
import { useState } from 'react';

export interface Bar {
  label: string;
  value: number;
  detail: string;
  /** e.g. the current, unfinished week */
  partial?: boolean;
}

const W = 340;
const H = 160;
const PAD = { l: 8, r: 8, t: 10, b: 22 };

export function BarChart({ bars, ariaLabel }: { bars: Bar[]; ariaLabel: string }) {
  const [sel, setSel] = useState(bars.length - 1);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const slot = (W - PAD.l - PAD.r) / bars.length;
  const bw = Math.max(6, slot - 8);
  const h = (v: number) => (v / max) * (H - PAD.t - PAD.b);
  const s = bars[sel];

  return (
    <div>
      <div className="chart-readout">
        <b>{s.detail}</b>
        <span className="muted small"> · {s.label}{s.partial ? ' (so far)' : ''}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel}>
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--line)" />
        {bars.map((b, i) => {
          const bx = PAD.l + i * slot + (slot - bw) / 2;
          const bh = Math.max(b.value > 0 ? 4 : 0, h(b.value));
          const by = H - PAD.b - bh;
          return (
            // The tap target is the whole column, bigger than the bar.
            <g key={i} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
              <rect x={PAD.l + i * slot} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} fill="transparent" />
              {bh > 0 && (
                <path
                  d={`M${bx},${H - PAD.b} V${by + 4} Q${bx},${by} ${bx + 4},${by} H${bx + bw - 4} Q${bx + bw},${by} ${bx + bw},${by + 4} V${H - PAD.b} Z`}
                  fill="var(--accent)"
                  opacity={i === sel ? 1 : b.partial ? 0.35 : 0.6}
                />
              )}
              <text x={bx + bw / 2} y={H - 6} fill={i === sel ? 'var(--text)' : 'var(--muted)'} fontSize="10" textAnchor="middle">{b.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
