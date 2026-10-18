// The tutorial: a card that walks through the main features using the
// sample data. Finishing or skipping deletes the sample data.
import { useEffect, useState } from 'react';
import type { Tab } from '../App';
import type { Settings, Workout } from '../db/types';
import { endTutorial } from '../db/db';
import { startWorkout } from '../db/actions';
import { todayStatus } from '../logic/rotation';
import { todayStr } from '../logic/dates';

interface Ctx {
  settings: Settings;
  active: Workout | null;
  setTab: (t: Tab) => void;
  startTimer: (seconds: number) => void;
  stopTimer: () => void;
}

interface Step {
  tab: Tab;
  /** CSS selector of the thing to point at. */
  target?: string;
  title: string;
  body: string;
  onEnter?: (ctx: Ctx) => void | Promise<void>;
}

// Guard so the sample workout is only started once.
let startedDemoWorkout = false;

const STEPS: Step[] = [
  {
    tab: 'today',
    title: 'Welcome! 👋',
    body: 'This quick tour uses SAMPLE data: 6 weeks of made-up workouts. Explore freely. When you finish or skip, it is all deleted and you start fresh.',
  },
  {
    tab: 'today',
    target: '.hero-title',
    title: 'Today',
    body: 'The app always knows which session is next in your split, whatever the weekday. The chips show what comes after.',
  },
  {
    tab: 'today',
    target: '.banner.warn',
    title: 'Deload weeks',
    body: 'Every 6 weeks (you can change it) the app suggests an easier week: about half the sets at about 90% of the weight. You can accept or skip it.',
  },
  {
    tab: 'today',
    target: '.card .ex-line',
    title: 'Your plan + last time',
    body: 'Each exercise shows what you did last time and any note you left. "⬆ Add weight today" means you hit the top of the rep range on every set.',
  },
  {
    tab: 'workout',
    target: '.set-row',
    title: 'Logging a workout',
    body: 'Sets are pre-filled from last time, so usually you just tap ✓. Tap the numbers to change weight or reps. Everything is saved instantly.',
    onEnter: async ({ active, settings }) => {
      if (active || startedDemoWorkout) return;
      startedDemoWorkout = true;
      const s = todayStatus(settings.rotationState, settings.rotation, todayStr());
      const id = s.kind === 'train' ? s.slot : settings.rotation.find((x) => x !== 'rest');
      if (id) await startWorkout(id, false);
    },
  },
  {
    tab: 'workout',
    target: '.timer',
    title: 'Rest timer',
    body: 'Ticking a set starts the rest timer: 150 s for the first exercise and 90 s for the others (editable). Use +15s / −15s or Skip. It beeps and vibrates when time is up.',
    onEnter: ({ startTimer }) => startTimer(90),
  },
  {
    tab: 'workout',
    target: '.swap-btn',
    title: 'Swap & notes',
    body: 'Machine taken? "Swap" offers alternatives for the same muscle, for today only or permanently. Use 📝 Note for things like "shoulder felt off". You\'ll see it next time.',
    onEnter: ({ stopTimer }) => stopTimer(),
  },
  {
    tab: 'history',
    target: '.stat-grid',
    title: 'Calendar & streak',
    body: 'The streak counts planned sessions in a row. Rest days never break it. The calendar is colored by session; tap a day to see what you did.',
  },
  {
    tab: 'body',
    target: '.card',
    title: 'Bodyweight',
    body: 'Weigh in daily with a couple of taps. The green line is the 7-day average, which smooths out daily water-weight swings.',
  },
  {
    tab: 'settings',
    target: '.split-btn',
    title: 'Your training split',
    body: 'Change the order of days, add rest days, create new sessions (e.g. "Arms") and edit their exercises here. Settings also has reminders, deload options and Export / Import for backups.',
  },
  {
    tab: 'today',
    title: "You're ready! 💪",
    body: 'Tap Finish to delete the sample data and start with your own program. You can replay this tour any time from Settings → Help.',
  },
];

export function Tour(ctx: Ctx) {
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const step = STEPS[i];

  // Go to the right tab, run the step's setup, then point at the target.
  useEffect(() => {
    let cancelled = false;
    let el: Element | null = null;
    void (async () => {
      ctx.setTab(step.tab);
      await step.onEnter?.(ctx);
      await new Promise((r) => setTimeout(r, 350));
      if (cancelled || !step.target) return;
      el = document.querySelector(step.target);
      el?.classList.add('tour-hl');
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    })();
    return () => {
      cancelled = true;
      el?.classList.remove('tour-hl');
      document.querySelectorAll('.tour-hl').forEach((e) => e.classList.remove('tour-hl'));
    };
    // Only re-run when the step changes.
  }, [i]);

  const finish = () => {
    setBusy(true);
    endTutorial();
  };
  const last = i === STEPS.length - 1;

  return (
    <div className="tour" role="dialog" aria-label="Tutorial">
      <div className="row spread">
        <span className="chip">🎓 Tutorial · sample data · {i + 1}/{STEPS.length}</span>
        {!last && (
          <button className="small ghost" onClick={finish} disabled={busy}>Skip</button>
        )}
      </div>
      <h3 style={{ margin: '8px 0 4px' }}>{step.title}</h3>
      <p className="small" style={{ margin: '0 0 10px' }}>{step.body}</p>
      <div className="btn-row">
        <button className="small" onClick={() => setI(i - 1)} disabled={i === 0 || busy}>← Back</button>
        {last ? (
          <button className="small primary" onClick={finish} disabled={busy}>{busy ? 'Cleaning up…' : 'Finish'}</button>
        ) : (
          <button className="small primary" onClick={() => setI(i + 1)}>Next →</button>
        )}
      </div>
    </div>
  );
}
