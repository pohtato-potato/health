// The chance on Tonight and Today (ledger O40): the dry run's input, played out on fixed seeds, kept for as long as the
// input stays the same. A new log, a new plan or a new day changes the input and so the figure; nothing else does.
import { dayOfLogging, type DayKey } from '../../domain/dates';
import { chanceOf, expectedPoints, type Chance } from '../chance';
import { db } from '../../db/db';
import { ruleValue } from '../tree/research';
import { activeFor } from './tree';
import type { MatchInput } from '../engine';
import type { Axis, Comp } from '../types';
import { DAILY_AXES } from '../matchup';
import { tonightInput } from './play';

const kept = new Map<string, Chance>();
function played(input: MatchInput): Chance {
  const key = JSON.stringify({ ...input, seed: 0 });
  const hit = kept.get(key);
  if (hit) return hit;
  const c = chanceOf(input);
  if (kept.size > 24) kept.clear();
  kept.set(key, c);
  return c;
}

/**
 * Tonight's chance. `now`: the night as it stands, today's logs so far. Before anything of today is logged, `usual`
 * leads instead: tonight's match on a usual night (the median of the last 28 days), the same way the placing measured
 * it, since an empty morning plays every daily axis low and wild. Null with no match tonight.
 */
export interface TonightChance { now: Chance; usual?: Chance; nothingYet: boolean; /** The daily axes still in fog (not logged). */ fog: Axis[] }
/** One chance per match of tonight, in playing order (a double-header night has two or more): finding 1, O42. */
export interface NightChance extends TonightChance { comp?: Comp; oppId?: string; round?: string }
export async function loadChances(date: DayKey): Promise<NightChance[]> {
  const t = await tonightInput(date);
  if (!t) return [];
  return t.all.map(({ input, comp, oppId, round }) => {
    const fog = DAILY_AXES.filter((a) => (input.fog ?? []).includes(a));
    const usual = t.usual ? played({ ...input, values: t.usual, fog: [] }) : undefined;
    return { now: played(input), ...(usual ? { usual } : {}), nothingYet: fog.length === DAILY_AXES.length, fog, comp, oppId, round };
  });
}
export async function loadChance(date: DayKey): Promise<TonightChance | null> {
  return (await loadChances(date))[0] ?? null;
}

/**
 * Expected points from tonight's chance, while the head of data is at work (the Data team tech, ledger O40): the same
 * figure the chance bar leads with (a usual night before the first log). Null without the head of data, on leave, or
 * with no match tonight. Reads only.
 */
export async function loadExpected(date: DayKey, now = Date.now()): Promise<{ xp: number; usual: boolean } | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  const on = activeFor(save, await db.fbBundles.toArray());
  if (ruleValue(on, 'expected-points', 0) <= 0) return null;
  const c = await loadChance(date);
  if (!c) return null;
  // From 6 pm (or on a past day) "as it stands" leads, as on the chance bar (finding 4, O42).
  const late = date < dayOfLogging(now) || new Date(now).getHours() >= 18;
  const usual = Boolean(c.nothingYet && c.usual && !late);
  return { xp: expectedPoints(usual ? c.usual! : c.now), usual };
}
