import { describe, expect, it } from 'vitest';
import { shouldRemind } from './reminders';

const base = { enabled: true, isTrainingDay: true, workedOutToday: false, now: '18:30', reminderTime: '18:00' };

describe('reminders', () => {
  it('reminds after the time on a training day', () => expect(shouldRemind(base)).toBe(true));
  it('not before the time', () => expect(shouldRemind({ ...base, now: '17:59' })).toBe(false));
  it('not on rest days', () => expect(shouldRemind({ ...base, isTrainingDay: false })).toBe(false));
  it('not once you trained', () => expect(shouldRemind({ ...base, workedOutToday: true })).toBe(false));
  it('not when switched off', () => expect(shouldRemind({ ...base, enabled: false })).toBe(false));
});
