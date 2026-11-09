import { fmtInt } from './format';
import type { Sighting } from './creatures';
import { lastMonth } from './film';
import type { Day, FoodEntry, SetEntry, Settings } from './types';
import { kmFromSteps } from './walk';
import { dayRings } from '../state/derived';

export interface Trophy { id: string; value: string; label: string }

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MIN_MONTHS = 2;

interface TrophyInput {
  today: string;
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  sets?: SetEntry[];
  sightings?: Sighting[];
}

/** Everything that could sit in the case, best first. */
export function trophyCandidates(i: TrophyInput): Trophy[] {
  const out: Trophy[] = [];
  const stepDays = i.days.filter((d) => d.steps);
  if (stepDays.length) {
    out.push({ id: 'steps', value: fmtInt(Math.max(...stepDays.map((d) => d.steps!))), label: 'Most steps in a day' });
  }
  const months = new Map<string, number>();
  for (const d of stepDays) months.set(d.date.slice(0, 7), (months.get(d.date.slice(0, 7)) ?? 0) + d.steps!);
  if (months.size >= MIN_MONTHS) {
    const [best] = [...months].reduce((a, b) => (b[1] > a[1] ? b : a));
    out.push({ id: 'month', value: SHORT_MONTHS[Number(best.slice(5)) - 1], label: 'Best month so far' });
  }
  const foodBy = new Map<string, FoodEntry[]>();
  for (const e of i.entries) foodBy.set(e.date, [...(foodBy.get(e.date) ?? []), e]);
  const perfect = i.days.filter((d) => d.date < i.today && dayRings(i.settings, d.date, d, foodBy.get(d.date) ?? []).rings.perfect).length;
  if (perfect) out.push({ id: 'perfect', value: fmtInt(perfect), label: 'Perfect days so far' });
  const records = (i.sets ?? []).filter((s) => s.mark === '!!' && !s.skipped).length;
  if (records) out.push({ id: 'records', value: fmtInt(records), label: 'Records so far' });
  const last = lastMonth(i.today);
  const lastSteps = months.get(last);
  if (lastSteps) out.push({ id: 'lastmonth', value: fmtInt(kmFromSteps(lastSteps)), label: `km in ${LONG_MONTHS[Number(last.slice(5)) - 1]}` });
  return out;
}

/** Your picks, in your order; with none, the first ones that fit. */
export function pickedTrophies(all: Trophy[], picks: string[] | undefined, limit: number): Trophy[] {
  const chosen = picks?.length ? picks.flatMap((id) => all.filter((t) => t.id === id)) : all;
  return chosen.slice(0, limit);
}

/** The three tiles on You. */
export const autoTrophies = (i: TrophyInput): Trophy[] => pickedTrophies(trophyCandidates(i), i.settings.trophyPicks, 3);
