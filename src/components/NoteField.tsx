// A text box that saves itself shortly after you stop typing.
import { useEffect, useRef, useState } from 'react';

export function NoteField({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(onSave);
  latest.current = onSave;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <textarea
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => latest.current(v), 400);
      }}
      onBlur={() => {
        window.clearTimeout(timer.current);
        if (text !== value) latest.current(text);
      }}
    />
  );
}
