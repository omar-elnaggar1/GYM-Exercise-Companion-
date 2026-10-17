// A number with big − / + buttons. You can also tap the number to type.
import { useEffect, useState } from 'react';

const parse = (s: string) => parseFloat(s.replace(',', '.'));

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  compact = false,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  compact?: boolean;
  label?: string;
}) {
  // Keep what you're typing (e.g. "62.") until you leave the field.
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  const commit = (s: string) => {
    const v = parse(s);
    if (!Number.isNaN(v)) onChange(clamp(v));
  };

  return (
    <div className={'stepper' + (compact ? ' compact' : '')}>
      <button type="button" onClick={() => onChange(clamp(value - step))} aria-label={`Decrease ${label ?? ''}`}>−</button>
      <input
        inputMode="decimal"
        value={text}
        aria-label={label}
        onFocus={(e) => {
          setEditing(true);
          e.target.select();
        }}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => setEditing(false)}
      />
      <button type="button" onClick={() => onChange(clamp(value + step))} aria-label={`Increase ${label ?? ''}`}>+</button>
    </div>
  );
}
