import { describe, expect, it } from 'vitest';
import { acceptDeload, deloadStatus, skipDeload } from './deload';

const s = (start: string | null, until: string | null = null, every = 6) => ({
  deloadEveryWeeks: every,
  deloadCycleStart: start,
  deloadUntil: until,
});

describe('deload timing', () => {
  it('nothing before the first workout', () => {
    expect(deloadStatus(s(null), '2026-03-01')).toEqual({ kind: 'none', weeksIn: 0 });
  });

  it('not due at 5 weeks 6 days', () => {
    expect(deloadStatus(s('2026-01-05'), '2026-02-15')).toEqual({ kind: 'none', weeksIn: 5 });
  });

  it('due after exactly 6 weeks', () => {
    expect(deloadStatus(s('2026-01-05'), '2026-02-16')).toEqual({ kind: 'due' });
  });

  it('respects a custom interval (8 weeks)', () => {
    expect(deloadStatus(s('2026-01-05', null, 8), '2026-02-16').kind).toBe('none');
    expect(deloadStatus(s('2026-01-05', null, 8), '2026-03-02').kind).toBe('due');
  });

  it('accepting runs a 7-day deload, then a fresh block', () => {
    const a = acceptDeload('2026-02-16');
    const st = { ...s(null), ...a };
    expect(deloadStatus(st, '2026-02-16')).toEqual({ kind: 'active', daysLeft: 7 });
    expect(deloadStatus(st, '2026-02-22')).toEqual({ kind: 'active', daysLeft: 1 });
    expect(deloadStatus(st, '2026-02-23')).toEqual({ kind: 'none', weeksIn: 0 });
    expect(deloadStatus(st, '2026-04-06').kind).toBe('due');
  });

  it('skipping restarts the count from today', () => {
    const st = { ...s('2026-01-05'), ...skipDeload('2026-02-16') };
    expect(deloadStatus(st, '2026-02-17').kind).toBe('none');
    expect(deloadStatus(st, '2026-03-30').kind).toBe('due');
  });
});
