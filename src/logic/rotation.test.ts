import { describe, expect, it } from 'vitest';
import { advanceAfterWorkout, resolveRotation, todayStatus } from './rotation';
import { DEFAULT_ROTATION as R } from '../db/seed';

// R = upper, lower, rest, push, pull, legs, rest
describe('rotation', () => {
  it('starts on Upper', () => {
    expect(todayStatus({ index: 0, since: '2026-01-05' }, R, '2026-01-05')).toEqual({ kind: 'train', slot: 'upper', index: 0 });
  });

  it('a training session waits for you, whatever the weekday', () => {
    // Upper was due Monday; it is Friday and still nothing logged -> still Upper.
    expect(todayStatus({ index: 0, since: '2026-01-05' }, R, '2026-01-09')).toMatchObject({ kind: 'train', slot: 'upper' });
  });

  it('finishing a workout shows "done" today and the next session tomorrow', () => {
    const s = advanceAfterWorkout({ index: 0, since: '2026-01-05' }, R, 'upper', '2026-01-05');
    expect(s).toEqual({ index: 1, since: '2026-01-06' });
    expect(todayStatus(s, R, '2026-01-05')).toEqual({ kind: 'done', index: 1 });
    expect(todayStatus(s, R, '2026-01-06')).toMatchObject({ kind: 'train', slot: 'lower' });
  });

  it('a rest day lasts one day then moves on by itself', () => {
    const afterLower = advanceAfterWorkout({ index: 1, since: '2026-01-06' }, R, 'lower', '2026-01-06');
    expect(todayStatus(afterLower, R, '2026-01-07')).toEqual({ kind: 'rest', index: 2 });
    expect(todayStatus(afterLower, R, '2026-01-08')).toMatchObject({ kind: 'train', slot: 'push' });
    // ...and Push then waits even if you come back days later
    expect(todayStatus(afterLower, R, '2026-01-12')).toMatchObject({ kind: 'train', slot: 'push' });
  });

  it('wraps around from the last rest day back to Upper', () => {
    const afterLegs = advanceAfterWorkout({ index: 5, since: '2026-01-10' }, R, 'legs', '2026-01-10');
    expect(todayStatus(afterLegs, R, '2026-01-11')).toEqual({ kind: 'rest', index: 6 });
    expect(todayStatus(afterLegs, R, '2026-01-12')).toMatchObject({ kind: 'train', slot: 'upper', index: 0 });
  });

  it('training on a rest day uses the next session and skips the rest', () => {
    const resting = { index: 2, since: '2026-01-07' };
    const s = advanceAfterWorkout(resting, R, 'push', '2026-01-07');
    expect(s).toEqual({ index: 4, since: '2026-01-08' });
  });

  it('doing a different session than planned jumps the rotation to after it', () => {
    expect(advanceAfterWorkout({ index: 0, since: '2026-01-05' }, R, 'pull', '2026-01-05').index).toBe(5);
  });

  it('an unknown template leaves the rotation alone', () => {
    const s = { index: 3, since: '2026-01-05' };
    expect(advanceAfterWorkout(s, R, 'arms', '2026-01-05')).toBe(s);
  });

  it('resolve clamps a bad index', () => {
    expect(resolveRotation({ index: 9, since: '2026-01-05' }, R, '2026-01-05').index).toBe(2);
  });
});
