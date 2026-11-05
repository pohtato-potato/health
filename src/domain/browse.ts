import { seeded } from './creatures';
import { addDays, weekStart, type DayKey } from './dates';
import { fmtDayMonth, fmtInt } from './format';
import { statDeck } from './shakeStats';
import type { Day, FoodEntry, Measurement, SetEntry, Settings, TrainingSession } from './types';
import { positionAt } from './walk';

export interface BrowseInput {
  today: DayKey;
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  measurements: Measurement[];
}
export interface Question { id: string; label: string; answer(i: BrowseInput): string | undefined }

const LATE_HOUR = 23;
const MIN_OFFICE_DAYS = 3;
const TAKE_DAYS = 14;

/** Questions you can keep on the page. An answer of undefined reads "Not enough yet". */
export const QUESTIONS: Question[] = [
  {
    id: 'office-protein',
    label: 'Protein on office days',
    answer(i) {
      const office = new Set(i.days.filter((d) => d.place === 'office').map((d) => d.date));
      const totals = new Map<DayKey, number>();
      for (const e of i.entries) if (office.has(e.date)) totals.set(e.date, (totals.get(e.date) ?? 0) + e.protein);
      if (totals.size < MIN_OFFICE_DAYS) return undefined;
      return `${Math.round([...totals.values()].reduce((a, b) => a + b, 0) / totals.size)} g`;
    },
  },
  {
    id: 'best-week',
    label: 'Best week for steps',
    answer(i) {
      const weeks = new Map<DayKey, number>();
      for (const d of i.days) if (d.steps) weeks.set(weekStart(d.date), (weeks.get(weekStart(d.date)) ?? 0) + d.steps);
      if (!weeks.size) return undefined;
      const [best] = [...weeks].reduce((a, b) => (b[1] > a[1] ? b : a));
      return `From ${fmtDayMonth(best)}`;
    },
  },
  {
    id: 'late-sessions',
    label: 'Sessions after 11 pm',
    answer(i) {
      const done = i.sessions.filter((s) => s.status === 'done');
      if (!done.length) return undefined;
      return fmtInt(done.filter((s) => new Date(s.startedAt).getHours() >= LATE_HOUR).length);
    },
  },
];

/** The steps a day it would take to reach the next stop in two weeks. */
export function whatWouldItTake(km: number, today: DayKey, stride: number): { stop: string; by: DayKey; stepsPerDay: number } | undefined {
  const to = positionAt(km).to;
  if (!to || km >= to.km) return undefined;
  return { stop: to.name, by: addDays(today, TAKE_DAYS), stepsPerDay: Math.ceil(((to.km - km) * 1000) / stride / TAKE_DAYS) };
}

/** One true thing from your own logs, picked by the seed. */
export function surprise(seed: string, i: BrowseInput): { text: string; sub?: string } | undefined {
  if (!i.days.length) return undefined;
  const deck = statDeck(i);
  return deck.length ? deck[Math.floor(seeded(`surprise:${seed}`)() * deck.length)] : undefined;
}
