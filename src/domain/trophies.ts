import { fmtInt } from './format';
import type { Day, FoodEntry, Settings } from './types';
import { dayRings } from '../state/derived';

export interface Trophy { id: string; value: string; label: string }

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MIN_MONTHS = 2;

/** The three tiles on You, chosen from what the logs show. Part 2 adds your own picks. */
export function autoTrophies(i: { today: string; settings: Settings; days: Day[]; entries: FoodEntry[] }): Trophy[] {
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
  return out.slice(0, 3);
}
