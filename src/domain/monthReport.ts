import type { Sighting } from './creatures';
import { parseDay, type DayKey } from './dates';
import { lastMonth } from './film';
import { sleepMinutes } from './rings';
import type { Day, FoodEntry, Measurement, SetEntry, Settings, SongRecord, TrainingSession } from './types';
import { dayRings } from '../state/derived';

export interface MonthInput {
  today: DayKey;
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  sightings: Sighting[];
  songs: SongRecord[];
  /** The month's story reads these when they are there. */
  measurements?: Measurement[];
  results?: { date: DayKey; result: 'W' | 'D' | 'L' }[];
}
export type GradeWord = 'Strong' | 'Good' | 'Usual' | 'Easing' | 'Slipped';
export interface Grade { area: string; word: GradeWord; why: string }
const inMonth = (m: string) => (x: { date: DayKey }) => x.date.startsWith(m);
const DONE = (s: TrainingSession) => s.status === 'done';
const MIN_NIGHTS = 7;

function byDate(entries: FoodEntry[]) {
  const m = new Map<DayKey, FoodEntry[]>();
  for (const e of entries) m.set(e.date, [...(m.get(e.date) ?? []), e]);
  return m;
}

function word(share: number): GradeWord {
  if (share >= 0.7) return 'Strong';
  if (share >= 0.5) return 'Good';
  if (share >= 0.3) return 'Usual';
  return 'Easing';
}

/** The month, marked in words. A grade only where there's data to mark. */
export function assessment(month: string, i: MonthInput): Grade[] {
  const days = i.days.filter(inMonth(month));
  const food = byDate(i.entries.filter(inMonth(month)));
  const dayBy = new Map(days.map((d) => [d.date, d]));
  const rings = (d: DayKey) => dayRings(i.settings, d, dayBy.get(d), food.get(d) ?? []);
  const out: Grade[] = [];
  const steps = days.filter((d) => d.steps !== undefined);
  if (steps.length) {
    const met = steps.filter((d) => rings(d.date).rings.steps.closed).length;
    out.push({ area: 'Steps', word: word(met / steps.length), why: `Goal met on ${met} of ${steps.length} days` });
  }
  const done = i.sessions.filter(inMonth(month)).filter(DONE);
  if (done.length && i.settings.plan) {
    const per = rings(`${month}-15`).targets.sessionsPerWeek || 3;
    const records = i.sets.filter(inMonth(month)).filter((s) => s.mark === '!!' && !s.skipped).length;
    const share = done.length / (per * (daysInMonth(month) / 7));
    out.push({ area: 'Training', word: word(share), why: `${done.length} sessions, ${records} records` });
  } else if (done.length) {
    out.push({ area: 'Training', word: 'Usual', why: `${done.length} sessions` });
  }
  if (food.size) {
    const met = [...food.keys()].filter((d) => rings(d).rings.protein.closed).length;
    out.push({ area: 'Food', word: word(met / food.size), why: `Protein met on ${met} of ${food.size} logged days` });
  }
  const nights = days.filter((d) => d.sleep);
  if (nights.length) {
    const met = nights.filter((d) => sleepMinutes(d.sleep!.asleep, d.sleep!.woke) >= rings(d.date).targets.sleepMin).length;
    out.push({ area: 'Sleep', word: word(met / nights.length), why: `Your target on ${met} of ${nights.length} nights` });
  }
  const drinkNights = (m: string) => new Set(i.entries.filter((e) => e.kind === 'drink' && e.date.startsWith(m)).map((e) => e.date)).size;
  const [now, was] = [drinkNights(month), drinkNights(previousMonth(month))];
  const answeredNone = i.days.filter((d) => d.date.startsWith(month) && d.noDrinks).length;
  if (now || (was && answeredNone)) {
    const n = `${now} night${now === 1 ? '' : 's'}`;
    out.push(now > was
      ? { area: 'Drinks', word: was ? 'Slipped' : 'Usual', why: was ? `${n}, up from ${was}` : n }
      : { area: 'Drinks', word: 'Good', why: !now ? `No drinks on the ${answeredNone} day${answeredNone === 1 ? '' : 's'} you answered, down from ${was} night${was === 1 ? '' : 's'}` : now === was ? `${n}, the same as last month` : `${n}, down from ${was}` });
  }
  return out;
}

const previousMonth = (m: string) => {
  const [y, n] = m.split('-').map(Number);
  return n === 1 ? `${y - 1}-12` : `${y}-${String(n - 1).padStart(2, '0')}`;
};

const NEXT: Record<string, string> = {
  Steps: 'A short walk after dinner on the slow days.',
  Training: 'One short session in the quiet part of the week.',
  Food: 'Protein at the first meal on the days you miss it.',
  Sleep: 'Bed half an hour earlier on training nights.',
  Drinks: 'Pick the nights for drinks at the start of the week.',
};
const RANK: GradeWord[] = ['Slipped', 'Easing', 'Usual', 'Good', 'Strong'];

/** One thing to try, from the month's weakest area. */
export function tryNext(grades: Grade[]): string | undefined {
  const worst = weakest(grades);
  return worst && NEXT[worst.area];
}

/** The month's weakest area: the lowest word, first in the assessment's order on a tie. */
export function weakest(grades: Grade[]): Grade | undefined {
  return [...grades].sort((a, b) => RANK.indexOf(a.word) - RANK.indexOf(b.word))[0];
}

const daysInMonth = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();

export function monthSpread(month: string, i: MonthInput) {
  const sets = i.sets.filter(inMonth(month)).filter((s) => !s.skipped);
  const perWeekday = Array<number>(7).fill(0);
  for (const s of i.sessions.filter(inMonth(month)).filter(DONE)) perWeekday[(parseDay(s.date).getDay() + 6) % 7]++;
  const steps = i.days.filter(inMonth(month)).flatMap((d) => (d.steps === undefined ? [] : [d.steps]));
  const nights = i.days.filter(inMonth(month)).flatMap((d) => (d.sleep ? [sleepMinutes(d.sleep.asleep, d.sleep.woke)] : []));
  const food = byDate(i.entries.filter(inMonth(month)));
  const protein = [...food.values()].map((l) => l.reduce((n, e) => n + e.protein, 0));
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
  return {
    sets: sets.length,
    sessions: i.sessions.filter(inMonth(month)).filter(DONE).length,
    perWeekday,
    stepsAvg: mean(steps),
    stepsSeries: steps,
    proteinAvg: mean(protein),
    proteinSeries: protein,
    sleepAvg: mean(nights),
    sleepSeries: nights,
  };
}

export function topFives(month: string, i: MonthInput) {
  const steps = i.days.filter(inMonth(month)).filter((d) => d.steps).sort((a, b) => b.steps! - a.steps!).slice(0, 5).map((d) => ({ date: d.date, steps: d.steps! }));
  const lifts = new Map<string, number>();
  for (const s of i.sets.filter(inMonth(month))) if (!s.skipped && s.exercise) lifts.set(s.exercise, (lifts.get(s.exercise) ?? 0) + 1);
  return { steps, lifts: [...lifts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, sets]) => ({ name, sets })) };
}

export function sleepProfile(month: string, i: MonthInput) {
  const nights = i.days.filter(inMonth(month)).flatMap((d) => (d.sleep ? [{ date: d.date, min: sleepMinutes(d.sleep.asleep, d.sleep.woke), woke: d.sleep.woke }] : []));
  if (nights.length < MIN_NIGHTS) return undefined;
  const sorted = [...nights].sort((a, b) => a.min - b.min);
  return {
    nights: nights.length,
    avg: Math.round(nights.reduce((n, x) => n + x.min, 0) / nights.length),
    shortest: sorted[0],
    longest: sorted[sorted.length - 1],
  };
}

/** Finished months with anything logged, newest first. */
export function monthsWithData(days: Day[], today: DayKey): string[] {
  const latest = lastMonth(today);
  return [...new Set(days.filter((d) => d.steps !== undefined || d.sleep).map((d) => d.date.slice(0, 7)))].filter((m) => m <= latest).sort().reverse();
}

