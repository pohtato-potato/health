// The chance on Tonight and Today (ledger O40): the dry run's input, played out on fixed seeds, kept for as long as the
// input stays the same. A new log, a new plan or a new day changes the input and so the figure; nothing else does.
import type { DayKey } from '../../domain/dates';
import { chanceOf, expectedPoints, type Chance } from '../chance';
import { db } from '../../db/db';
import { ruleValue } from '../tree/research';
import { activeFor } from './tree';
import type { MatchInput } from '../engine';
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
export interface TonightChance { now: Chance; usual?: Chance; nothingYet: boolean }
export async function loadChance(date: DayKey): Promise<TonightChance | null> {
  const t = await tonightInput(date);
  if (!t) return null;
  const nothingYet = DAILY_AXES.every((a) => (t.input.fog ?? []).includes(a));
  const usual = t.usual ? played({ ...t.input, values: t.usual, fog: [] }) : undefined;
  return { now: played(t.input), ...(usual ? { usual } : {}), nothingYet };
}

/**
 * Expected points from tonight's chance, while the head of data is at work (the Data team tech, ledger O40): the same
 * figure the chance bar leads with (a usual night before the first log). Null without the head of data, on leave, or
 * with no match tonight. Reads only.
 */
export async function loadExpected(date: DayKey): Promise<{ xp: number; usual: boolean } | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  const on = activeFor(save, await db.fbBundles.toArray());
  if (ruleValue(on, 'expected-points', 0) <= 0) return null;
  const c = await loadChance(date);
  if (!c) return null;
  const usual = Boolean(c.nothingYet && c.usual);
  return { xp: expectedPoints(usual ? c.usual! : c.now), usual };
}
