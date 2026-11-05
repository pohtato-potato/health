import { addDays, weekStart, type DayKey } from './dates';
import { fmtDayMonth, fmtDuration, fmtInt } from './format';
import { realSets } from './plan';
import { sleepMinutes } from './rings';
import type { Day, FoodEntry, SetEntry, Settings, TrainingSession } from './types';

export interface AskInput { today: DayKey; settings: Settings; days: Day[]; entries: FoodEntry[]; sessions: TrainingSession[]; sets: SetEntry[] }
export interface Answer { answer: string; days: DayKey[] }

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const DEFAULT_DAYS = 30;

interface Period { from: DayKey; to: DayKey; words: string }
function periodIn(q: string, today: DayKey): Period {
  if (/this week/.test(q)) return { from: weekStart(today), to: today, words: 'this week' };
  if (/last week/.test(q)) return { from: addDays(weekStart(today), -7), to: addDays(weekStart(today), -1), words: 'last week' };
  const first = `${today.slice(0, 7)}-01`;
  if (/this month/.test(q)) return { from: first, to: today, words: 'this month' };
  if (/last month/.test(q)) return { from: addDays(first, -1).slice(0, 7) + '-01', to: addDays(first, -1), words: 'last month' };
  const m = MONTHS.findIndex((n) => new RegExp(`\\b${n}\\b`).test(q));
  if (m >= 0) {
    const mm = String(m + 1).padStart(2, '0');
    const year = `${today.slice(0, 4)}-${mm}` > today.slice(0, 7) ? Number(today.slice(0, 4)) - 1 : Number(today.slice(0, 4));
    const end = new Date(year, m + 1, 0).getDate();
    return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(end).padStart(2, '0')}`, words: `in ${MONTHS[m][0].toUpperCase()}${MONTHS[m].slice(1)}` };
  }
  return { from: addDays(today, -(DEFAULT_DAYS - 1)), to: today, words: `in the last ${DEFAULT_DAYS} days` };
}

const done = (i: AskInput) => i.sessions.filter((s) => s.status === 'done' && s.date <= i.today);
const uniq = (xs: DayKey[]) => [...new Set(xs)].sort();
const inP = (p: Period) => (d: DayKey) => d >= p.from && d <= p.to;
const plural = (n: number, w: string) => `${fmtInt(n)} ${w}${n === 1 ? '' : 's'}`;
const lastOf = (xs: DayKey[]) => uniq(xs).pop();

function when(q: string, i: AskInput): Answer | undefined {
  const reply = (what: string, days: DayKey[], none: string): Answer => {
    const d = lastOf(days);
    return d ? { answer: `${what} was on ${fmtDayMonth(d)}.`, days: [d] } : { answer: none, days: [] };
  };
  if (/train|session|workout|gym|lift/.test(q)) return reply('Your last session', done(i).map((s) => s.date), 'No session logged yet.');
  if (/drink|beer|wine|whisky|alcohol/.test(q)) return reply('Your last night with a drink', i.entries.filter((e) => e.kind === 'drink').map((e) => e.date), 'No drinks logged yet.');
  if (/weigh/.test(q)) return reply('Your last weigh-in', i.days.filter((d) => d.weightKg !== undefined).map((d) => d.date), 'No weigh-in logged yet.');
  if (/record|\bpr\b/.test(q)) return reply('Your last record', realSets(i.sets).filter((s) => s.mark === '!!').map((s) => s.date), 'No record logged yet.');
  if (/sick|ill\b/.test(q)) return reply('The last sick day', i.days.filter((d) => d.status === 'sick').map((d) => d.date), 'No sick day logged.');
  const food = q.match(/(?:eat|ate|have|had)\s+(?:a |an |some |the )?(.+?)[?.!]*$/)?.[1]?.trim();
  if (food) return reply(`The last time you logged ${food}`, i.entries.filter((e) => e.name?.toLowerCase().includes(food)).map((e) => e.date), `No ${food} logged yet.`);
  return undefined;
}

function howMany(q: string, i: AskInput): Answer | undefined {
  const p = periodIn(q, i.today);
  const on = inP(p);
  if (/session|workout|train/.test(q)) {
    const days = uniq(done(i).map((s) => s.date).filter(on));
    return { answer: `${plural(done(i).filter((s) => on(s.date)).length, 'session')} ${p.words}.`, days };
  }
  if (/record|\bprs?\b/.test(q)) {
    const rows = realSets(i.sets).filter((s) => s.mark === '!!' && on(s.date));
    return { answer: `${plural(rows.length, 'record')} ${p.words}.`, days: uniq(rows.map((s) => s.date)) };
  }
  if (/drink|night/.test(q)) {
    const days = uniq(i.entries.filter((e) => e.kind === 'drink' && on(e.date)).map((e) => e.date));
    return { answer: `${plural(days.length, 'night')} with drinks logged ${p.words}.`, days };
  }
  if (/step/.test(q)) {
    const rows = i.days.filter((d) => d.steps !== undefined && on(d.date));
    return { answer: `${fmtInt(rows.reduce((n, d) => n + d.steps!, 0))} steps ${p.words}, over ${plural(rows.length, 'logged day')}.`, days: uniq(rows.map((d) => d.date)) };
  }
  return undefined;
}

function metricRows(q: string, i: AskInput, p: Period) {
  const on = inP(p);
  const byFood = new Map<DayKey, { protein: number; kcal: number }>();
  for (const e of i.entries) if (on(e.date)) {
    const c = byFood.get(e.date) ?? { protein: 0, kcal: 0 };
    byFood.set(e.date, { protein: c.protein + e.protein, kcal: c.kcal + e.kcal });
  }
  if (/step/.test(q)) return { name: 'steps', fmt: (n: number) => `${fmtInt(n)} steps`, rows: i.days.filter((d) => d.steps !== undefined && on(d.date)).map((d) => ({ date: d.date, v: d.steps! })) };
  if (/sleep|slept/.test(q)) return { name: 'sleep', fmt: (n: number) => fmtDuration(Math.round(n)), rows: i.days.filter((d) => d.sleep && on(d.date)).map((d) => ({ date: d.date, v: sleepMinutes(d.sleep!.asleep, d.sleep!.woke) })) };
  if (/protein/.test(q)) return { name: 'protein', fmt: (n: number) => `${fmtInt(n)} g protein`, rows: [...byFood].map(([date, f]) => ({ date, v: f.protein })) };
  if (/calorie|kcal/.test(q)) return { name: 'calories', fmt: (n: number) => `${fmtInt(n)} kcal`, rows: [...byFood].map(([date, f]) => ({ date, v: f.kcal })) };
  return undefined;
}

function average(q: string, i: AskInput): Answer | undefined {
  const p = periodIn(q, i.today);
  const m = metricRows(q, i, p);
  if (!m) return undefined;
  if (!m.rows.length) return { answer: `No ${m.name} logged ${p.words}.`, days: [] };
  const avg = m.rows.reduce((n, r) => n + r.v, 0) / m.rows.length;
  return { answer: `About ${m.fmt(avg)} a day ${p.words}, over ${plural(m.rows.length, 'logged day')}.`, days: uniq(m.rows.map((r) => r.date)) };
}

function extreme(q: string, i: AskInput): Answer | undefined {
  const low = /worst|lowest|least|shortest/.test(q);
  const all: Period = { from: '2000-01-01', to: i.today, words: 'so far' };
  const p = /week|month|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(q) ? periodIn(q, i.today) : all;
  const m = metricRows(q, i, p);
  if (!m) return undefined;
  if (!m.rows.length) return { answer: `No ${m.name} logged ${p.words}.`, days: [] };
  const pick = m.rows.reduce((a, b) => ((low ? b.v < a.v : b.v > a.v) ? b : a));
  return { answer: `${low ? 'Lowest' : 'Highest'} ${p.words}: ${m.fmt(pick.v)} on ${fmtDayMonth(pick.date)}.`, days: [pick.date] };
}

/** A small, plain reading of your own data. It says only what the days show, and every answer lists the days it used. */
export function askData(query: string, i: AskInput): Answer | undefined {
  const q = query.toLowerCase().trim();
  if (!q) return undefined;
  if (/\bwhen\b/.test(q)) return when(q, i);
  if (/how many|how much|total|count/.test(q)) {
    const a = howMany(q, i);
    if (a) return a;
  }
  if (/average|avg|usual|mean|a day/.test(q)) return average(q, i);
  if (/best|most|biggest|highest|longest|worst|lowest|least|shortest/.test(q)) return extreme(q, i);
  return undefined;
}

export const ASK_EXAMPLES = ['When did I last train?', 'How many sessions in October?', 'Average sleep last week', 'Best step day', 'When did I last eat paneer?'];

