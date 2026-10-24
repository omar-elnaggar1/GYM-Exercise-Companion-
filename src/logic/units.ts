// Kilograms vs pounds. Everything is STORED in kg; an exercise can be set
// to lb so you enter and see it in pounds (e.g. machines labelled in lb).
import type { Exercise } from '../db/types';

export type Unit = 'kg' | 'lb';

export const KG_PER_LB = 0.45359237;

/** Typical jumps on lb machines and dumbbells. */
export const LB_STEP = 5;
/** Standard Olympic bar in lb. */
export const LB_BAR = 45;

/** Convert a number you typed in `unit` to kg (kept precise so it converts back exactly). */
export function toKg(value: number, unit: Unit): number {
  return unit === 'lb' ? Math.round(value * KG_PER_LB * 1000) / 1000 : value;
}

/** Convert stored kg to `unit` for display/input. */
export function fromKg(kg: number, unit: Unit): number {
  return unit === 'lb' ? Math.round((kg / KG_PER_LB) * 10) / 10 : Math.round(kg * 1000) / 1000;
}

export const unitOf = (ex: Pick<Exercise, 'unit'> | undefined): Unit => ex?.unit ?? 'kg';

/** A tidy number: "62.5", "61.25", "45.4" (no float noise). */
export function fmtNum(v: number): string {
  const quarter = Math.round(v * 4) / 4;
  if (Math.abs(v - quarter) < 0.01) return String(quarter);
  return String(Math.round(v * 10) / 10);
}

/** "62.5 kg", "100 lb", or "BW" for 0. */
export function fmtWeight(kg: number, unit: Unit = 'kg'): string {
  return kg === 0 ? 'BW' : `${fmtNum(fromKg(kg, unit))} ${unit}`;
}

/** The empty bar for an exercise, in kg. */
export function barKgFor(ex: Pick<Exercise, 'barWeight' | 'unit'>, defaultBarKg = 20): number {
  if (ex.barWeight !== undefined) return ex.barWeight;
  return unitOf(ex) === 'lb' ? toKg(LB_BAR, 'lb') : defaultBarKg;
}

/** Bar options shown in the picker, in the exercise's unit. */
export const BAR_OPTIONS: Record<Unit, number[]> = {
  kg: [20, 15, 10, 7.5, 5],
  lb: [45, 35, 25, 15],
};
