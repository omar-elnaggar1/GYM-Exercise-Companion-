// Home screen: "Today: Push", what's planned, and a big Start button.
import { useState } from 'react';
import type { Settings, Slot, Template, Workout } from '../db/types';
import { byId, useExercises, useTemplates } from '../hooks';
import { nextTrainingSlot, todayStatus } from '../logic/rotation';
import { acceptDeload, deloadStatus, skipDeload } from '../logic/deload';
import { formatNiceDate, todayStr } from '../logic/dates';
import { formatLast, suggestProgression } from '../logic/progression';
import { lastPerformanceMap, lastWorkoutNote, startWorkout } from '../db/actions';
import { updateSettings } from '../db/db';
import { reminderDue } from '../useReminders';
import { computeStreak, toStreakWorkouts } from '../logic/streak';
import { findPRs, fmtSet, fmtVolume, workoutVolume } from '../logic/progress';
import type { Tab } from '../App';
import { backupDue } from '../logic/backup';
import { exportBackupFile } from '../logic/shareBackup';
import { snoozeBackupReminder } from '../db/actions';
import { isTutorial } from '../db/db';
import { Sheet } from '../components/Sheet';

export function TodayScreen({
  settings,
  workouts,
  active,
  onGoWorkout,
  onGoTab,
  summaryId,
  onDismissSummary,
}: {
  settings: Settings;
  workouts: Workout[];
  active: Workout | null;
  onGoWorkout: () => void;
  onGoTab: (t: Tab) => void;
  summaryId: number | null;
  onDismissSummary: () => void;
}) {
  const templates = useTemplates();
  const exercises = byId(useExercises());
  const tMap = byId(templates);
  const [picking, setPicking] = useState(false);
  const today = todayStr();
  const status = todayStatus(settings.rotationState, settings.rotation, today);
  const deload = deloadStatus(settings, today);
  const last = lastPerformanceMap(workouts);
  const rot = settings.rotation;

  // Which session to show: today's, or (rest/done) the next one.
  const showIndex = status.kind === 'train' ? status.index : nextTrainingSlot(rot, status.index);
  const template = showIndex >= 0 ? tMap.get(rot[showIndex]) : undefined;

  const start = async (t: Template) => {
    await startWorkout(t.id, deload.kind === 'active');
    setPicking(false);
    onGoWorkout();
  };

  const slotName = (s: Slot) => (s === 'rest' ? 'Rest' : tMap.get(s)?.name ?? '…');
  const prevNote = template ? lastWorkoutNote(workouts, template.id) : '';
  const finished = workouts.filter((w) => w.finishedAt);
  const streak = computeStreak(toStreakWorkouts(finished, rot), rot, today);
  const summary = summaryId !== null ? finished.find((w) => w.id === summaryId) : undefined;
  const firstWorkout = finished.reduce<string | null>((min, w) => (!min || w.date < min ? w.date : min), null);
  const backupDays = isTutorial
    ? null
    : backupDue({
        lastBackup: settings.lastBackup ?? null,
        firstWorkout,
        snoozedUntil: settings.backupSnoozedUntil ?? null,
        today,
      });

  return (
    <div>
      <div className="row spread">
        <span className="muted">{formatNiceDate(today)}</span>
        <button
          className={'chip streak-chip' + (streak === 0 ? ' cold' : '')}
          onClick={() => onGoTab('history')}
          aria-label={`Streak: ${streak} sessions`}
        >
          🔥 {streak}
        </button>
      </div>

      {summary && (
        <WorkoutSummary
          workout={summary}
          workouts={finished}
          name={tMap.get(summary.templateId)?.name ?? 'Workout'}
          streak={streak}
          onClose={onDismissSummary}
          onProgress={() => {
            onDismissSummary();
            onGoTab('progress');
          }}
        />
      )}

      {status.kind === 'train' && template && (
        <div className="hero-title">
          <div className="bar" style={{ background: template.color }} />
          <h1>Today: {template.name}</h1>
        </div>
      )}
      {status.kind === 'rest' && <h1>Today: Rest day 😴</h1>}
      {status.kind === 'done' && <h1>Done for today ✅</h1>}

      <div className="rotation-strip" aria-label="Upcoming sessions">
        {Array.from({ length: rot.length }, (_, k) => {
          const i = (status.index + k) % rot.length;
          const s = rot[i];
          return (
            <span key={k} className={'chip' + (k === 0 && status.kind !== 'done' ? ' current' : '')}>
              {s !== 'rest' && <span className="dot" style={{ background: tMap.get(s)?.color }} />}
              {slotName(s)}
            </span>
          );
        })}
      </div>

      <div style={{ height: 12 }} />

      {active && (
        <div className="banner info">
          <div className="row spread">
            <span>Workout in progress: <b>{tMap.get(active.templateId)?.name}</b></span>
            <button className="primary small" onClick={onGoWorkout}>Resume</button>
          </div>
        </div>
      )}

      {backupDays !== null && (
        <div className="banner warn backup-banner">
          <b>💾 {settings.lastBackup ? `Last backup: ${backupDays} days ago` : 'You haven’t backed up yet'}</b>
          <div className="small" style={{ margin: '4px 0 10px' }}>
            Your workouts live only on this phone. Save a copy to Drive, iCloud or email - it takes 10 seconds.
          </div>
          <div className="btn-row">
            <button className="primary" onClick={() => void exportBackupFile()}>Back up now</button>
            <button onClick={() => snoozeBackupReminder(3)}>Later</button>
          </div>
        </div>
      )}

      {reminderDue(settings, workouts, active) && (
        <div className="banner warn">⏰ You haven't logged today's workout yet. Let's go!</div>
      )}

      {deload.kind === 'due' && (
        <div className="banner warn">
          <b>Deload week suggested</b>
          <div className="small" style={{ margin: '4px 0 10px' }}>
            You've trained {settings.deloadEveryWeeks} weeks. For the next 7 days, do about half the sets at ~90% of your
            weight to recover.
          </div>
          <div className="btn-row">
            <button className="primary" onClick={() => updateSettings(acceptDeload(today))}>Start deload</button>
            <button onClick={() => updateSettings(skipDeload(today))}>Skip</button>
          </div>
        </div>
      )}
      {deload.kind === 'active' && (
        <div className="banner info">
          🧘 Deload week: {deload.daysLeft} day{deload.daysLeft === 1 ? '' : 's'} left. Sets and weights are reduced automatically.
        </div>
      )}

      {status.kind !== 'train' && template && (
        <p className="muted">
          {status.kind === 'rest' ? 'Recover today. ' : ''}Next up: <b style={{ color: template.color }}>{template.name}</b>
          {status.kind === 'done' ? ' (tomorrow)' : ''}
        </p>
      )}

      {template && !active && (
        <button className={'big' + (status.kind === 'train' ? ' primary' : '')} onClick={() => start(template)}>
          {status.kind === 'train' ? `Start ${template.name} workout` : `Train anyway: ${template.name}`}
        </button>
      )}
      {!active && (
        <button className="ghost small" style={{ width: '100%', marginTop: 8 }} onClick={() => setPicking(true)}>
          Choose a different session
        </button>
      )}

      {template && (
        <>
          <h2>{template.name} plan</h2>
          {prevNote && <div className="note-line">📝 Last {template.name} note: {prevNote}</div>}
          <div className="card">
            {template.items.map((item, i) => {
              const ex = exercises.get(item.exerciseId);
              if (!ex) return null;
              const lp = last.get(ex.id);
              const up = lp && deload.kind !== 'active' ? suggestProgression(lp.sets, item.sets, item.repMax, ex.increment) : null;
              return (
                <div key={i} className="ex-line">
                  <div className="row spread">
                    <b>{ex.name}</b>
                    <span className="muted small nowrap">
                      {item.sets} × {item.repMin}–{item.repMax}
                      {ex.timed ? ' s' : ''}
                      {ex.perSide ? ' /side' : ''}
                    </span>
                  </div>
                  <div className="muted small">{lp ? `Last: ${formatLast(lp.sets, ex.timed)}` : 'No history yet'}</div>
                  {lp?.note && <div className="note-line">📝 {lp.note}</div>}
                  {up !== null && <span className="badge-up">⬆ Add weight today: {up} kg</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {picking && (
        <Sheet title="Pick a session" onClose={() => setPicking(false)}>
          {templates.filter((t) => !t.archived).map((t) => (
            <button key={t.id} className="list-btn" onClick={() => start(t)}>
              <span className="row">
                <span className="dot" style={{ background: t.color }} />
                {t.name}
              </span>
              <span className="muted small">{t.items.length} exercises</span>
            </button>
          ))}
        </Sheet>
      )}
    </div>
  );
}

/** Shown right after you finish: duration, sets, volume, PRs. */
function WorkoutSummary({
  workout,
  workouts,
  name,
  streak,
  onClose,
  onProgress,
}: {
  workout: Workout;
  workouts: Workout[];
  name: string;
  streak: number;
  onClose: () => void;
  onProgress: () => void;
}) {
  const exercises = byId(useExercises());
  const { events, records } = findPRs(workouts, [...exercises.values()]);
  const prs = events.filter((e) => e.workoutId === workout.id);
  const minutes = Math.max(1, Math.round(((workout.finishedAt ?? 0) - workout.startedAt) / 60_000));
  const sets = workout.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const volume = workoutVolume(workout);
  // Compare with the previous time you did this session.
  const prev = workouts
    .filter((w) => w.templateId === workout.templateId && (w.finishedAt ?? 0) < (workout.finishedAt ?? 0))
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))[0];
  const prevVol = prev ? workoutVolume(prev) : 0;
  const delta = prevVol > 0 ? Math.round(((volume - prevVol) / prevVol) * 100) : null;
  const baseline = !workouts.some((w) => (w.finishedAt ?? 0) < (workout.finishedAt ?? 0));

  return (
    <div className="card" style={{ borderColor: 'var(--accent)', marginTop: 12 }}>
      <div className="row spread">
        <h3>🎉 {name} done!</h3>
        <button className="icon small ghost" onClick={onClose} aria-label="Close summary">✕</button>
      </div>
      <div className="summary-grid">
        <div><div className="n">{minutes}</div><div className="muted small">min</div></div>
        <div><div className="n">{sets}</div><div className="muted small">sets</div></div>
        <div><div className="n">{fmtVolume(volume)}</div><div className="muted small">lifted</div></div>
      </div>
      {delta !== null && (
        <p className="small" style={{ margin: '0 0 8px' }}>
          {delta >= 0 ? '📈' : '📉'} {delta >= 0 ? '+' : ''}{delta}% volume vs your last {name}
        </p>
      )}
      {prs.length > 0 ? (
        <div className="small">
          <b>🏆 {prs.length} new PR{prs.length === 1 ? '' : 's'}:</b>
          {prs.map((e, i) => (
            <div key={i}>• {exercises.get(e.exerciseId)?.name}: {fmtSet(e.set, records.get(e.exerciseId)?.metric ?? 'e1rm')}</div>
          ))}
        </div>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>
          {baseline
            ? 'First session logged. This is your starting point; records start counting from next time.'
            : 'No new records this time. Consistency is what builds them. 💪'}
        </p>
      )}
      {streak > 1 && <p className="small" style={{ margin: '8px 0 0' }}>🔥 {streak} sessions in a row. Keep it going!</p>}
      <button className="small" style={{ width: '100%', marginTop: 10 }} onClick={onProgress}>See your progress ›</button>
    </div>
  );
}
