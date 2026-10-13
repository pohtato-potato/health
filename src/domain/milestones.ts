import { addDays, daysBetween, parseDay, weekStart, type DayKey } from './dates';
import { FESTIVALS } from './festivals';
import { fmtInt } from './format';
import { weightTrend } from './streaks';
import { ALL_STOPS, kmFromSteps, positionAt } from './walk';
import type { Day, Measurement } from './types';

/** An airport-style departures board for what's coming up. */

export interface Milestone {
  id: string;
  /** Short board text, like "BHOPAL". */
  dest: string;
  /** A longer line for the boarding pass. */
  detail: string;
  from: string;
  eta: DayKey;
  /** Fixed dates, like a festival or reveal day, can't be delayed. */
  fixed?: boolean;
  kind: 'walk' | 'streak' | 'training' | 'waist' | 'weight' | 'date';
}

export const STEP_STOPS = [7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365];
export const WEEK_STOPS = [2, 4, 8, 12, 16, 20, 26, 39, 52];

/** Least-squares slope, per day, of values over dates. */
export function slopePerDay(points: { date: DayKey; v: number }[]): number | undefined {
  if (points.length < 3) return undefined;
  const t0 = parseDay(points[0].date).getTime();
  const xs = points.map((p) => (parseDay(p.date).getTime() - t0) / 86_400_000);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = points.reduce((a, p) => a + p.v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (points[i].v - my);
    den += (xs[i] - mx) ** 2;
  }
  return den ? num / den : undefined;
}

export interface BoardInput {
  today: DayKey;
  days: Day[];
  measurements: Measurement[];
  streak: { current: number };
  weeks: { streak: number; thisWeek: number; perWeek: number };
  goalDate?: DayKey;
  nextCheckIn?: DayKey;
}

export function upcomingMilestones(i: BoardInput): Milestone[] {
  const out: Milestone[] = [];
  const steps = new Map(i.days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const km = kmFromSteps([...steps.values()].reduce((a, b) => a + b, 0));
  const pace = kmFromSteps(Array.from({ length: 7 }, (_, k) => steps.get(addDays(i.today, -k - 1)) ?? 0).reduce((a, b) => a + b, 0)) / 7;

  // The next city on the walk.
  const pos = positionAt(km);
  if (pos.to && pace > 0.2) {
    const eta = addDays(i.today, Math.max(1, Math.ceil((pos.to.km - km) / pace)));
    out.push({ id: `city:${pos.to.name}`, dest: pos.to.name, detail: `${fmtInt(pos.to.km - km)} km to walk, at about ${fmtInt(pace)} km a day`, from: pos.from.name, eta, kind: 'walk' });
    const after = ALL_STOPS[ALL_STOPS.findIndex((s) => s.km === pos.to!.km) + 1];
    if (after) out.push({ id: `city:${after.name}`, dest: after.name, detail: `${fmtInt(after.km - km)} km to walk`, from: pos.to.name, eta: addDays(i.today, Math.ceil((after.km - km) / pace)), kind: 'walk' });
  }

  // The next step-streak stop, if the streak is alive.
  const nextStep = STEP_STOPS.find((n) => n > i.streak.current);
  if (i.streak.current > 0 && nextStep) {
    out.push({ id: `streak:${nextStep}`, dest: `${nextStep}-day streak`, detail: `${nextStep - i.streak.current} more days of your step target`, from: `${i.streak.current} days`, eta: addDays(i.today, nextStep - i.streak.current), kind: 'streak' });
  }

  // Training weeks.
  const nextWeeks = WEEK_STOPS.find((n) => n > i.weeks.streak);
  if (nextWeeks) {
    // The streak counts this week once it's done; otherwise this week is the first of the ones left.
    const done = i.weeks.thisWeek >= i.weeks.perWeek;
    const eta = addDays(weekStart(i.today), 6 + 7 * (nextWeeks - i.weeks.streak - (done ? 0 : 1)));
    out.push({ id: `weeks:${nextWeeks}`, dest: `${nextWeeks} training weeks`, detail: `${i.weeks.perWeek} sessions every week`, from: `${i.weeks.streak} weeks`, eta, kind: 'training' });
  }

  // The next whole inch off the waist, from its recent slope.
  const waists = i.measurements.filter((m) => m.waistStanding !== undefined && m.date >= addDays(i.today, -90)).map((m) => ({ date: m.date, v: m.waistStanding! }));
  const wSlope = slopePerDay(waists);
  if (wSlope !== undefined && wSlope < -0.002 && waists.length) {
    const now = waists[waists.length - 1].v;
    const target = Number.isInteger(now) ? now - 1 : Math.floor(now);
    const eta = addDays(waists[waists.length - 1].date, Math.ceil((target - now) / wSlope));
    if (eta > i.today) out.push({ id: `waist:${target}`, dest: `Waist ${target} in`, detail: `${(now - target).toFixed(1)} in to go at the current rate`, from: `${now} in`, eta, kind: 'waist' });
  }

  // The next whole kilo on the weight trend, if it's heading down.
  const trend = weightTrend(i.days.filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, kg: d.weightKg! })));
  const recent = trend.filter((t) => t.date >= addDays(i.today, -28)).map((t) => ({ date: t.date, v: t.trend }));
  const kSlope = slopePerDay(recent);
  if (kSlope !== undefined && kSlope < -0.005 && recent.length) {
    const now = recent[recent.length - 1].v;
    const target = Math.floor(now - 0.05);
    const eta = addDays(recent[recent.length - 1].date, Math.ceil((target - now) / kSlope));
    if (eta > i.today) out.push({ id: `weight:${target}`, dest: `Trend ${target} kg`, detail: `${(now - target).toFixed(1)} kg to go at the current rate`, from: `${now.toFixed(1)} kg`, eta, kind: 'weight' });
  }

  // Fixed dates.
  if (i.nextCheckIn && i.nextCheckIn >= i.today) out.push({ id: `checkin:${i.nextCheckIn}`, dest: 'Check-in', detail: 'Photos, tape and the t-shirt test', from: 'Last check-in', eta: i.nextCheckIn, fixed: true, kind: 'date' });
  const fest = FESTIVALS.find((f) => f.day >= i.today && daysBetween(i.today, f.day) <= 60);
  if (fest) out.push({ id: `fest:${fest.day}`, dest: fest.name, detail: 'Occasion mode is ready when you are', from: 'Home', eta: fest.day, fixed: true, kind: 'date' });
  if (i.goalDate && i.goalDate >= i.today) out.push({ id: 'reveal', dest: 'Reveal day', detail: 'Everything sealed until then opens', from: 'Day 1', eta: i.goalDate, fixed: true, kind: 'date' });

  return out.sort((a, b) => a.eta.localeCompare(b.eta));
}

export type BoardStatus = 'On time' | 'Boarding' | 'Delayed' | 'Early';

/** Status against the first ETA the board showed for this milestone. */
export function statusOf(m: Milestone, scheduled: DayKey | undefined, today: DayKey): BoardStatus {
  if (daysBetween(today, m.eta) <= 2) return 'Boarding';
  if (!scheduled || m.fixed) return 'On time';
  const d = daysBetween(scheduled, m.eta);
  if (d >= 2) return 'Delayed';
  if (d <= -2) return 'Early';
  return 'On time';
}

/** "HL 204": a stable made-up flight number for each milestone. */
export function flightNo(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 900;
  return `HL ${100 + h}`;
}

export type DepartureGroup = 'walk' | 'steps' | 'training' | 'shape';

/** The board's filter a milestone belongs to; fixed dates show only under "all". */
export function milestoneGroup(kind: Milestone['kind']): DepartureGroup | undefined {
  if (kind === 'walk') return 'walk';
  if (kind === 'streak') return 'steps';
  if (kind === 'training') return 'training';
  if (kind === 'waist' || kind === 'weight') return 'shape';
  return undefined;
}
