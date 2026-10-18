import { describe, expect, it } from 'vitest';
import { backupDue } from './backup';

const base = { lastBackup: null, firstWorkout: '2026-10-01', snoozedUntil: null, today: '2026-10-10' };

describe('backup reminder', () => {
  it('nothing to back up yet', () => expect(backupDue({ ...base, firstWorkout: null })).toBeNull());
  it('not before 14 days of training', () => expect(backupDue(base)).toBeNull());
  it('due 14 days after the first workout if never backed up', () =>
    expect(backupDue({ ...base, today: '2026-10-15' })).toBe(14));
  it('counts from the last backup', () => {
    expect(backupDue({ ...base, lastBackup: '2026-10-10', today: '2026-10-20' })).toBeNull();
    expect(backupDue({ ...base, lastBackup: '2026-10-10', today: '2026-10-26' })).toBe(16);
  });
  it('snooze hides it until the date', () => {
    expect(backupDue({ ...base, today: '2026-10-20', snoozedUntil: '2026-10-23' })).toBeNull();
    expect(backupDue({ ...base, today: '2026-10-23', snoozedUntil: '2026-10-23' })).toBe(22);
  });
});
