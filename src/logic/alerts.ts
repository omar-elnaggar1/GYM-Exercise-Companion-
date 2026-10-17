// Beep + vibrate when the rest timer ends.
// Phones only allow sound after you've tapped something, so we "unlock"
// the audio on your first tick.

let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* no audio - fine */
  }
}

export function beep(): void {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  // Three short, loud-ish beeps.
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    const start = t0 + i * 0.35;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  }
}

export function vibrate(): void {
  // Android supports this; iPhones ignore it (Apple doesn't allow it on the web).
  navigator.vibrate?.([300, 150, 300, 150, 300]);
}
