// Checks once a minute whether to show the "you haven't trained" reminder.
// This only runs while the app is open (or recently in the background) -
// a web app with no server can't wake itself up at an exact time.
import { useEffect } from 'react';
import type { Settings, Workout } from './db/types';
import { todayStatus } from './logic/rotation';
import { nowHHMM, shouldRemind, showNotification } from './logic/reminders';
import { todayStr } from './logic/dates';
import { db, updateSettings } from './db/db';

export function reminderDue(settings: Settings, workouts: Workout[], active: Workout | null): boolean {
  const today = todayStr();
  const status = todayStatus(settings.rotationState, settings.rotation, today);
  return shouldRemind({
    enabled: settings.reminderEnabled,
    isTrainingDay: status.kind === 'train',
    workedOutToday: !!active || workouts.some((w) => w.date === today),
    now: nowHHMM(),
    reminderTime: settings.reminderTime,
  });
}

export function useReminderChecker(settings: Settings | undefined, workouts: Workout[] | undefined, active: Workout | null | undefined) {
  useEffect(() => {
    if (!settings || !workouts || active === undefined) return;
    const check = async () => {
      const today = todayStr();
      if (settings.reminderLastFired === today || !reminderDue(settings, workouts, active)) return;
      const slot = settings.rotation[todayStatus(settings.rotationState, settings.rotation, today).index];
      const name = (await db.templates.get(slot))?.name ?? 'planned';
      if (await showNotification('Time to train 💪', `You haven't logged today's ${name} workout yet.`)) {
        await updateSettings({ reminderLastFired: today });
      }
    };
    void check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [settings, workouts, active]);
}
