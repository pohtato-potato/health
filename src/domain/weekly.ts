import { addDays, dayRange, weekStart, type DayKey } from './dates';
import { fmtClock, fmtDayMonth, fmtDuration, fmtInt } from './format';
import { valuesFor } from './foods';
import { ringsFor, sleepMinutes, totalsFor } from './rings';
import { weightTrend } from './streaks';
import { stepStreakOf, targetsAt } from './occasions';
import type { Day, Food, FoodEntry, SetEntry, Settings, TrainingSession } from './types';

export interface WeekStats {
  from: DayKey;
  to: DayKey;
  days: number;
  steps: number;
  stepsAvg: number;
  sleepAvg?: number;
  kcalAvg?: number;
  inRange: number;
  proteinAvg?: number;
  waterL: number;
  sessions: number;
  sets: number;
  reps: number;
  records: SetEntry[];
  perfect: number;
  shieldsUsed: number;
  restDays: number;
  freeMeal: boolean;
  drinks: number;
  trendStart?: number;
  trendEnd?: number;
  weightAvg?: number;
}

export function weekStats(settings: Settings, from: DayKey, days: Day[], entries: FoodEntry[], sessions: TrainingSession[], sets: SetEntry[]): WeekStats {
  const to = addDays(from, 6);
  const range = dayRange(from, to);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const done = sessions.filter((s) => s.status === 'done' && s.date >= from && s.date <= to);
  const ids = new Set(done.map((s) => s.id));
  const mine = sets.filter((x) => ids.has(x.sessionId));
  let steps = 0;
  let stepDays = 0;
  let kcal = 0;
  let protein = 0;
  let foodDays = 0;
  let inRange = 0;
  let perfect = 0;
  let water = 0;
  let drinks = 0;
  let freeMeal = false;
  const sleeps: number[] = [];
  const weights: number[] = [];
  for (const d of range) {
    const day = byDate.get(d);
    const es = entries.filter((e) => e.date === d);
    const t = targetsAt(settings, d);
    if (day?.steps !== undefined) {
      steps += day.steps;
      stepDays++;
    }
    if (es.length) {
      foodDays++;
      kcal += es.reduce((n, e) => n + e.kcal, 0);
      protein += es.reduce((n, e) => n + e.protein, 0);
    }
    if (t) {
      const r = ringsFor(totalsFor(day, es), t);
      if (r.kcal.closed && es.length) inRange++;
      if (r.perfect && es.length) perfect++;
    }
    water += day?.waterMl ?? 0;
    drinks += es.filter((e) => e.kind === 'drink').reduce((n, e) => n + (e.drink?.count ?? 1), 0);
    if (es.some((e) => e.kind === 'free')) freeMeal = true;
    if (day?.sleep) sleeps.push(sleepMinutes(day.sleep.asleep, day.sleep.woke));
    if (day?.weightKg !== undefined) weights.push(day.weightKg);
  }
  const trend = weightTrend(days.filter((d) => d.weightKg !== undefined && d.date <= to).map((d) => ({ date: d.date, kg: d.weightKg! })));
  const before = [...trend].reverse().find((t) => t.date < from);
  const end = [...trend].reverse().find((t) => t.date <= to);
  const streak = stepStreakOf(settings, days, addDays(to, 1));
  return {
    from,
    to,
    days: range.filter((d) => byDate.has(d) || entries.some((e) => e.date === d)).length,
    steps,
    stepsAvg: stepDays ? Math.round(steps / stepDays) : 0,
    sleepAvg: sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : undefined,
    kcalAvg: foodDays ? Math.round(kcal / foodDays) : undefined,
    inRange,
    proteinAvg: foodDays ? Math.round(protein / foodDays) : undefined,
    waterL: water / 1000,
    sessions: done.length,
    sets: mine.filter((x) => !x.drop).length,
    reps: mine.reduce((n, x) => n + (x.reps ?? 0), 0),
    records: mine.filter((x) => x.mark === '!!'),
    perfect,
    shieldsUsed: streak.shieldsUsed.filter((d) => d >= from && d <= to).length,
    restDays: range.length - new Set(done.map((s) => s.date)).size,
    freeMeal,
    drinks,
    trendStart: before?.trend ?? trend.find((t) => t.date >= from)?.trend,
    trendEnd: end?.trend,
    weightAvg: weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : undefined,
  };
}

/** The last full Monday-to-Sunday week before today. */
export function lastFullWeek(today: DayKey): DayKey {
  return addDays(weekStart(today), -7);
}

const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : 0);

export function headline(w: WeekStats, prev: WeekStats | undefined, all: WeekStats[], perWeek: number): string {
  const bestSteps = all.length >= 2 && w.stepsAvg > 0 && all.every((x) => x === w || x.stepsAvg < w.stepsAvg);
  if (bestSteps) return 'Your best walking week yet.';
  if (w.perfect >= 5) return `${w.perfect} perfect days. A week to frame.`;
  if (w.records.length >= 3) return `${w.records.length} records in one week.`;
  if (w.sessions >= perWeek && prev && prev.sessions >= perWeek) return 'Another full week of training.';
  if (w.trendStart !== undefined && w.trendEnd !== undefined && w.trendEnd < w.trendStart - 0.3) return 'The trend moved the right way.';
  if (prev && w.sleepAvg && prev.sleepAvg && w.sleepAvg > prev.sleepAvg + 15) return 'You slept better this week.';
  return 'A week in the books.';
}

export function changeLine(now: number | undefined, before: number | undefined, unit = '', fmt = (n: number) => fmtInt(n)): string {
  if (now === undefined) return 'not logged';
  if (before === undefined || before === 0) return 'first week';
  const d = now - before;
  if (Math.abs(d) < 1e-9 || (unit === '%' && Math.abs(pct(now, before)) < 2)) return 'same as last week';
  if (unit === '%') return `${d > 0 ? 'up' : 'down'} ${Math.abs(pct(now, before))}%`;
  return `${d > 0 ? 'up' : 'down'} ${fmt(Math.abs(d))}${unit}`;
}

/** One small, specific thing for next week, aimed at the weakest spot. */
export function suggestOneThing(w: WeekStats, settings: Settings, foods: Food[], usualWake?: number): string {
  const t = targetsAt(settings, w.to);
  if (!t) return 'Log every day this week, even the messy ones.';
  if (w.proteinAvg !== undefined && w.proteinAvg < t.proteinG - 8) {
    const best = [...foods]
      .filter((f) => !f.archived)
      .map((f) => ({ f, v: valuesFor(f, f.defaultAmount) }))
      .filter((x) => x.v.kcal > 0)
      .sort((a, b) => b.v.protein / b.v.kcal - a.v.protein / a.v.kcal)[0];
    if (best) {
      const lifted = Math.round(w.proteinAvg + (best.v.protein * 4) / 7);
      return `Add ${best.f.name.toLowerCase()} on four days. That lifts your protein average to about ${lifted} g.`;
    }
    return `Close protein on four days. Your average was ${w.proteinAvg} g, against ${t.proteinG}.`;
  }
  if (w.stepsAvg && w.stepsAvg < t.steps) {
    const short = t.steps - w.stepsAvg;
    const minutes = Math.max(5, Math.round(short / 100));
    return `Walk ${minutes} more minutes a day. That's about ${fmtInt(short)} steps${settings.loopSteps ? `, or ${fmtInt(Math.round(short / settings.loopSteps))} laps of home` : ''}.`;
  }
  if (w.sleepAvg !== undefined && w.sleepAvg < t.sleepMin - 10) {
    return usualWake !== undefined ? `Be asleep by ${fmtClock((usualWake - t.sleepMin + 1440) % 1440)} on weeknights.` : `Get to bed 30 minutes earlier on weeknights.`;
  }
  if (w.sessions < t.sessionsPerWeek) return `Book ${t.sessionsPerWeek} sessions in advance, with the short session as the fallback.`;
  if (w.inRange < 5) return 'Land in your calorie range on five days. Check What can I still eat? before dinner.';
  if (w.waterL / 7 < t.waterMl / 1000 - 0.3) return `Two more glasses a day gets you to ${(t.waterMl / 1000).toFixed(1)} L.`;
  return 'Keep everything exactly as it is. Seriously.';
}

export interface ReceiptLine {
  left: string;
  right?: string;
  kind?: 'head' | 'sub' | 'rule' | 'total' | 'center' | 'small';
}

/** The week, itemised like a till receipt. */
export function receiptLines(w: WeekStats, homeName: string | undefined, weekNo: number, printedAt: Date): ReceiptLine[] {
  const d = (k: DayKey) => fmtDayMonth(k).toUpperCase();
  const lighter = w.trendStart !== undefined && w.trendEnd !== undefined ? w.trendEnd - w.trendStart : undefined;
  const hh = String(printedAt.getHours()).padStart(2, '0');
  const mm = String(printedAt.getMinutes()).padStart(2, '0');
  return [
    { left: 'HEALTH', kind: 'head' },
    ...(homeName ? [{ left: homeName.toUpperCase(), kind: 'center' as const }] : []),
    { left: `WEEK ${weekNo} · ${d(w.from)}–${d(w.to)} ${w.to.slice(0, 4)}`, kind: 'center' },
    { left: `PRINTED ${hh}:${mm} · TILL 01`, kind: 'center' },
    { left: '', kind: 'rule' },
    { left: 'STEPS', right: fmtInt(w.steps) },
    { left: 'daily average', right: fmtInt(w.stepsAvg), kind: 'sub' },
    { left: 'SESSIONS', right: String(w.sessions) },
    { left: 'sets · reps', right: `${w.sets} · ${fmtInt(w.reps)}`, kind: 'sub' },
    { left: 'RECORDS', right: String(w.records.length) },
    { left: 'PROTEIN / DAY', right: w.proteinAvg !== undefined ? `${w.proteinAvg} g` : '—' },
    { left: 'KCAL / DAY', right: w.kcalAvg !== undefined ? fmtInt(w.kcalAvg) : '—' },
    { left: 'WATER', right: `${w.waterL.toFixed(1)} L` },
    { left: 'SLEEP / NIGHT', right: w.sleepAvg !== undefined ? fmtDuration(w.sleepAvg) : '—' },
    { left: 'FREE MEAL', right: w.freeMeal ? 'USED' : 'UNUSED' },
    { left: 'DRINKS', right: String(w.drinks) },
    { left: 'PERFECT DAYS', right: String(w.perfect) },
    { left: 'SHIELDS USED', right: String(w.shieldsUsed) },
    { left: 'REST DAYS', right: String(w.restDays) },
    { left: '', kind: 'rule' },
    {
      left: 'TOTAL',
      right: lighter === undefined ? 'WEIGH IN MORE' : Math.abs(lighter) < 0.05 ? 'HELD STEADY' : `${Math.abs(lighter).toFixed(1)} kg ${lighter < 0 ? 'lighter' : 'heavier'}`,
      kind: 'total',
    },
    { left: '', kind: 'rule' },
    { left: 'PAID IN FULL, IN SWEAT', kind: 'center' },
    { left: 'THANK YOU, VISIT AGAIN', kind: 'center' },
  ];
}

/** ISO-style week number, for the receipt's header. */
export function weekNumber(key: DayKey): number {
  const d = new Date(`${key}T12:00:00`);
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(thursday.getFullYear(), 0, 4);
  return 1 + Math.round(((thursday.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}
