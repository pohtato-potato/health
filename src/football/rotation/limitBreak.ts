// Limit breaks (spec §5, calibration §8 and §12): a real change in how you train or live, not a number creeping up.
// Each check reads only real logs since the player's last limit break (its base), never on a sick day. Each player can
// limit break once per tier; a kit switch or the coach's next step is always one, because the baseline must reset.
import { addDays, daysBetween, type DayKey } from '../../domain/dates';
import type { SetEntry } from '../../domain/types';
import { targetsFor } from '../../state/derived';
import { bedtimeKept, usualBedtime, type Ctx } from '../players/attributes';
import type { BreakWhy, FbPlayer, PlayerDef } from '../players/types';
import type { RotationRules } from './rules';

export interface BreakFound {
  why: BreakWhy;
  /** Plain words for what changed. */
  what: string;
  /** Weight moved from one attribute to another: [to, from, amount]. */
  shift?: [string, string, number];
}

/**
 * Power: a new rep scheme held 4 weeks; a load up 25% held over 3 sessions and 3 weeks. "Weeks" are calendar weeks
 * the run of sessions covers: weekly sessions on days 0, 7, 14 and 21 cover four.
 */
export const SCHEME_DAYS = 21;
export const SCHEME_CHANGE = 0.3;
export const LOAD_UP = 1.25;
export const LOAD_DAYS = 14;
export const HELD_SESSIONS = 3;
/** Pace: a steps band is 2,000 a day; held 4 weeks. Walks: distance up 25%. */
export const STEP_BAND = 2000;
export const DIST_UP = 1.25;
/** Rest: bedtime kept 6 nights in 7, for four weeks. */
export const BED_WEEKS = 4;
/** Routine: a habit kept on 60 days. */
export const HABIT_DAYS = 60;
/** Shape: waist down 1 inch. */
export const WAIST_DOWN = 1;
/** A shifted weight never drops below this. */
export const MIN_WEIGHT = 0.05;

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const fmtK = (n: number) => `${(n / 1000).toFixed(0)}k`;

/** One session of an exercise: its day, top load and rep scheme (median reps a set). */
interface Sess { date: DayKey; top: number; reps: number }
function sessionsOf(sets: SetEntry[]): Sess[] {
  const by = new Map<string, SetEntry[]>();
  for (const s of sets) by.set(s.sessionId, [...(by.get(s.sessionId) ?? []), s]);
  return [...by.values()].map((xs) => ({ date: xs[0].date, top: Math.max(0, ...xs.map((s) => s.loadKg ?? 0)), reps: median(xs.filter((s) => s.reps != null).map((s) => s.reps!)) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
/** The trailing run of sessions that all pass `ok`, oldest first. */
function trailing(xs: Sess[], ok: (s: Sess) => boolean): Sess[] {
  const out: Sess[] = [];
  for (let i = xs.length - 1; i >= 0 && ok(xs[i]); i--) out.unshift(xs[i]);
  return out;
}

function exerciseBreak(c: Ctx, d: PlayerDef, base: DayKey, date: DayKey): BreakFound | null {
  const refs = d.refs ?? [d.ref!];
  const all = refs.flatMap((id) => c.setsBy.get(id) ?? []).filter((s) => s.date <= date && !s.drop && !s.skipped && !c.sick.has(s.date));
  const kit = [...refs].reverse().find((id) => all.some((s) => s.exerciseId === id)) ?? refs[0];
  const kitSets = all.filter((s) => s.exerciseId === kit);
  const firstKit = kitSets.reduce<DayKey | undefined>((a, s) => (!a || s.date < a ? s.date : a), undefined);
  const from = firstKit && firstKit > base ? firstKit : base;
  const xs = sessionsOf(kitSets.filter((s) => s.date >= from));
  if (xs.length < HELD_SESSIONS + 1) return null;
  const timed = kitSets.some((s) => s.reps == null);
  // The scheme and load it started this stretch with: the first session since the base.
  const ref = xs[0];
  if (!timed && ref.reps > 0) {
    const off = (s: Sess) => s.reps > 0 && Math.abs(s.reps - ref.reps) / ref.reps >= SCHEME_CHANGE;
    const run = trailing(xs.slice(1), off);
    const steady = run.length ? run.every((s) => Math.abs(s.reps - run[0].reps) / run[0].reps < SCHEME_CHANGE) : false;
    if (steady && run.length >= HELD_SESSIONS && daysBetween(run[0].date, date) >= SCHEME_DAYS) {
      const fewer = run[run.length - 1].reps < ref.reps;
      return { why: 'rep-scheme', what: `about ${run[run.length - 1].reps} reps a set held for four weeks, after ${ref.reps}`, shift: fewer ? ['strength', 'endurance', 0.1] : ['endurance', 'strength', 0.1] };
    }
  }
  if (ref.top > 0) {
    const run = trailing(xs.slice(1), (s) => s.top >= ref.top * LOAD_UP);
    if (run.length >= HELD_SESSIONS && daysBetween(run[0].date, date) >= LOAD_DAYS) {
      const kg = Math.min(...run.map((s) => s.top));
      return { why: 'load', what: `${kg} kg held for ${run.length} sessions, up from ${ref.top} kg`, shift: ['strength', 'endurance', 0.05] };
    }
  }
  return null;
}

function stepsBreak(c: Ctx, base: DayKey, date: DayKey): BreakFound | null {
  const steps = (from: DayKey, to: DayKey) => {
    const xs: number[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) { const day = c.h.days.get(d); if (!c.sick.has(d) && day?.steps != null && !day.stepsEstimated) xs.push(day.steps); }
    return xs;
  };
  // The band it started this stretch in: the four weeks from its base.
  const refEnd = addDays(base, 27);
  if (daysBetween(refEnd, date) < 28) return null;
  const refBand = Math.floor(avg(steps(base, refEnd)) / STEP_BAND);
  const next = (refBand + 1) * STEP_BAND;
  for (let k = 0; k < 4; k++) {
    const wk = steps(addDays(date, -(k * 7 + 6)), addDays(date, -k * 7));
    if (wk.length < 4 || avg(wk) < next) return null;
  }
  return { why: 'band', what: `${fmtK(next)}+ a day held for four weeks, up from the ${fmtK(refBand * STEP_BAND)} band`, shift: ['volume', 'peak', 0.1] };
}

function walkBreak(c: Ctx, base: DayKey, date: DayKey): BreakFound | null {
  const walks = c.h.walks.filter((w) => w.km >= 5 && w.date <= date && !c.sick.has(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  const before = walks.filter((w) => w.date <= base);
  const ref = before.length ? Math.max(...before.map((w) => w.km)) : walks[0]?.km;
  const after = walks.filter((w) => w.date > base && w.date > (before.length ? base : walks[0].date));
  if (!ref || !after.length) return null;
  const best = Math.max(...after.map((w) => w.km));
  if (best < ref * DIST_UP || !after.some((w) => w.date === date)) return null;
  return { why: 'distance', what: `a ${best.toFixed(1)} km walk, up from ${ref.toFixed(1)} km`, shift: ['distance', 'frequency', 0.1] };
}

function routeBreak(c: Ctx, base: DayKey, date: DayKey): BreakFound | null {
  const stride = c.h.settings.strideM ?? 0.74;
  const onRoute = (d: DayKey) => c.h.routes.some((r) => r.spans.some((s) => s.from <= d && (!s.to || d <= s.to)));
  const kmWeek = (from: DayKey, to: DayKey) => {
    let km = 0, n = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) { const day = c.h.days.get(d); if (!c.sick.has(d) && onRoute(d) && day?.steps != null) { km += (day.steps * stride) / 1000; n++; } }
    return n ? (km / n) * 7 : 0;
  };
  const refEnd = addDays(base, 27);
  if (daysBetween(refEnd, date) < 28) return null;
  const ref = kmWeek(base, refEnd);
  const now = kmWeek(addDays(date, -27), date);
  if (!ref || now < ref * DIST_UP) return null;
  return { why: 'distance', what: `${now.toFixed(0)} km a week on the route, up from ${ref.toFixed(0)}`, shift: ['km', 'kept', 0.1] };
}

function bedtimeBreak(c: Ctx, base: DayKey, date: DayKey): BreakFound | null {
  if (daysBetween(base, date) < BED_WEEKS * 7 - 1) return null;
  const target = c.bedtime ?? usualBedtime(c.h, date);
  if (target === undefined) return null;
  for (let k = 0; k < BED_WEEKS; k++) {
    let nights = 0, kept = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(date, -(k * 7 + i));
      if (c.sick.has(d)) continue;
      nights++;
      const sl = c.h.days.get(d)?.sleep;
      if (sl && bedtimeKept(sl.asleep, target)) kept++;
    }
    if (nights < 5 || kept < nights - 1) return null;
  }
  return { why: 'bedtime', what: 'bedtime kept 6 nights in 7 for four weeks', shift: ['kept', 'spread', 0.1] };
}

/** The last 30 well days, if all of them come after the base. */
function last30(c: Ctx, base: DayKey, date: DayKey): DayKey[] | null {
  const out: DayKey[] = [];
  for (let d = date; out.length < 30; d = addDays(d, -1)) { if (d < base) return null; if (!c.sick.has(d)) out.push(d); }
  return out;
}
function fuelBreak(c: Ctx, d: PlayerDef, base: DayKey, date: DayKey, rules: RotationRules): BreakFound | null {
  const ds = last30(c, base, date);
  if (!ds) return null;
  const t = (x: DayKey) => targetsFor(c.h.settings, x);
  if (d.kind === 'protein') {
    const hit = ds.filter((x) => { const k = c.h.kcal.get(x); return k && k.n > 0 && k.protein >= (t(x).proteinG || Infinity); }).length;
    return hit >= rules.fuelBreakDays ? { why: 'protein', what: `protein reached on ${hit} of 30 days`, shift: ['hit', 'share', 0.1] } : null;
  }
  // Inside the range only: going under never counts (nothing rewards eating less).
  const inRange = ds.filter((x) => { const k = c.h.kcal.get(x); return k && k.n > 0 && k.kcal >= t(x).kcalMin && k.kcal <= t(x).kcalMax; }).length;
  return inRange >= rules.fuelBreakDays ? { why: 'calories', what: `inside the calorie range on ${inRange} of 30 days`, shift: ['range', 'steady', 0.1] } : null;
}

function habitBreak(c: Ctx, d: PlayerDef, base: DayKey, date: DayKey): BreakFound | null {
  const item = (c.h.settings.checklist ?? []).find((i) => i.id === d.ref);
  if (!item || daysBetween(base, date) + 1 < HABIT_DAYS) return null;
  let kept = 0;
  for (let x = base; x <= date; x = addDays(x, 1)) {
    if (c.sick.has(x)) continue;
    const ticks = c.h.days.get(x)?.ticks;
    if (item.slots.every((_, k) => ticks?.[`${item.id}:${k}`] != null)) kept++;
  }
  return kept >= HABIT_DAYS ? { why: 'habit', what: `kept on ${kept} days` } : null;
}

function waistBreak(c: Ctx, base: DayKey, date: DayKey): BreakFound | null {
  const all = c.h.measures.filter((m) => m.waist != null && m.date <= date && !c.sick.has(m.date)).sort((a, b) => a.date.localeCompare(b.date));
  const today = all.find((m) => m.date === date);
  if (!today) return null;
  const before = all.filter((m) => m.date <= base);
  const ref = (before[before.length - 1] ?? all[0]).waist!;
  if (today === all[0] || today.waist! > ref - WAIST_DOWN) return null;
  return { why: 'waist', what: `waist ${today.waist!.toFixed(1)} in, down from ${ref.toFixed(1)} in`, shift: ['change', 'frequency', 0.1] };
}

/** A kit switch or the coach's next step, on the day of the first set on the new exercise. */
export function switchOn(d: PlayerDef, date: DayKey): BreakFound | null {
  const sw = d.switches?.find((s) => s.on === date);
  if (!sw) return null;
  return sw.why === 'kit'
    ? { why: 'kit', what: `the first session on new kit: ${d.name}` }
    : { why: 'profile', what: `the coach's next step: ${d.name}` };
}

/** Whether a player limit breaks today, and why. Never on a sick day; once per tier except for a switch. */
export function breakToday(c: Ctx, d: PlayerDef, p: FbPlayer, date: DayKey, rules: RotationRules): BreakFound | null {
  if (c.sick.has(date) || p.status !== 'squad') return null;
  const sw = switchOn(d, date);
  if (sw) return sw;
  if (p.limitBreaks.some((l) => l.tier === p.card.tier)) return null;
  const base = p.base ?? p.signed;
  switch (d.kind) {
    case 'exercise': return exerciseBreak(c, d, base, date);
    case 'steps': return stepsBreak(c, base, date);
    case 'long-walk': return walkBreak(c, base, date);
    case 'route-walker': return routeBreak(c, base, date);
    case 'bedtime': return bedtimeBreak(c, base, date);
    case 'protein': case 'calories': return fuelBreak(c, d, base, date, rules);
    case 'habit': return habitBreak(c, d, base, date);
    case 'waist': return waistBreak(c, base, date);
    default: return null;
  }
}

/** The weights after a shift, as a full map (attribute id → weight). */
export function shiftWeights(weights: Record<string, number>, shift: BreakFound['shift']): { weights: Record<string, number>; moved?: [string, number, number][] } {
  if (!shift) return { weights };
  const [to, from, amount] = shift;
  if (weights[to] == null || weights[from] == null) return { weights };
  const k = Math.min(amount, Math.max(0, weights[from] - MIN_WEIGHT));
  if (k <= 0) return { weights };
  const r = (x: number) => Math.round(x * 100) / 100;
  const next = { ...weights, [to]: r(weights[to] + k), [from]: r(weights[from] - k) };
  return { weights: next, moved: [[to, weights[to], next[to]], [from, weights[from], next[from]]] };
}
