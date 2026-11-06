// Old Selves (spec §8.11): finished months of your own data become clubs.
import { parityRating } from './engine';
import { AXES, type Axis, type AxisValues, type Tier } from './types';

export const SLOTS: { id: string; tier: Tier }[] = [
  { id: 'os1', tier: 3 }, { id: 'os2', tier: 4 }, { id: 'os3', tier: 4 }, { id: 'os4', tier: 5 }, { id: 'os5', tier: 5 }, { id: 'os6', tier: 6 }, { id: 'os7', tier: 6 },
];
const BAND_MID: Record<Tier, number> = { 1: 86, 2: 76, 3: 66, 4: 56, 5: 48, 6: 37 };
const NICK: Record<Axis, string> = { Pace: 'The Walkers', Power: 'The Lifters', Fuel: 'The Cooks', Rest: 'The Sleepers', Routine: 'The Regulars', Shape: 'The Measured' };
const STAND_INS = ['Old Harbour', 'Linkeroever Rovers', 'Dam Corinthians', 'Schelde Casuals', 'Berchem Amateurs', 'Borgerhout Nomads', 'Sint-Anna Strand'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface MonthData { month: string; values: AxisValues[] }
export interface OldSelf { id: string; tier: Tier; name: string; nickname: string; rating: number; month?: string; best?: Axis; standIn: boolean; /** That month's average radar. */ values?: AxisValues }

export const monthName = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
export function monthAverage(values: AxisValues[]): AxisValues {
  const out = {} as AxisValues;
  for (const a of AXES) out[a] = values.reduce((s, v) => s + v[a], 0) / Math.max(1, values.length);
  return out;
}
export function oldSelfFrom(m: MonthData, slot: { id: string; tier: Tier }): OldSelf {
  const avg = monthAverage(m.values);
  const best = AXES.reduce((b, a) => (avg[a] > avg[b] ? a : b), AXES[0]);
  return { id: slot.id, tier: slot.tier, name: `AFC ${monthName(m.month)}`, nickname: NICK[best], rating: Math.round(parityRating(avg)), month: m.month, best, standIn: false, values: avg };
}
/** Fill the seven slots: the most recent seven finished months, strongest in the highest slot; stand-ins for the rest. */
export function fillSlots(months: MonthData[], slots = SLOTS): OldSelf[] {
  const recent = [...months].filter((m) => m.values.length).sort((a, b) => b.month.localeCompare(a.month)).slice(0, slots.length);
  const built = recent.map((m) => oldSelfFrom(m, slots[0])).sort((a, b) => b.rating - a.rating);
  return slots.map((s, i) => {
    const o = built[i];
    if (o) return { ...o, id: s.id, tier: s.tier };
    return { id: s.id, tier: s.tier, name: STAND_INS[i], nickname: 'Stand-ins', rating: BAND_MID[s.tier], standIn: true };
  });
}

/**
 * Each season (spec §8.11): every finished month not yet in the league joins, and while there are more than the slots
 * hold, the weakest Old Self retires to the Old Selves Cup. Stand-ins make way first. Strongest go in the highest slot.
 */
export function rollOldSelves(current: OldSelf[], months: MonthData[], slots: { id: string; tier: Tier }[]): { filled: OldSelf[]; retired: OldSelf[] } {
  const real = current.filter((o) => !o.standIn);
  const have = new Set(real.map((o) => o.month));
  const fresh = months.filter((m) => m.values.length && !have.has(m.month)).sort((a, b) => a.month.localeCompare(b.month)).map((m) => oldSelfFrom(m, slots[0]));
  const pool = [...real, ...fresh];
  const retired: OldSelf[] = [];
  while (pool.length > slots.length) {
    // The weakest goes; on a tie, the older month.
    const i = pool.reduce((w, o, k) => (o.rating < pool[w].rating || (o.rating === pool[w].rating && (o.month ?? '') < (pool[w].month ?? '')) ? k : w), 0);
    retired.push(pool.splice(i, 1)[0]);
  }
  const ordered = [...slots].sort((a, b) => a.tier - b.tier);
  const built = [...pool].sort((a, b) => b.rating - a.rating);
  const filled = ordered.map((s, i) => {
    const o = built[i];
    if (o) return { ...o, id: s.id, tier: s.tier };
    return { id: s.id, tier: s.tier, name: STAND_INS[SLOTS.findIndex((x) => x.id === s.id) % STAND_INS.length], nickname: 'Stand-ins', rating: BAND_MID[s.tier], standIn: true };
  });
  return { filled, retired };
}
