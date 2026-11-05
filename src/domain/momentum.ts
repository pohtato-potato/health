import { addDays, dayKey, type DayKey } from './dates';
import { fmtInt } from './format';
import { sleepMinutes } from './rings';
import type { Day, FoodEntry, Settings, TrainingSession } from './types';
import { dayRings, targetsFor } from '../state/derived';

/** How the last two weeks went, from steps, protein, sleep and training. Weight and calories never enter it. */
export type MomentumArea = 'steps' | 'protein' | 'sleep' | 'training';
export interface MomentumInput { settings: Settings; days: Day[]; entries: FoodEntry[]; sessions: TrainingSession[] }
export interface TrendRow {
  area: MomentumArea;
  word: 'Improving' | 'Building' | 'Steady' | 'Easing';
  now: string;
  was?: string;
  series: number[];
}

const AREAS: MomentumArea[] = ['steps', 'protein', 'sleep', 'training'];
const WINDOW = 14;
const MIN_LOGGED = 4;
const MIN_AREAS = 2;
const TREND_GAP = 28;
const TREND_POINTS = 8;

interface Prepared { i: MomentumInput; dayBy: Map<DayKey, Day>; foodBy: Map<DayKey, FoodEntry[]>; done: TrainingSession[] }

function prepare(i: MomentumInput): Prepared {
  const foodBy = new Map<DayKey, FoodEntry[]>();
  for (const e of i.entries) foodBy.set(e.date, [...(foodBy.get(e.date) ?? []), e]);
  return { i, dayBy: new Map(i.days.map((d) => [d.date, d])), foodBy, done: i.sessions.filter((s) => s.status === 'done') };
}

const windowOf = (date: DayKey): DayKey[] => Array.from({ length: WINDOW }, (_, n) => addDays(date, -1 - n));

/** Logged days and closed days per area, in the window before `date`. */
function tallies(date: DayKey, p: Prepared) {
  const t = { steps: [0, 0], protein: [0, 0], sleep: [0, 0] };
  for (const d of windowOf(date)) {
    const day = p.dayBy.get(d);
    const food = p.foodBy.get(d);
    if (day?.steps === undefined && !food?.length && !day?.sleep) continue;
    const { rings, targets } = dayRings(p.i.settings, d, day, food ?? []);
    if (day?.steps !== undefined) { t.steps[0]++; if (rings.steps.closed) t.steps[1]++; }
    if (food?.length) { t.protein[0]++; if (rings.protein.closed) t.protein[1]++; }
    if (day?.sleep) { t.sleep[0]++; if (sleepMinutes(day.sleep.asleep, day.sleep.woke) >= targets.sleepMin) t.sleep[1]++; }
  }
  return t;
}

function sessionsIn(date: DayKey, p: Prepared): number {
  const from = addDays(date, -WINDOW);
  return p.done.filter((s) => s.date >= from && s.date < date).length;
}

/** The first day training could have been logged: nothing before it counts as none. */
function firstUse(p: Prepared): DayKey {
  return p.done.reduce((first, s) => (s.date < first ? s.date : first), dayKey(new Date(p.i.settings.createdAt)));
}

function scoresOf(date: DayKey, p: Prepared): Partial<Record<MomentumArea, number>> {
  const out: Partial<Record<MomentumArea, number>> = {};
  const t = tallies(date, p);
  for (const a of ['steps', 'protein', 'sleep'] as const) {
    if (t[a][0] >= MIN_LOGGED) out[a] = t[a][1] / t[a][0];
  }
  const perWeek = targetsFor(p.i.settings, date).sessionsPerWeek;
  const done = sessionsIn(date, p);
  if (p.i.settings.plan && perWeek > 0 && (done > 0 || date >= addDays(firstUse(p), WINDOW))) out.training = Math.min(1, done / (perWeek * 2));
  return out;
}

function scoreOf(date: DayKey, p: Prepared): number | undefined {
  const vals = Object.values(scoresOf(date, p));
  if (vals.length < MIN_AREAS) return undefined;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
}

export const areaScores = (date: DayKey, i: MomentumInput) => scoresOf(date, prepare(i));
export const momentumOn = (date: DayKey, i: MomentumInput) => scoreOf(date, prepare(i));

/** One value a day, oldest first, ending today. Null where there is no score. */
export function momentumSeries(today: DayKey, i: MomentumInput, days = 28): (number | null)[] {
  const p = prepare(i);
  return Array.from({ length: days }, (_, n) => scoreOf(addDays(today, n - days + 1), p) ?? null);
}

export function momentumChange(today: DayKey, i: MomentumInput): number | undefined {
  const p = prepare(i);
  const now = scoreOf(today, p);
  const then = scoreOf(addDays(today, -TREND_GAP), p);
  return now === undefined || then === undefined ? undefined : now - then;
}

/** How many more logged days would make a score. 0 once there is one. */
export function momentumNeeds(today: DayKey, i: MomentumInput): number {
  const p = prepare(i);
  const have = Object.keys(scoresOf(today, p)).length;
  if (have >= MIN_AREAS) return 0;
  const t = tallies(today, p);
  const short = (['steps', 'protein', 'sleep'] as const)
    .map((a) => t[a][0])
    .filter((n) => n < MIN_LOGGED)
    .map((n) => MIN_LOGGED - n)
    .sort((a, b) => a - b);
  return short.slice(0, MIN_AREAS - have).reduce((a, b) => a + b, 0);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The plain number behind an area, for the sentence under its small line. */
function amount(area: MomentumArea, date: DayKey, p: Prepared): string | undefined {
  const dates = windowOf(date);
  if (area === 'steps') {
    const xs = dates.flatMap((d) => { const v = p.dayBy.get(d)?.steps; return v === undefined ? [] : [v]; });
    return xs.length ? fmtInt(Math.round(mean(xs) / 100) * 100) : undefined;
  }
  if (area === 'protein') {
    const xs = dates.flatMap((d) => { const f = p.foodBy.get(d); return f?.length ? [f.reduce((a, e) => a + e.protein, 0)] : []; });
    return xs.length ? String(Math.round(mean(xs))) : undefined;
  }
  if (area === 'sleep') {
    const xs = dates.flatMap((d) => { const s = p.dayBy.get(d)?.sleep; return s ? [sleepMinutes(s.asleep, s.woke)] : []; });
    if (!xs.length) return undefined;
    const m = Math.round(mean(xs));
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  }
  return String(sessionsIn(date, p));
}

const UNIT: Record<MomentumArea, (v: string) => string> = {
  steps: (v) => `${v} a day`,
  protein: (v) => `${v} g a day`,
  sleep: (v) => `${v} a night`,
  training: (v) => `${v} session${v === '1' ? '' : 's'} in two weeks`,
};

export function trendRows(today: DayKey, i: MomentumInput): TrendRow[] {
  const p = prepare(i);
  const earlier = addDays(today, -TREND_GAP);
  const now = scoresOf(today, p);
  const then = scoresOf(earlier, p);
  const rows: TrendRow[] = [];
  for (const area of AREAS) {
    const score = now[area];
    if (score === undefined) continue;
    const before = then[area];
    const gap = before === undefined ? 0 : Math.round((score - before) * 100);
    const word: TrendRow['word'] = gap >= TREND_POINTS ? (area === 'training' ? 'Building' : 'Improving') : gap <= -TREND_POINTS ? 'Easing' : 'Steady';
    // Every second day, oldest first. A day without a score holds the nearest one, so the line has no holes.
    const raw = Array.from({ length: 16 }, (_, n) => scoresOf(addDays(today, (n - 15) * 2), p)[area]);
    let held = raw.find((v) => v !== undefined) ?? score;
    const series = raw.map((v) => { held = v ?? held; return Math.round(held * 100); });
    const amountNow = amount(area, today, p) ?? '0';
    rows.push({ area, word, now: UNIT[area](amountNow), series, ...(before !== undefined ? { was: amount(area, earlier, p) } : {}) });
  }
  return rows;
}
