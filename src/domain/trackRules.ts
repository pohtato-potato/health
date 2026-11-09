import { addDays, dayRange, parseDay, type DayKey } from './dates';
import { fmtDayMonth, fmtDuration, fmtInt } from './format';
import { e1rm } from './insights';
import { dayDoses, refillBy } from './medicines';
import { realSets } from './plan';
import { regionAt } from './regions';
import { bedOrder, sleepMinutes } from './rings';
import type { ChecklistItem, CustomTrack, Day, FoodEntry, Measurement, SetEntry, Settings, TrackValue, TrainingSession } from './types';
import { kmFromSteps, positionAt, setStride } from './walk';
import { weightTrend } from './streaks';
import { flagEvents, targetsFor } from '../state/derived';

export const TRACK_KEYS = ['food', 'shape', 'steps', 'sleep', 'training', 'readiness', 'joints', 'drinks', 'meds', 'own', 'compare'] as const;
export type TrackKey = (typeof TRACK_KEYS)[number];

export interface Headline { say: string; changed?: string; why?: string; next?: string }
export interface HeadInput {
  today: DayKey;
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  measurements: Measurement[];
  readiness?: { score: number; known: boolean };
  ownCount?: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const within = (d: DayKey, from: DayKey, to: DayKey) => d >= from && d <= to;
const nights = (n: number) => `${n} night${n === 1 ? '' : 's'}`;
const DONE = (s: TrainingSession) => s.status === 'done';

function upDown(now: number | undefined, was: number | undefined, fmt: (n: number) => string, tail: string) {
  if (now === undefined || was === undefined) return undefined;
  const gap = Math.round(now) - Math.round(was);
  if (!gap) return `Level with ${tail}`;
  return `${gap > 0 ? 'Up' : 'Down'} ${fmt(Math.abs(gap))} on ${tail}`;
}

export function headlineFor(k: TrackKey, i: HeadInput): Headline {
  const { today, settings } = i;
  const weekFrom = addDays(today, -6);
  const prevFrom = addDays(today, -13);
  const prevTo = addDays(today, -7);
  const avgOf = (from: DayKey, to: DayKey, f: (d: Day) => number | undefined) => mean(i.days.filter((d) => within(d.date, from, to)).flatMap((d) => {
    const v = f(d);
    return v === undefined ? [] : [v];
  }));
  const target = targetsFor(settings, today);
  switch (k) {
    case 'steps': {
      const now = avgOf(weekFrom, today, (d) => d.steps);
      if (now === undefined) return { say: 'No steps logged this week' };
      setStride(settings.strideM);
      const pos = positionAt(kmFromSteps(i.days.reduce((n, d) => n + (d.date <= today ? d.steps ?? 0 : 0), 0)));
      return {
        say: `${fmtInt(now)} steps a day this week`,
        changed: upDown(now, avgOf(prevFrom, prevTo, (d) => d.steps), (n) => `${fmtInt(n)} a day`, 'last week'),
        next: pos.to ? `${pos.to.name} is ${fmtInt(pos.to.km - pos.km)} km ahead` : undefined,
      };
    }
    case 'food': {
      const proteinFrom = (a: DayKey, b: DayKey) => {
        const by = new Map<DayKey, number>();
        for (const e of i.entries) if (within(e.date, a, b)) by.set(e.date, (by.get(e.date) ?? 0) + e.protein);
        return mean([...by.values()]);
      };
      const now = proteinFrom(weekFrom, today);
      if (now === undefined) return { say: 'No food logged this week' };
      return {
        say: `${fmtInt(now)} g of protein a day this week`,
        changed: upDown(now, proteinFrom(prevFrom, prevTo), (n) => `${fmtInt(n)} g`, 'last week'),
        next: now < target.proteinG ? `Your target is ${fmtInt(target.proteinG)} g` : undefined,
      };
    }
    case 'shape': {
      const trend = weightTrend(i.days.filter((d) => d.weightKg !== undefined && d.date <= today).map((d) => ({ date: d.date, kg: d.weightKg! })));
      if (trend.length < 2) return { say: 'Log a weigh-in or a tape measure to begin' };
      const now = trend[trend.length - 1];
      const then = [...trend].reverse().find((p) => p.date <= addDays(today, -28)) ?? trend[0];
      const gap = now.trend - then.trend;
      return { say: Math.abs(gap) < 0.3 ? 'Steady over the last four weeks' : `Trending ${gap < 0 ? 'down' : 'up'}, ${Math.abs(gap).toFixed(1)} kg in four weeks` };
    }
    case 'sleep': {
      const min = (d: Day) => (d.sleep ? sleepMinutes(d.sleep.asleep, d.sleep.woke) : undefined);
      const now = avgOf(weekFrom, today, min);
      if (now === undefined) return { say: 'No sleep logged this week' };
      const lag = socialJetLag(i.days.filter((d) => d.date >= addDays(today, -27) && d.date <= today));
      const short = sleepBalance(i.days, today, target.sleepMin);
      return {
        say: `${fmtDuration(Math.round(now))} a night this week`,
        changed: upDown(now, avgOf(prevFrom, prevTo, min), fmtDuration, 'last week'),
        why: lag !== undefined && lag >= 45 ? 'Later nights at weekends' : undefined,
        next: short > 0 ? `${fmtDuration(short)} behind your target this week` : undefined,
      };
    }
    case 'training': {
      const done = i.sessions.filter(DONE);
      if (!done.length) return { say: 'No sessions logged yet' };
      const rows = strengthByExercise(i.sets, today).filter((r) => r.word !== NOT_ENOUGH);
      const count = (a: DayKey, b: DayKey) => done.filter((s) => within(s.date, a, b)).length;
      const [now, was] = [count(addDays(today, -27), today), count(addDays(today, -55), addDays(today, -28))];
      const up = rows.filter((r) => (r.pct ?? 0) > 0).length;
      return {
        say: rows.length ? `${up ? 'Building. ' : ''}Stronger on ${up} of ${rows.length} lifts`.replace(/Stronger on 0 of \d+ lifts/, 'Holding your lifts') : 'Not enough sessions yet to read your strength',
        changed: was ? `${now} session${now === 1 ? '' : 's'} in four weeks, ${was} the four before` : undefined,
      };
    }
    case 'readiness':
      return i.readiness?.known ? { say: `${i.readiness.score} today` } : { say: 'Not enough data yet for a reading' };
    case 'joints': {
      const events = flagEvents(settings.plan, i.sessions, i.days);
      if (!events.length) return { say: 'Nothing flagged yet' };
      const lastFlag = events.map((e) => e.date).sort().pop()!;
      const gap = Math.round((parseDay(today).getTime() - parseDay(lastFlag).getTime()) / 86_400_000);
      const count = (a: DayKey, b: DayKey) => events.filter((e) => within(e.date, a, b)).length;
      const now = count(addDays(today, -29), today);
      const was = count(addDays(today, -59), addDays(today, -30));
      return {
        say: gap ? `Quiet for ${gap} day${gap === 1 ? '' : 's'}` : 'Flagged today',
        changed: now || was ? `${now} flag${now === 1 ? '' : 's'} in the last 30 days, ${was} the 30 before` : undefined,
      };
    }
    case 'drinks': {
      const ofMonth = (m: string) => new Set(i.entries.filter((e) => e.kind === 'drink' && e.date.startsWith(m)).map((e) => e.date)).size;
      const m = today.slice(0, 7);
      const now = ofMonth(m);
      const prev = addDays(`${m}-01`, -1).slice(0, 7);
      const was = ofMonth(prev);
      if (now) return { say: `${nights(now)} this month${was ? `, ${now > was ? 'up' : now < was ? 'down' : 'level'}${now === was ? ' with' : ' from'} ${was}` : ''}` };
      const answered = i.days.filter((d) => d.date.startsWith(m) && d.noDrinks).length;
      return answered ? { say: `No drinks on the ${answered} day${answered === 1 ? '' : 's'} you answered` } : { say: 'Not logged this month' };
    }
    case 'meds': {
      const meds = settings.checklist.filter((c) => c.active && c.med);
      if (!meds.length) return { say: 'One home for every tablet', next: 'Add your first one' };
      const byDate = new Map(i.days.map((d) => [d.date, d]));
      let [planned, taken] = [0, 0];
      for (const d of dayRange(`${today.slice(0, 7)}-01`, today)) {
        const s = dayDoses(meds, byDate.get(d) ?? { date: d }, settings);
        planned += s.planned;
        taken += s.onTime + s.late;
      }
      const stock = meds.filter((c) => c.med!.stock).map((c) => refillBy(c.med!.stock!, c, today)).sort()[0];
      return { say: planned ? `${taken} of ${planned} doses this month` : 'Nothing due this month', next: stock ? `Refill by ${fmtDayMonth(stock)}` : undefined };
    }
    case 'own':
      return i.ownCount ? { say: `Counting ${i.ownCount} thing${i.ownCount === 1 ? '' : 's'} of your own`, next: 'Add another' } : { say: 'Anything else worth counting', next: 'Add your first' };
    case 'compare':
      return { say: 'Any two measures, side by side' };
  }
}

export const NOT_ENOUGH = 'Not enough sessions yet';
export interface LiftChange { id: string; name: string; pct?: number; word: string }

/** Each lift's best estimated single, the last two weeks against everything before. It stays quiet until it can speak. */
export function strengthByExercise(sets: SetEntry[], today: DayKey): LiftChange[] {
  const real = realSets(sets).filter((s) => s.loadKg && s.reps && !s.drop);
  const recent = addDays(today, -14);
  const out: LiftChange[] = [];
  for (const id of new Set(real.map((s) => s.exerciseId))) {
    const mine = real.filter((s) => s.exerciseId === id);
    const name = mine[mine.length - 1].exercise;
    const best = (xs: SetEntry[]) => Math.max(0, ...xs.map((s) => e1rm(s.loadKg!, s.reps!)));
    const [a, b] = [best(mine.filter((s) => s.date < recent)), best(mine.filter((s) => s.date >= recent))];
    if (new Set(mine.map((s) => s.date)).size < 3 || !a || !b) {
      out.push({ id, name, pct: undefined, word: NOT_ENOUGH });
      continue;
    }
    const pct = Math.round((b / a - 1) * 100);
    out.push(pct ? { id, name, pct, word: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%` } : { id, name, pct: undefined, word: 'Holding' });
  }
  return out.sort((x, y) => (y.pct ?? -1000) - (x.pct ?? -1000));
}

/** A number of drinks, "none" only when you said so, and otherwise not logged. */
export function drinksAnswer(date: DayKey, day: Pick<Day, 'date' | 'noDrinks'> | undefined, entries: Pick<FoodEntry, 'date' | 'kind' | 'drink'>[]): number | 'none' | 'not logged' {
  const n = entries.filter((e) => e.date === date && e.kind === 'drink').reduce((a, e) => a + (e.drink?.count ?? 1), 0);
  if (n) return n;
  return day?.noDrinks ? 'none' : 'not logged';
}

const STRETCH: Record<string, { name: string; c: string; l: string }> = {
  plains: { name: 'The plains', c: '#4254c9', l: '#c6d0ff' },
  desert: { name: 'The desert', c: '#b0761f', l: '#ffe0a6' },
  ravines: { name: 'Bandit Country', c: '#b23f7f', l: '#ffc7a6' },
  deccan: { name: 'The Deccan', c: '#a34a2a', l: '#ffcfa8' },
  ghats: { name: 'The Ghats', c: '#1f7a55', l: '#b8f5d0' },
  coast: { name: 'The coast', c: '#157a94', l: '#b4f0ff' },
  east: { name: 'The east', c: '#3f7a2c', l: '#d4f5a8' },
  northeast: { name: 'The northeast', c: '#2c6f6a', l: '#b0f0e4' },
  himalaya: { name: 'The Himalaya', c: '#4f5f9c', l: '#dbe4ff' },
};
export interface StretchBand { from: DayKey; to: DayKey; name: string; c: string; l: string }

/** The range cut into the road's stretches, by where the walk was each day. Bands tile with no gap. */
export function stretchBands(from: DayKey, to: DayKey, stepsByDay: Map<DayKey, number>, strideM?: number): StretchBand[] {
  setStride(strideM);
  let walked = 0;
  for (const [d, s] of stepsByDay) if (d < from) walked += s;
  const out: StretchBand[] = [];
  for (const d of dayRange(from, to)) {
    walked += stepsByDay.get(d) ?? 0;
    const look = STRETCH[regionAt(kmFromSteps(walked))] ?? STRETCH.plains;
    const last = out[out.length - 1];
    if (last?.name === look.name) last.to = d;
    else out.push({ from: d, to: d, ...look });
  }
  return out;
}

export function sortedDays(days: Pick<Day, 'date' | 'steps'>[], today: DayKey, n = 28): number[] {
  const from = addDays(today, -(n - 1));
  return days.filter((d) => d.steps !== undefined && within(d.date, from, today)).map((d) => d.steps!).sort((a, b) => a - b);
}

const HABIT_RATE = 0.1;
/** How automatic it has become, 0 to 100: each day pulls it a tenth of the way toward done or not done. */
export function habitStrength(hits: boolean[]): number[] {
  let s = 0;
  return hits.map((h) => {
    s += ((h ? 1 : 0) - s) * HABIT_RATE;
    return Math.round(s * 100);
  });
}

/** Minutes the last seven logged nights fell short of the target. Sleep over target doesn't bank. */
export function sleepBalance(days: Pick<Day, 'date' | 'sleep'>[], today: DayKey, target: number): number {
  const from = addDays(today, -6);
  return days.filter((d) => d.sleep && within(d.date, from, today)).reduce((n, d) => n + Math.max(0, target - sleepMinutes(d.sleep!.asleep, d.sleep!.woke)), 0);
}

/** How far the middle of the night moves at weekends, in minutes. Needs both to compare. */
export function socialJetLag(days: Pick<Day, 'date' | 'sleep'>[]): number | undefined {
  const mid = (d: Pick<Day, 'sleep'>) => bedOrder(d.sleep!.asleep) + sleepMinutes(d.sleep!.asleep, d.sleep!.woke) / 2;
  const weekend = (d: Pick<Day, 'date'>) => [0, 6].includes(parseDay(d.date).getDay());
  const slept = days.filter((d) => d.sleep);
  const [a, b] = [mean(slept.filter(weekend).map(mid)), mean(slept.filter((d) => !weekend(d)).map(mid))];
  return a === undefined || b === undefined ? undefined : Math.round(Math.abs(a - b));
}

/** Where protein lands between 6 am (0) and midnight (100), by kind of day. */
export function proteinClock(entries: Pick<FoodEntry, 'date' | 'at' | 'eatenAt' | 'protein'>[], kindOf: (d: DayKey) => string, floor = 10) {
  const out = { office: [] as number[], home: [] as number[] };
  for (const e of entries) {
    if (e.protein < floor) continue;
    const t = new Date(e.eatenAt ?? e.at);
    const pos = Math.round((((t.getHours() + t.getMinutes() / 60) - 6) / 18) * 100);
    (kindOf(e.date) === 'office' ? out.office : out.home).push(Math.max(0, Math.min(100, pos)));
  }
  return out;
}

export type JointDay = { date: DayKey; state: 'blank' | 'fine' | 'twinge' | 'flag' };
/** The last n days, oldest first. Nothing logged stays blank and never reads as fine. */
export function jointCalendar(today: DayKey, logged: { date: DayKey }[], flags: { date: DayKey }[], n = 28, twinges: { date: DayKey }[] = []): JointDay[] {
  const has = (l: { date: DayKey }[]) => new Set(l.map((x) => x.date));
  const [a, f, t] = [has(logged), has(flags), has(twinges)];
  return dayRange(addDays(today, -(n - 1)), today).map((date) => ({ date, state: f.has(date) ? 'flag' : t.has(date) ? 'twinge' : a.has(date) ? 'fine' : 'blank' }));
}

const FIT_DAYS = 42;
const TIRED_DAYS = 7;
const SHOW_DAYS = 28;
/** Fitness builds over six weeks of sessions and tiredness over one; freshness is what's left. */
export function fitnessFreshness(sessions: Pick<TrainingSession, 'date' | 'status'>[], today: DayKey): { fitness: number[]; freshness: number[] } {
  const done = new Set(sessions.filter((s) => s.status === 'done').map((s) => s.date));
  if (!done.size) return { fitness: [], freshness: [] };
  let [fit, tired] = [0, 0];
  const fitness: number[] = [];
  const freshness: number[] = [];
  for (const d of dayRange([...done].sort()[0], today)) {
    const load = done.has(d) ? 1 : 0;
    fit += (load - fit) / FIT_DAYS;
    tired += (load - tired) / TIRED_DAYS;
    fitness.push(Math.round(fit * 100));
    freshness.push(Math.round(50 + (fit - tired) * 50));
  }
  return { fitness: fitness.slice(-SHOW_DAYS), freshness: freshness.slice(-SHOW_DAYS) };
}

export const COMPARE_KEYS = { steps: 'Steps', sleep: 'Sleep', protein: 'Protein', kcal: 'Calories', weight: 'Weight' } as const;
export type CompareKey = keyof typeof COMPARE_KEYS;
const COMPARE_DAYS = 60;

/** Two measures over the days that have both, so a gap never reads as a low. */
export function compareSeries(a: CompareKey, b: CompareKey, i: Pick<HeadInput, 'today' | 'days' | 'entries'>) {
  const byDay = new Map<DayKey, { protein: number; kcal: number }>();
  for (const e of i.entries) {
    const c = byDay.get(e.date) ?? { protein: 0, kcal: 0 };
    byDay.set(e.date, { protein: c.protein + e.protein, kcal: c.kcal + e.kcal });
  }
  const read = (k: CompareKey, d: Day): number | undefined => {
    if (k === 'steps') return d.steps;
    if (k === 'sleep') return d.sleep ? sleepMinutes(d.sleep.asleep, d.sleep.woke) : undefined;
    if (k === 'weight') return d.weightKg;
    return byDay.get(d.date)?.[k];
  };
  const from = addDays(i.today, -(COMPARE_DAYS - 1));
  const rows = i.days.filter((d) => within(d.date, from, i.today)).sort((x, y) => x.date.localeCompare(y.date)).flatMap((d) => {
    const [x, y] = [read(a, d), read(b, d)];
    return x === undefined || y === undefined ? [] : [{ date: d.date, x, y }];
  });
  return { days: rows.map((r) => r.date), a: rows.map((r) => r.x), b: rows.map((r) => r.y) };
}

const MIN_SHARED = 14;
const CLEAR = 0.4;
export function moveTogether(a: number[], b: number[]): 'together' | 'opposite' | 'apart' | undefined {
  if (a.length < MIN_SHARED || a.length !== b.length) return undefined;
  const [ma, mb] = [mean(a)!, mean(b)!];
  let [s, sa, sb] = [0, 0, 0];
  a.forEach((x, n) => {
    s += (x - ma) * (b[n] - mb);
    sa += (x - ma) ** 2;
    sb += (b[n] - mb) ** 2;
  });
  const r = sa && sb ? s / Math.sqrt(sa * sb) : 0;
  return r >= CLEAR ? 'together' : r <= -CLEAR ? 'opposite' : 'apart';
}

export function ownSummary(t: CustomTrack, values: (Pick<TrackValue, 'trackId' | 'date' | 'value'> & { id?: string })[], today: DayKey): string {
  const from = addDays(today, -29);
  const mine = values.filter((v) => v.trackId === t.id && within(v.date, from, today));
  if (!mine.length) return 'Not logged yet';
  if (t.kind === 'yesno') return `Yes on ${mine.filter((v) => v.value).length} of ${mine.length} days`;
  const avg = mean(mine.map((v) => v.value))!;
  return t.kind === 'scale' ? `${avg.toFixed(1)} of 5 lately` : `${fmtInt(avg)}${t.unit ? ` ${t.unit}` : ''} a day`;
}

/** A draft for the medicine editor. Nothing is stored until Save. */
/** What led up to a flag: the short night before and the sessions in the days around it, if the data shows any. */
export function beforeFlag(date: DayKey, days: Pick<Day, 'date' | 'sleep'>[], sessions: Pick<TrainingSession, 'date' | 'status'>[], sleepTarget: number): string | undefined {
  const parts: string[] = [];
  const night = days.find((d) => d.date === date)?.sleep;
  if (night && sleepMinutes(night.asleep, night.woke) < sleepTarget) parts.push(`a short night, ${fmtDuration(sleepMinutes(night.asleep, night.woke))}`);
  const near = sessions.filter((s) => s.status === 'done' && s.date < date && s.date >= addDays(date, -3)).length;
  if (near >= 2) parts.push(`${near} sessions in the 3 days before`);
  if (!parts.length) return undefined;
  const line = parts.join(', and ');
  return line[0].toUpperCase() + line.slice(1) + '.';
}

const CONE_MIN_POINTS = 5;
const CONE_DAYS = 28;
/** Where the weight trend points in four weeks, and how unsure that is. Quiet until there are enough weigh-ins. */
export function shapeCone(trend: { date: DayKey; trend: number }[], today: DayKey) {
  const recent = trend.filter((p) => p.date >= addDays(today, -CONE_DAYS));
  if (recent.length < CONE_MIN_POINTS) return undefined;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const span = (parseDay(last.date).getTime() - parseDay(first.date).getTime()) / 86_400_000;
  if (!span) return undefined;
  const perDay = (last.trend - first.trend) / span;
  const mid = last.trend + perDay * CONE_DAYS;
  const spread = Math.max(0.3, Math.abs(perDay) * CONE_DAYS * 0.6);
  return { series: recent.map((p) => p.trend), now: last.trend, mid, low: mid - spread, high: mid + spread };
}

export function newMedicine(name: string, slot: string, now: number): ChecklistItem | undefined {
  const clean = name.trim();
  if (!clean) return undefined;
  return { id: `m${now}`, name: clean, slots: [slot], active: true, med: { kind: 'medicine' } };
}
