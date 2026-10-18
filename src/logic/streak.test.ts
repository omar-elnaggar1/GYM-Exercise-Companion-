import { describe, expect, it } from 'vitest';
import { computeStreak, toStreakWorkouts } from './streak';
import { DEFAULT_ROTATION as R } from '../db/seed';

// slots: 0 upper, 1 lower, 2 rest, 3 push, 4 pull, 5 legs, 6 rest
const w = (date: string, slotIndex: number) => ({ date, slotIndex });

describe('streak', () => {
  it('is 0 with no workouts', () => {
    expect(computeStreak([], R, '2026-01-05')).toBe(0);
  });

  it('rest days in the rotation do not break it', () => {
    const list = [
      w('2026-01-05', 0), // Mon upper
      w('2026-01-06', 1), // Tue lower
      // Wed rest
      w('2026-01-08', 3), // Thu push
      w('2026-01-09', 4), // Fri pull
      w('2026-01-10', 5), // Sat legs
      // Sun rest
      w('2026-01-12', 0), // Mon upper
    ];
    expect(computeStreak(list, R, '2026-01-12')).toBe(6);
  });

  it('a missed training day resets it', () => {
    const list = [w('2026-01-05', 0), w('2026-01-07', 1), w('2026-01-09', 3)];
    // upper->lower had an idle day (not allowed), lower->push had one (allowed)
    expect(computeStreak(list, R, '2026-01-09')).toBe(2);
  });

  it('today not trained yet does not break it', () => {
    expect(computeStreak([w('2026-01-05', 0), w('2026-01-06', 1)], R, '2026-01-07')).toBe(2);
    // the day after Lower is a rest day, so tomorrow is fine too
    expect(computeStreak([w('2026-01-05', 0), w('2026-01-06', 1)], R, '2026-01-08')).toBe(2);
  });

  it('is 0 once a training day has passed without a workout', () => {
    expect(computeStreak([w('2026-01-05', 0)], R, '2026-01-07')).toBe(0);
    expect(computeStreak([w('2026-01-06', 1)], R, '2026-01-09')).toBe(0);
  });

  it('two workouts on one day count once', () => {
    expect(computeStreak([w('2026-01-05', 0), w('2026-01-05', 0)], R, '2026-01-05')).toBe(1);
  });

  it('training on a rest day is fine', () => {
    expect(computeStreak([w('2026-01-06', 1), w('2026-01-07', 3)], R, '2026-01-07')).toBe(2);
  });
});

describe('streak after editing the split', () => {
  it('keeps a slot that still matches', () => {
    expect(toStreakWorkouts([{ date: '2026-01-05', slotIndex: 3, templateId: 'push' }], R)[0].slotIndex).toBe(3);
  });
  it('finds the session again if it moved', () => {
    const moved = ['push', 'pull', 'legs', 'rest', 'upper', 'lower', 'rest'];
    expect(toStreakWorkouts([{ date: '2026-01-05', slotIndex: 3, templateId: 'push' }], moved)[0].slotIndex).toBe(0);
  });
  it('a removed session no longer counts', () => {
    expect(toStreakWorkouts([{ date: '2026-01-05', slotIndex: 0, templateId: 'arms' }], R)[0].slotIndex).toBe(-1);
  });
});
