// An opponent's reach and modifiers from its rating (spec §7.4).
import { STYLES, type AbilityDef, type ClubDef } from './data/load';
import { clamp, type Axis, type AxisValues } from './types';

/**
 * Calibration (Task 1.7; see the ledger rulings). A match is sized by the gap between the club's rating and
 * your night's parity rating. At gap 0 each side converts t of its chances. A positive gap is squared and
 * damped (gap² ÷ C, then G × tanh(· ÷ G)), widens both landing regions by s per point and adds
 * per × gap × (value ÷ ref) to each of the club's modifiers. `top` is the parity rating of an all-18 night.
 */
export const CAL = { t: 0.45, s: 0.004, per: 0.03, G: 45, C: 20, top: 72, ref: 12, floor: 0 };
/** Nominal reach from the rating alone (spec §7.4), shown before a match. */
export const reachFor = (rating: number) => clamp(0.4 + 0.005 * rating, 0.4, 0.92);
const budget = (rating: number) => Math.max(0, (rating - 30) * 0.14);
const DATA_PER = 0.14;
const ATK: Axis[] = ['Pace', 'Power', 'Fuel'];
const DEF: Axis[] = ['Rest', 'Routine', 'Shape'];

export interface Opponent {
  id: string; rating: number;
  /** Nominal reach from the rating alone, for display before a match. */
  reach: number;
  /** The club's own modifiers at its rating, from data or style (display and weights). */
  shrinks: Partial<AxisValues>; presses: Partial<AxisValues>;
  /** Extra points on each modifier (a derby). */
  extra?: number;
  abilities: AbilityDef[]; hidden?: string;
}

export function modsFromStyle(rating: number, style: string): { shrinks: Partial<AxisValues>; presses: Partial<AxisValues> } {
  const s = STYLES[style] ?? STYLES.grit ?? { atk: [1 / 3, 1 / 3, 1 / 3], def: [1 / 3, 1 / 3, 1 / 3], split: 0.5, say: '' };
  const b = budget(rating);
  const shrinks: Partial<AxisValues> = {}, presses: Partial<AxisValues> = {};
  ATK.forEach((a, i) => (shrinks[a] = -b * s.split * s.atk[i]));
  DEF.forEach((a, i) => (presses[a] = -b * (1 - s.split) * s.def[i]));
  return { shrinks, presses };
}

const scale = (m: Partial<AxisValues>, k: number, extra = 0) => {
  const o: Partial<AxisValues> = {};
  for (const [a, d] of Object.entries(m) as [Axis, number][]) if (d) o[a] = d * k - extra;
  return o;
};

export function opponentFor(club: ClubDef, opts: { rating?: number; derby?: boolean } = {}): Opponent {
  const rating = opts.rating ?? club.rating ?? 50;
  const hasData = club.rating != null && Object.keys(club.shrinks).length + Object.keys(club.presses).length > 0;
  const src = hasData ? { shrinks: club.shrinks, presses: club.presses } : modsFromStyle(rating, club.style);
  const k = hasData && club.rating ? (club.rating > 30 ? budget(rating) / ((club.rating - 30) * DATA_PER) : 1) : 1;
  const extra = opts.derby ? 1 : 0;
  return {
    id: club.id, rating, reach: reachFor(rating), extra,
    shrinks: scale(src.shrinks, k, extra), presses: scale(src.presses, k, extra),
    abilities: [...club.known, ...(club.hidden ? [club.hidden] : [])],
    hidden: club.hidden?.name,
  };
}
