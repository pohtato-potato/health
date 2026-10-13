import type { Equipment } from './types';

/**
 * Loads you can make from your plates. Plates go on in matching pairs, one each
 * side of the handle, so a dumbbell moves in steps of two plates. A pair of
 * dumbbells needs the same plates twice over.
 */
/** A typical gym rack: 2.5 kg steps up to 50 kg. */
export const GYM_RACK = Array.from({ length: 20 }, (_, i) => (i + 1) * 2.5);

export function loadOptions(eq: Equipment, kind: 'pair' | 'single', includeUnowned = false): number[] {
  if (eq.gym) return GYM_RACK;
  const plates = eq.plates.filter((p) => p.count > 0 && (includeUnowned || p.owned));
  // Pairs of plates per dumbbell available for each plate size.
  const maxPairs = plates.map((p) => Math.floor(p.count / (kind === 'pair' ? 4 : 2)));
  const out = new Set<number>();
  const walk = (i: number, total: number) => {
    if (i === plates.length) {
      if (total > 0) out.add(round(total));
      return;
    }
    for (let k = 0; k <= maxPairs[i]; k++) walk(i + 1, total + 2 * k * plates[i].kg);
  };
  walk(0, 0);
  for (const kg of eq.fixed) out.add(round(kg));
  return [...out].sort((a, b) => a - b);
}

const round = (n: number) => Math.round(n * 100) / 100;

export interface NextLoad {
  /** The next load up with what you own now. */
  next?: number;
  /** A smaller step that needs plates you haven't got yet. */
  smaller?: { kg: number; plateKg: number };
}

export function nextLoad(eq: Equipment, kind: 'pair' | 'single', current: number): NextLoad {
  const owned = loadOptions(eq, kind).find((kg) => kg > current + 1e-9);
  const any = loadOptions(eq, kind, true).find((kg) => kg > current + 1e-9);
  const result: NextLoad = { next: owned };
  if (eq.gym) return result;
  if (any !== undefined && (owned === undefined || any < owned - 1e-9)) {
    const missing = eq.plates.filter((p) => !p.owned && p.count > 0).map((p) => p.kg);
    result.smaller = { kg: any, plateKg: Math.min(...missing) };
  }
  return result;
}

export function isBigJump(from: number, to: number, threshold = 0.25): boolean {
  return from > 0 && (to - from) / from > threshold + 1e-9;
}

export function fmtKg(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : String(round(kg));
}

/** The loads to offer as chips: every load the kit can make for this kind, smallest first. */
export function chipLoads(eq: Equipment, kind: 'pair' | 'single'): number[] {
  return [...new Set(loadOptions(eq, kind))].sort((a, b) => a - b);
}
