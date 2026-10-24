import { describe, expect, it } from 'vitest';
import { PLATES_LB, platesPerSide } from './plates';

describe('plate calculator', () => {
  it('62.5 kg on a 20 kg bar = 20 + 1.25 per side', () =>
    expect(platesPerSide(62.5)).toEqual({ perSide: [20, 1.25], remainder: 0 }));
  it('100 kg = 25 + 15 per side', () => expect(platesPerSide(100)).toEqual({ perSide: [25, 15], remainder: 0 }));
  it('empty bar', () => expect(platesPerSide(20)).toEqual({ perSide: [], remainder: 0 }));
  it('lighter than the bar', () => expect(platesPerSide(15)).toBeNull());
  it('reports what cannot be loaded', () => expect(platesPerSide(21)).toEqual({ perSide: [], remainder: 0.5 }));
  it('other bar weights', () => expect(platesPerSide(45, 15)).toEqual({ perSide: [15], remainder: 0 }));
  it('EZ bar (10 kg)', () => expect(platesPerSide(30, 10)).toEqual({ perSide: [10], remainder: 0 }));
  it('pounds: 225 lb on a 45 lb bar = 45 + 45 per side', () =>
    expect(platesPerSide(225, 45, PLATES_LB)).toEqual({ perSide: [45, 45], remainder: 0 }));
  it('pounds: 135 lb = one 45 per side', () => expect(platesPerSide(135, 45, PLATES_LB)).toEqual({ perSide: [45], remainder: 0 }));
});
