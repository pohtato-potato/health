// Attributes and the overall rating (spec §3.1 with the approved calibration numbers, report §8).
// Every number comes from a real log. A sick day is "no data": it never counts for or against a player.
import { addDays, daysBetween, type DayKey } from '../../domain/dates';
import { allExercises, valueOfSet } from '../../domain/plan';
import { placeFor } from '../../domain/places';
import { stepsGoal } from '../../domain/rings';
import type { Day, SetEntry, TrainingSession } from '../../domain/types';
import { targetsFor } from '../../state/derived';
import { sleepHours } from '../axes';
import type { Health } from '../store/gather';
import { BIG_DAY, LONG_WALK_KM } from './catalogue';
import { heldLoads, profileStart, profileStarts } from './identity';
import type { Attribute, PlayerDef, Rating } from './types';

export const WINDOW = 28;
/** Growth: 50 at the start, +10 for each step of improvement (25%; 40% for Strength from load). */
export const GROWTH_STEP = 0.25;
export const STRENGTH_STEP = 0.4;
/** Trend can lift the unit, never be the best card. */
export const TREND_CAP = 85;
/** Bedtime kept: asleep by the target plus 45 minutes, or any time earlier that evening. */
export const BEDTIME_GRACE = 45;
const EVENING = 18 * 60;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Rate attributes map straight across: 50% of days is 50, every day is 95. */
export const rate = (share: number) => Math.round(clamp(5 + 90 * clamp(share, 0, 1), 1, 100));
/** Growth attributes compound: 50 at the baseline, +10 per step of improvement. */
export const growth = (ratio: number, step = GROWTH_STEP) => (ratio > 0 ? Math.round(clamp(50 + (10 * Math.log(ratio)) / Math.log(1 + step), 1, 100)) : 1);
/** New signings: rate attributes ramp from the start value to their real value over the first four weeks. */
export const ramp = (v: number, daysIn: number, start = 50) => Math.round(start + (v - start) * clamp(daysIn / WINDOW, 0, 1));
/** Technique from form checks: almost every check is "ok", so it is read around 75%, capped 20–85, tempo adds up to 10. */
export const technique = (okShare: number, tempoShare: number) => Math.round(clamp(50 + 140 * (okShare - 0.75), 20, 85) + 10 * clamp(tempoShare, 0, 1));
export const overallOf = (attrs: Attribute[]) => {
  const w = attrs.reduce((t, a) => t + a.weight, 0);
  return w ? Math.round(clamp(attrs.reduce((t, a) => t + a.value * a.weight, 0) / w, 1, 100)) : 50;
};

/** What every rating reads, built once per Health load. */
export interface Ctx {
  h: Health;
  sick: Set<DayKey>;
  sessions: Map<string, TrainingSession>;
  setsBy: Map<string, SetEntry[]>;
  /** Minutes after midnight; the Football setting, else the usual bedtime. */
  bedtime?: number;
  /** Starting value for rate attributes, per player (youngsters promote with their potential). */
  rampStart?: Record<string, number>;
}
export function ctxFor(h: Health, bedtime?: number, rampStart?: Record<string, number>): Ctx {
  const setsBy = new Map<string, SetEntry[]>();
  for (const s of [...h.sets].sort((a, b) => a.at - b.at)) setsBy.set(s.exerciseId, [...(setsBy.get(s.exerciseId) ?? []), s]);
  return {
    h, setsBy, bedtime, rampStart,
    sick: new Set([...h.days.values()].filter((d) => d.status === 'sick').map((d) => d.date)),
    sessions: new Map(h.sessions.map((s) => [s.id, s])),
  };
}

/** The window's days for a player: the last 28, from its signing, sick days left out. */
function windowDays(c: Ctx, p: PlayerDef, date: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let d = addDays(date, -(WINDOW - 1)); d <= date; d = addDays(d, 1)) if (d >= p.signed && !c.sick.has(d)) out.push(d);
  return out;
}
const share = (n: number, d: number) => (d > 0 ? n / d : 0);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]) => { const m = avg(xs); return Math.sqrt(avg(xs.map((x) => (x - m) ** 2))); };
const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)));
const kg = (n: number) => `${String(Math.round(n * 10) / 10)} kg`;
const A = (id: string, label: string, value: number, weight: number, kind: Attribute['kind'], note: string): Attribute => ({ id, label, value, weight, kind, note });

/** What a player carries from its limit breaks (layer 2): the day growth measures from, and shifted weights. */
export interface RatingExt { base?: DayKey; weights?: Record<string, number>; /** Layer 4: duty's +2s, by attribute id. */ bonus?: Record<string, number> }

/** The player's rating on `date`, or null when there is nothing in its window (it keeps its last overall). */
export function ratingOf(c: Ctx, p: PlayerDef, date: DayKey, ext: RatingExt = {}): Rating | null {
  const days = windowDays(c, p, date);
  const daysIn = daysBetween(p.signed, date) + 1;
  const r = (v: number) => ramp(v, daysIn, c.rampStart?.[p.id] ?? 50);
  const base = ext.base && ext.base > p.signed ? ext.base : p.signed;
  const found = attrsOf(c, p, date, days, r, base);
  const weighted = found && ext.weights ? found.map((a) => (ext.weights![a.id] != null ? { ...a, weight: ext.weights![a.id] } : a)) : found;
  const attrs = weighted && ext.bonus ? weighted.map((a) => (ext.bonus![a.id] ? { ...a, value: Math.min(100, a.value + ext.bonus![a.id]), note: `${a.note} · +${ext.bonus![a.id]} from international duty` } : a)) : weighted;
  // A broken log (a night with no times, say) is no data, never a NaN on a card.
  if (!attrs || attrs.some((a) => !Number.isFinite(a.value))) return null;
  let overall = overallOf(attrs);
  if (p.kind === 'trend') overall = Math.min(TREND_CAP, overall);
  return { overall, attrs };
}

function attrsOf(c: Ctx, p: PlayerDef, date: DayKey, days: DayKey[], r: (v: number) => number, base: DayKey): Attribute[] | null {
  const h = c.h;
  const day = (d: DayKey): Day | undefined => h.days.get(d);
  const goal = (d: DayKey) => stepsGoal(targetsFor(h.settings, d), Boolean(day(d)?.eased) || placeFor(day(d), h.settings).eased);
  switch (p.kind) {
    case 'exercise': return exerciseAttrs(c, p, date, days, r, base);
    case 'steps': {
      const real = days.filter((d) => day(d)?.steps != null && !day(d)?.stepsEstimated);
      if (!real.length) return null;
      const t = targetsFor(h.settings, date).steps;
      const mean = avg(real.map((d) => day(d)!.steps!));
      const atGoal = days.filter((d) => (day(d)?.steps ?? 0) >= goal(d)).length;
      let peak = 0;
      for (let i = 0; i + 7 <= days.length; i++) peak = Math.max(peak, avg(days.slice(i, i + 7).map((d) => day(d)?.steps ?? 0)));
      if (!peak) peak = mean;
      return [
        A('volume', 'Volume', growth(mean / t), 0.5, 'growth', `${fmtK(mean)} a day against a ${fmtK(t)} goal`),
        A('consistency', 'Consistency', r(rate(share(atGoal, days.length))), 0.35, 'rate', `at the goal on ${atGoal} of ${days.length} days`),
        A('peak', 'Peak', growth(peak / t), 0.15, 'growth', `best week ${fmtK(peak)} a day`),
      ];
    }
    case 'big-days': {
      const xs = days.map((d) => day(d)?.steps ?? 0);
      if (!xs.some((x) => x > 0)) return null;
      const big = xs.filter((x) => x >= BIG_DAY).length;
      const top = Math.max(...xs);
      return [
        A('frequency', 'Frequency', r(rate(share(big, 8))), 0.5, 'rate', `${big} days of ${fmtK(BIG_DAY)}+ in 4 weeks (two a week is full marks)`),
        A('biggest', 'Biggest day', growth(top / BIG_DAY), 0.5, 'growth', `${fmtK(top)} steps`),
      ];
    }
    case 'commuter': {
      const away = days.filter((d) => { const k = placeFor(day(d), h.settings).kind; return day(d)?.steps != null && (k === 'office' || k === 'trip'); });
      if (!away.length) return null;
      const mean = avg(away.map((d) => day(d)!.steps!));
      const g = avg(away.map(goal));
      const kept = away.filter((d) => day(d)!.steps! >= goal(d)).length;
      return [
        A('office', 'Office days', growth(mean / g), 0.5, 'growth', `${fmtK(mean)} a day against the eased ${fmtK(g)}`),
        A('kept', 'Kept', r(rate(share(kept, away.length))), 0.5, 'rate', `at the eased goal on ${kept} of ${away.length} away days`),
      ];
    }
    case 'long-walk': {
      const all = h.walks.filter((w) => w.km >= LONG_WALK_KM && w.date <= date && !c.sick.has(w.date)).sort((a, b) => a.date.localeCompare(b.date));
      if (!all.length) return null;
      const inWin = all.filter((w) => days.includes(w.date));
      const best = Math.max(...(inWin.length ? inWin : all.slice(-1)).map((w) => w.km));
      // Measured from the first walk since the last limit break (or the very first).
      const ref = all.find((w) => w.date >= base) ?? all[all.length - 1];
      return [
        A('distance', 'Distance', growth(best / ref.km), 0.5, 'growth', `longest ${best.toFixed(1)} km, from ${ref.km.toFixed(1)} km`),
        A('frequency', 'Frequency', r(rate(share(inWin.length, 4))), 0.5, 'rate', `${inWin.length} walks of ${LONG_WALK_KM} km+ in 4 weeks (one a week is full marks)`),
      ];
    }
    case 'route-walker': {
      const onRoute = (d: DayKey) => h.routes.some((rr) => rr.spans.some((s) => s.from <= d && (!s.to || d <= s.to)));
      const stride = h.settings.strideM ?? 0.74;
      const route = days.filter((d) => onRoute(d) && day(d)?.steps != null);
      if (!route.length) return null;
      const km = (ds: DayKey[]) => ds.reduce((t, d) => t + ((day(d)?.steps ?? 0) * stride) / 1000, 0);
      const firstWeek: DayKey[] = [];
      for (let d = base; d < addDays(base, 7); d = addDays(d, 1)) if (onRoute(d)) firstWeek.push(d);
      const firstKm = km(firstWeek) || 1;
      const perWeek = km(route) / Math.max(1, route.length / 7);
      const kept = route.filter((d) => day(d)!.steps! >= goal(d)).length;
      return [
        A('km', 'km a week', growth(perWeek / firstKm), 0.5, 'growth', `${perWeek.toFixed(1)} km a week on the route`),
        A('kept', 'Days walked', r(rate(share(kept, route.length))), 0.5, 'rate', `at the goal on ${kept} of ${route.length} route days`),
      ];
    }
    case 'calories': {
      const logged = days.filter((d) => (h.kcal.get(d)?.n ?? 0) > 0);
      if (!logged.length) return null;
      const t = (d: DayKey) => targetsFor(h.settings, d);
      const inRange = logged.filter((d) => { const k = h.kcal.get(d)!.kcal; return k >= t(d).kcalMin && k <= t(d).kcalMax; }).length;
      const ks = logged.map((d) => h.kcal.get(d)!.kcal);
      const swings = ks.slice(1).map((k, i) => Math.abs(k - ks[i]));
      const width = Math.max(100, t(date).kcalMax - t(date).kcalMin);
      const steady = swings.length ? clamp(1 - avg(swings) / (2 * width), 0, 1) : 0.5;
      return [
        A('range', 'In range', r(rate(share(inRange, days.length))), 0.7, 'rate', `inside the range on ${inRange} of ${days.length} days`),
        A('steady', 'Steadiness', r(rate(steady)), 0.3, 'rate', `about ${Math.round(avg(swings))} kcal between days`),
      ];
    }
    case 'protein': {
      const logged = days.filter((d) => (h.kcal.get(d)?.n ?? 0) > 0);
      if (!logged.length) return null;
      const target = (d: DayKey) => targetsFor(h.settings, d).proteinG || 1;
      const hit = logged.filter((d) => h.kcal.get(d)!.protein >= target(d)).length;
      const sh = avg(logged.map((d) => Math.min(1, h.kcal.get(d)!.protein / target(d))));
      return [
        A('hit', 'Hit rate', r(rate(share(hit, days.length))), 0.6, 'rate', `at the target on ${hit} of ${days.length} days`),
        A('share', 'Share', r(rate(sh)), 0.4, 'rate', `${Math.round(sh * 100)}% of the target on logged days`),
      ];
    }
    case 'meal': {
      const meal = p.ref as 'breakfast' | 'lunch' | 'dinner';
      const logged = days.filter((d) => h.meals.get(d)?.[meal]);
      if (!logged.length) return null;
      const sh = avg(logged.map((d) => Math.min(1, h.meals.get(d)![meal]!.protein / ((targetsFor(h.settings, d).proteinG || 4) / 4))));
      return [
        A('logged', 'Logged', r(rate(share(logged.length, days.length))), 0.4, 'rate', `logged on ${logged.length} of ${days.length} days`),
        A('protein', 'Protein share', r(rate(sh)), 0.6, 'rate', `${Math.round(sh * 100)}% of a quarter of the protein target`),
      ];
    }
    case 'habit': {
      const item = (h.settings.checklist ?? []).find((i) => i.id === p.ref);
      if (!item) return null;
      const keys = item.slots.map((_, k) => `${item.id}:${k}`);
      const total = days.length * keys.length;
      const ticked = days.reduce((t, d) => t + keys.filter((k) => day(d)?.ticks?.[k] != null).length, 0);
      if (!days.length) return null;
      // "On time" is dropped (calibration §4): when a tick is entered says nothing about when the habit was done.
      return [A('kept', 'Kept', r(rate(share(ticked, total))), 1, 'rate', `${ticked} of ${total} slots ticked`)];
    }
    case 'weigh-in': {
      if (!days.length) return null;
      const n = days.filter((d) => day(d)?.weightKg != null).length;
      return [A('frequency', 'Frequency', r(rate(share(n, days.length))), 1, 'rate', `${n} weigh-ins in ${days.length} days`)];
    }
    case 'waist': {
      // The standing protocol only; two a month is full marks.
      const all = h.measures.filter((m) => m.waist != null && m.date <= date && !c.sick.has(m.date)).sort((a, b) => a.date.localeCompare(b.date));
      if (!all.length) return null;
      const inWin = all.filter((m) => days.includes(m.date)).length;
      const last = all[all.length - 1].waist!;
      const ref = (all.find((m) => m.date >= base) ?? all[all.length - 1]).waist!;
      return [
        A('frequency', 'Frequency', r(rate(share(Math.min(2, inWin), 2))), 0.5, 'rate', `${inWin} measurements in 4 weeks`),
        A('change', 'Change', growth(ref / last), 0.5, 'growth', `${last.toFixed(1)} in, from ${ref.toFixed(1)} in`),
      ];
    }
    case 'trend': {
      const weeks: number[] = [];
      for (let k = 3; k >= 0; k--) {
        const xs: number[] = [];
        for (let i = 0; i < 7; i++) { const d = addDays(date, -(k * 7 + i)); const w = day(d)?.weightKg; if (w != null && !c.sick.has(d)) xs.push(w); }
        if (xs.length) weeks.push(avg(xs));
      }
      if (weeks.length < 2) return null;
      const steps = weeks.slice(1).map((w, i) => w - weeks[i]);
      const toward = steps.filter((x) => x <= 0.1).length;
      return [A('direction', 'Direction', rate(share(toward, steps.length)), 1, 'rate', `steady or down in ${toward} of ${steps.length} weeks`)];
    }
    case 'hours': {
      const nights = days.filter((d) => day(d)?.sleep);
      if (!nights.length) return null;
      const min = targetsFor(h.settings, date).sleepMin;
      const hrs = nights.map((d) => sleepHours(day(d)!.sleep!));
      const inRange = hrs.filter((x) => x * 60 >= min && x * 60 <= min + 150).length;
      return [
        A('length', 'Length', r(rate(share(inRange, nights.length))), 0.6, 'rate', `${inRange} of ${nights.length} nights in your range`),
        A('regular', 'Regularity', r(rate(clamp(1 - sd(hrs) / 1.5, 0, 1))), 0.4, 'rate', `nights vary by about ${Math.round(sd(hrs) * 60)} minutes`),
      ];
    }
    case 'bedtime': {
      const nights = days.filter((d) => day(d)?.sleep);
      if (!nights.length) return null;
      const target = c.bedtime ?? usualBedtime(h, date) ?? 0;
      const kept = nights.filter((d) => bedtimeKept(day(d)!.sleep!.asleep, target)).length;
      const beds = nights.map((d) => (day(d)!.sleep!.asleep + 720) % 1440);
      return [
        A('kept', 'Kept', r(rate(share(kept, nights.length))), 0.7, 'rate', `asleep by ${clock(target + BEDTIME_GRACE)} on ${kept} of ${nights.length} nights`),
        A('spread', 'Spread', r(rate(clamp(1 - sd(beds) / 90, 0, 1))), 0.3, 'rate', `bedtimes vary by about ${Math.round(sd(beds))} minutes`),
      ];
    }
    case 'rested': {
      // Blank nights drop out of the average instead of counting as 0 (spec §16).
      const xs = days.map((d) => day(d)?.sleep?.rested).filter((x): x is number => typeof x === 'number' && x > 0);
      if (!xs.length) return null;
      const m = avg(xs);
      return [A('quality', 'Quality', r(rate((m - 1) / 4)), 1, 'rate', `rested ${m.toFixed(1)} of 5 on average, ${xs.length} nights rated`)];
    }
  }
}

/** Asleep by the target plus 45 minutes; going to bed earlier that evening also counts. */
export function bedtimeKept(asleep: number, target: number): boolean {
  const rel = (m: number) => (m - EVENING + 1440) % 1440;
  return rel(asleep) <= rel(target + BEDTIME_GRACE);
}
export function usualBedtime(h: Health, date: DayKey): number | undefined {
  const xs: number[] = [];
  for (let d = addDays(date, -27); d <= date; d = addDays(d, 1)) { const a = h.days.get(d)?.sleep?.asleep; if (a !== undefined) xs.push((a + 720) % 1440); }
  if (!xs.length) return undefined;
  xs.sort((a, b) => a - b);
  return (xs[xs.length >> 1] + 720) % 1440;
}
export const clock = (m: number) => { const x = ((m % 1440) + 1440) % 1440; return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };

/** Best estimated single lift (load × reps) of a session from loads held in two sessions; the first session counts as it is. */
const e1rm = (s: SetEntry) => (s.loadKg ?? 0) * (1 + (s.reps ?? 0) / 30);
function exerciseAttrs(c: Ctx, p: PlayerDef, date: DayKey, days: DayKey[], r: (v: number) => number, base: DayKey): Attribute[] | null {
  const refs = p.refs ?? [p.ref!];
  const every = refs.flatMap((id) => c.setsBy.get(id) ?? []).filter((s) => s.date <= date && !s.drop && !c.sick.has(s.date)).sort((a, b) => a.at - b.at);
  // One kit at a time (calibration §12): Strength and Endurance read only the current kit's sets, from its first one.
  // Home sets on the old kit still count for Consistency and Technique.
  const kit = [...refs].reverse().find((id) => every.some((s) => s.exerciseId === id)) ?? refs[0];
  const all = every.filter((s) => s.exerciseId === kit);
  const plan = c.h.settings.plan;
  const def = plan ? allExercises(plan).find((e) => e.id === kit) : undefined;
  const firstDay = all[0]?.date ?? p.signed;
  const layer1 = profileStart(profileStarts(all, def, c.sessions, plan?.planVersion), firstDay, date);
  const start = base > layer1 && base <= date ? base : layer1;
  const sets = all.filter((s) => s.date >= start);
  const win = new Set(days);
  const sessionIds: string[] = [];
  for (const s of sets) if (!sessionIds.includes(s.sessionId)) sessionIds.push(s.sessionId);
  const bySession = (id: string) => sets.filter((s) => s.sessionId === id);
  const held = heldLoads(sets);
  const loaded = sets.some((s) => (s.loadKg ?? 0) > 0);
  const measure = sets.some((s) => s.steps != null) ? 'steps' : sets.some((s) => s.seconds != null && s.reps == null) ? 'seconds' : 'reps';

  // Strength: from load when there is load; bodyweight reps grow it from reps; holds and carries without load stay at 50.
  const strength = (id: string, isBase: boolean): number | undefined => {
    const xs = bySession(id);
    if (loaded && measure === 'reps') {
      const ok = xs.filter((s) => s.loadKg != null && (isBase || held.has(s.loadKg)));
      return ok.length ? Math.max(...ok.map(e1rm)) : undefined;
    }
    if (loaded) { const ok = xs.filter((s) => s.loadKg != null && (isBase || held.has(s.loadKg))); return ok.length ? Math.max(...ok.map((s) => s.loadKg!)) : undefined; }
    if (measure === 'reps') return Math.max(0, ...xs.map((s) => s.reps ?? 0)) || undefined;
    return undefined;
  };
  // Endurance: clean reps at the session's top load plus reps past the burn; seconds or steps for holds and carries.
  const endurance = (id: string): number => {
    const xs = bySession(id);
    if (measure !== 'reps') return Math.max(0, ...xs.map((s) => valueOfSet(s) ?? 0));
    const top = Math.max(0, ...xs.map((s) => s.loadKg ?? 0));
    const atTop = xs.filter((s) => (s.loadKg ?? 0) === top);
    return avg(atTop.map((s) => (s.cleanReps ?? s.reps ?? 0) + (s.burnAt != null && s.reps != null ? Math.max(0, s.reps - s.burnAt) : 0)));
  };
  const recent = sessionIds.filter((id) => win.has(bySession(id)[0].date));
  const look = recent.length ? recent : sessionIds.slice(-1);
  const out: Attribute[] = [];
  if (sessionIds.length) {
    const base = strength(sessionIds[0], true);
    const bests = look.map((id) => strength(id, false)).filter((x): x is number => x != null);
    const now = bests.length ? Math.max(...bests) : base;
    const step = loaded ? STRENGTH_STEP : GROWTH_STEP;
    const sv = base && now ? growth(now / base, step) : 50;
    const top = Math.max(0, ...sets.filter((s) => s.loadKg != null && held.has(s.loadKg)).map((s) => s.loadKg!));
    out.push(A('strength', 'Strength', sv, 0.35, 'growth', base && now ? (loaded ? `${kg(top || Math.max(0, ...sets.map((s) => s.loadKg ?? 0)))} at best${start !== firstDay ? ', since the form changed' : ''}` : `${now} reps at best, from ${base}`) : 'no load logged: starts at 50'));
    const e0 = endurance(sessionIds[0]) || 1;
    const e1 = Math.max(...look.map(endurance));
    out.push(A('endurance', 'Endurance', growth(e1 / e0), 0.25, 'growth', measure === 'reps' ? `${e1.toFixed(1)} clean reps a set at the top load, from ${e0.toFixed(1)}` : `${Math.round(e1)} ${measure} at best, from ${Math.round(e0)}`));
  } else {
    out.push(A('strength', 'Strength', 50, 0.35, 'growth', 'not trained yet'), A('endurance', 'Endurance', 50, 0.25, 'growth', 'not trained yet'));
  }
  // Consistency: planned sessions it appeared in (a swap away still counts for it).
  const planned = c.h.sessions.filter((s) => win.has(s.date) && refs.some((id) => s.exercises.includes(id)));
  // In the plan but never trained and never in a session yet: no data, it keeps its starting 50.
  if (!sessionIds.length && !planned.length) return null;
  const appeared = planned.filter((s) => every.some((x) => x.sessionId === s.id) || s.swapped?.some((w) => refs.includes(w.from))).length;
  const cons = r(rate(share(appeared, planned.length || (every.length ? 1 : 0))));
  const consNote = planned.length ? `in ${appeared} of ${planned.length} planned sessions` : 'no planned sessions in 4 weeks';
  // Technique: form checks marked ok, plus tempo kept; it falls back to Consistency with no checks.
  const winSets = every.filter((s) => win.has(s.date) && s.date >= layer1);
  const marks = winSets.flatMap((s) => Object.values(s.checks ?? {}));
  const tempoSets = def?.tempo ? winSets : [];
  const tempoShare = tempoSets.length ? share(tempoSets.filter((s) => s.tempo).length, tempoSets.length) : 0;
  const tech = marks.length ? r(technique(share(marks.filter((m) => m === 'ok').length, marks.length), tempoShare)) : cons;
  out.push(A('technique', 'Technique', tech, 0.2, 'rate', marks.length ? `ok on ${marks.filter((m) => m === 'ok').length} of ${marks.length} form checks` : 'no form checks yet: follows Consistency'));
  out.push(A('consistency', 'Consistency', cons, 0.2, 'rate', consNote));
  return out;
}
