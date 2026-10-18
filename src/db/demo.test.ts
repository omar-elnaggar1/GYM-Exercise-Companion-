import { describe, expect, it } from 'vitest';
import { buildDemoData } from './demo';
import { todayStatus } from '../logic/rotation';
import { computeStreak } from '../logic/streak';
import { deloadStatus } from '../logic/deload';

describe('tutorial sample data', () => {
  for (const today of ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']) {
    it(`is ready to show on ${today}`, () => {
      const d = buildDemoData(today);
      expect(d.workouts.length).toBeGreaterThan(15);
      expect(d.workouts.every((w) => w.date < today)).toBe(true);
      expect(todayStatus(d.settings.rotationState, d.settings.rotation, today).kind).toBe('train');
      expect(computeStreak(d.workouts, d.settings.rotation, today)).toBeGreaterThan(5);
      expect(deloadStatus(d.settings, today).kind).toBe('due');
      expect(d.bodyweight.length).toBeGreaterThan(30);
    });
  }
});
