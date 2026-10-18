// The app shell: bottom tabs, the rest timer and the reminder checker.
import { useCallback, useEffect, useState } from 'react';
import { useActiveWorkout, useSettings, useWorkouts } from './hooks';
import { TodayScreen } from './screens/TodayScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { BodyScreen } from './screens/BodyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { RestTimer, loadTimer, saveTimer, type TimerState } from './components/RestTimer';
import { useReminderChecker } from './useReminders';
import { Tour } from './components/Tour';
import { isTutorial } from './db/db';

export type Tab = 'today' | 'workout' | 'progress' | 'history' | 'body' | 'settings';

const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: 'today', label: 'Today', ico: '🏠' },
  { id: 'workout', label: 'Workout', ico: '🏋️' },
  { id: 'progress', label: 'Progress', ico: '📈' },
  { id: 'history', label: 'History', ico: '📅' },
  { id: 'body', label: 'Body', ico: '⚖️' },
  { id: 'settings', label: 'Settings', ico: '⚙️' },
];

export function App() {
  const settings = useSettings();
  const active = useActiveWorkout();
  const workouts = useWorkouts();
  const [tab, setTab] = useState<Tab>('today');
  const [timer, setTimerState] = useState<TimerState | null>(loadTimer);
  // The workout you just finished, to show its summary on Today.
  const [summaryId, setSummaryId] = useState<number | null>(null);
  // A finished workout being fixed from History.
  const [editingId, setEditingId] = useState<number | null>(null);
  const editingWorkout = editingId !== null ? workouts?.find((w) => w.id === editingId) : undefined;

  const setTimer = useCallback((t: TimerState | null) => {
    setTimerState(t);
    saveTimer(t);
  }, []);

  useReminderChecker(settings, workouts, active);

  // If the app reopens mid-workout, go straight back to it.
  const [jumped, setJumped] = useState(false);
  useEffect(() => {
    if (!jumped && active) {
      setTab('workout');
      setJumped(true);
    }
  }, [active, jumped]);

  useEffect(() => window.scrollTo(0, 0), [tab]);

  if (!settings || workouts === undefined || active === undefined) {
    return <div className="screen muted">Loading…</div>;
  }

  const timerOn = !!timer && !!settings;
  return (
    <>
      {isTutorial && (
        <Tour
          settings={settings}
          active={active}
          setTab={setTab}
          startTimer={(seconds) => setTimer({ endsAt: Date.now() + seconds * 1000, total: seconds, label: 'Tutorial' })}
          stopTimer={() => setTimer(null)}
        />
      )}
      <div className={'screen' + (timerOn ? ' with-timer' : '') + (isTutorial ? ' with-tour' : '')}>
        {tab === 'today' && (
          <TodayScreen
            settings={settings}
            workouts={workouts}
            active={active}
            onGoWorkout={() => setTab('workout')}
            onGoTab={setTab}
            summaryId={summaryId}
            onDismissSummary={() => setSummaryId(null)}
          />
        )}
        {tab === 'progress' && <ProgressScreen workouts={workouts} />}
        {tab === 'workout' && (
          <WorkoutScreen
            workout={active}
            settings={settings}
            workouts={workouts}
            onStartRest={(seconds, label) => setTimer({ endsAt: Date.now() + seconds * 1000, total: seconds, label })}
            onClose={() => {
              setTimer(null);
              setTab('today');
            }}
            onFinished={(id) => {
              setTimer(null);
              setSummaryId(id);
              setTab('today');
            }}
            onGoToday={() => setTab('today')}
          />
        )}
        {tab === 'history' && editingWorkout && (
          <WorkoutScreen
            mode="edit"
            workout={editingWorkout}
            settings={settings}
            workouts={workouts}
            onStartRest={() => {}}
            onClose={() => setEditingId(null)}
            onFinished={() => setEditingId(null)}
            onGoToday={() => setEditingId(null)}
            onDone={() => setEditingId(null)}
          />
        )}
        {tab === 'history' && !editingWorkout && (
          <HistoryScreen workouts={workouts} settings={settings} onEditWorkout={setEditingId} />
        )}
        {tab === 'body' && <BodyScreen />}
        {tab === 'settings' && <SettingsScreen settings={settings} />}
      </div>

      {timer && (
        <RestTimer timer={timer} onChange={setTimer} sound={settings.timerSound} vibration={settings.timerVibrate} />
      )}

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={(tab === t.id ? 'active' : '') + (t.id === 'workout' && active && tab !== t.id ? ' live' : '')}
            onClick={() => {
              setEditingId(null);
              setTab(t.id);
            }}
          >
            <span className="ico">{t.ico}</span>
            {t.id === 'workout' && active ? 'Live ●' : t.label}
          </button>
        ))}
      </nav>
    </>
  );
}
