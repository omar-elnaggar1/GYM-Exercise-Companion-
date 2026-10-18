// Plate calculator: which plates go on EACH side of the bar.
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Competition colors so it matches the plates in most gyms. */
export const PLATE_COLOR: Record<number, string> = {
  25: '#dc2626',
  20: '#2563eb',
  15: '#eab308',
  10: '#16a34a',
  5: '#e5e7eb',
  2.5: '#1f2937',
  1.25: '#9ca3af',
};

export interface PlateResult {
  perSide: number[];
  /** Kg per side that can't be made with the plates (0 = exact). */
  remainder: number;
}

/** null when the target is lighter than the empty bar. */
export function platesPerSide(total: number, bar = 20, plates = PLATES): PlateResult | null {
  if (total < bar) return null;
  let left = (total - bar) / 2;
  const perSide: number[] = [];
  for (const p of plates) {
    while (left >= p - 1e-9) {
      perSide.push(p);
      left -= p;
    }
  }
  return { perSide, remainder: Math.round(left * 100) / 100 };
}
