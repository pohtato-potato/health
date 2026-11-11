/**
 * Label mode (l-label, 11 Nov): a form shaped like the pack's label. Type what the label says, per 100 g or per
 * serving, the pack size, and how much was eaten; the app does the sum and shows it before saving.
 */
export interface LabelInput {
  basis: 'per100' | 'serving';
  /** kcal and protein as printed, for 100 g or for one serving. */
  kcal: number;
  protein: number;
  /** One serving's weight, when the label counts by serving. */
  servingG?: number;
  /** The whole pack. */
  packG?: number;
  /** How much was eaten, in grams. */
  eatenG: number;
}

/** Grams the printed numbers refer to: 100, or one serving. Undefined when a serving has no weight yet. */
export function basisGrams(l: Pick<LabelInput, 'basis' | 'servingG'>): number | undefined {
  if (l.basis === 'per100') return 100;
  return l.servingG && l.servingG > 0 ? l.servingG : undefined;
}

/** The sum: kcal and protein for what was eaten, rounded (protein to 0.1 g). Undefined until it can be worked out. */
export function labelTotals(l: LabelInput): { kcal: number; protein: number } | undefined {
  const g = basisGrams(l);
  if (!g || !(l.eatenG > 0) || !(l.kcal >= 0) || !(l.protein >= 0)) return undefined;
  const f = l.eatenG / g;
  return { kcal: Math.round(l.kcal * f), protein: Math.round(l.protein * f * 10) / 10 };
}

/** The line shown on the entry, so the sum can be checked later. */
export function labelPortion(l: LabelInput): string {
  const whole = l.packG && Math.abs(l.eatenG - l.packG) < 0.5 ? ' (the whole pack)' : l.packG ? ` of a ${l.packG} g pack` : '';
  return `${Math.round(l.eatenG)} g${whole}, from the label`;
}
