import { describe, expect, it } from 'vitest';
import { barKgFor, fmtNum, fmtWeight, fromKg, toKg } from './units';

describe('units', () => {
  it('100 lb -> kg and back is exact', () => {
    expect(toKg(100, 'lb')).toBeCloseTo(45.359, 3);
    expect(fromKg(toKg(100, 'lb'), 'lb')).toBe(100);
    expect(fromKg(toKg(105, 'lb'), 'lb')).toBe(105);
  });
  it('kg stays kg', () => {
    expect(toKg(62.5, 'kg')).toBe(62.5);
    expect(fromKg(62.5, 'kg')).toBe(62.5);
  });
  it('formats tidily', () => {
    expect(fmtNum(62.5)).toBe('62.5');
    expect(fmtNum(61.25)).toBe('61.25');
    expect(fmtNum(45.359)).toBe('45.4');
    expect(fmtWeight(toKg(100, 'lb'), 'lb')).toBe('100 lb');
    expect(fmtWeight(toKg(100, 'lb'))).toBe('45.4 kg');
    expect(fmtWeight(0, 'lb')).toBe('BW');
  });
  it('bar weight per exercise', () => {
    expect(barKgFor({}, 20)).toBe(20);
    expect(barKgFor({}, 15)).toBe(15);
    expect(barKgFor({ barWeight: 10 }, 20)).toBe(10);
    expect(fromKg(barKgFor({ unit: 'lb' }), 'lb')).toBe(45);
  });
});
