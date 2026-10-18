// When to remind you to export a backup.
import { daysBetween } from './dates';

export const BACKUP_EVERY_DAYS = 14;

/**
 * Days since the last backup if a reminder is due, otherwise null.
 * Never backed up counts from your first workout. Snoozing hides it
 * until the given date.
 */
export function backupDue(opts: {
  lastBackup: string | null;
  firstWorkout: string | null;
  snoozedUntil: string | null;
  today: string;
}): number | null {
  const { lastBackup, firstWorkout, snoozedUntil, today } = opts;
  if (!firstWorkout) return null; // nothing to lose yet
  if (snoozedUntil && today < snoozedUntil) return null;
  const since = daysBetween(lastBackup ?? firstWorkout, today);
  return since >= BACKUP_EVERY_DAYS ? since : null;
}
