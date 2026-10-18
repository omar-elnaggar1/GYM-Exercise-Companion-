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
import { Sheet } from '../components/Sheet';

export function TodayScreen({
  settings,
  workouts,
  active,
  onGoWorkout,
}: {
  settings: Settings;
  workouts: Workout[];
  active: Workout | null;
  onGoWorkout: () => void;
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

  return (
    <div>
      <div className="muted">{formatNiceDate(today)}</div>

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
