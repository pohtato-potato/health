import { addDays, daysBetween, type DayKey } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { heatmapLevel } from '../domain/heatmap';
import { realSets } from '../domain/plan';
import type { Day, SetEntry, TrainingSession } from '../domain/types';
import { ALL_STATES, ALL_STOPS, kmFromSteps } from '../domain/walk';
import { landLine } from './regions';

export interface JournalLine {
  date: DayKey;
  head: string;
  body: string;
}

const nearestStop = (km: number) => ALL_STOPS.reduce((a, b) => (Math.abs(b.km - km) < Math.abs(a.km - km) ? b : a));

/**
 * One line a day, newest first: "Day 16 · 15,820 steps · crossed into Rajasthan near
 * Bharatpur", with a line about the land, or the session and what it built.
 */
export function journal(days: Pick<Day, 'date' | 'steps'>[], sessions: Pick<TrainingSession, 'date' | 'status' | 'session'>[], today: DayKey, loaded: Map<DayKey, number> = new Map()): JournalLine[] {
  const sorted = [...days].filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  const first = sorted[0].date;
  const out: JournalLine[] = [];
  let km = 0;
  for (const d of sorted) {
    if (d.steps === undefined) continue;
    const before = km;
    km += kmFromSteps(d.steps);
    const n = daysBetween(first, d.date) + 1;
    const crossed = ALL_STATES.find((s) => s.km > before && s.km <= km);
    const reached = ALL_STOPS.find((s) => s.km > before && s.km <= km);
    const where = crossed ? `crossed into ${crossed.name} near ${nearestStop(crossed.km).name}` : reached ? `reached ${reached.name}` : `${fmtInt(Math.round(km))} km in`;
    const session = sessions.find((s) => s.date === d.date && s.status === 'done');
    const carry = loaded.get(d.date);
    const head = session
      ? `Day ${n} · Session ${session.session}${carry ? ` · ${fmtInt(carry)} loaded steps` : ''} · ${fmtInt(d.steps)} steps`
      : `Day ${n} · ${fmtInt(d.steps)} steps · ${where}`;
    const body = session ? `Camp near ${nearestStop(km).name}, ${where}.` : landLine(km, n);
    out.push({ date: d.date, head, body });
  }
  return out.reverse();
}

export interface Segment {
  date: DayKey;
  from: number;
  to: number;
  /** 1–4: how the day's steps stood against the goal, for the trail's colour. */
  level: 1 | 2 | 3 | 4;
  /** Kilometres of it carried (farmer carries), drawn gold. */
  loaded: number;
}

/** The trail behind you, one piece per day with steps, end to end. */
export function trailSegments(days: Pick<Day, 'date' | 'steps'>[], loaded: Map<DayKey, number>, goal: number): Segment[] {
  let km = 0;
  const out: Segment[] = [];
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!d.steps) continue;
    const from = km;
    km += kmFromSteps(d.steps);
    out.push({ date: d.date, from, to: km, level: heatmapLevel('steps', d.steps, goal) ?? 1, loaded: kmFromSteps(loaded.get(d.date) ?? 0) });
  }
  return out;
}

/** Steps carried each day, from farmer-carry sets measured in steps. */
export function loadedSteps(sets: Pick<SetEntry, 'date' | 'steps' | 'skipped'>[]): Map<DayKey, number> {
  const out = new Map<DayKey, number>();
  for (const s of realSets(sets)) if (s.steps) out.set(s.date, (out.get(s.date) ?? 0) + s.steps);
  return out;
}

/** Where you were this time last month, for the faint walker. Nothing before a month of history. */
export function ghostLastMonth(days: Pick<Day, 'date' | 'steps'>[], today: DayKey): number | undefined {
  const cutoff = addDays(today, -30);
  const before = days.filter((d) => d.date <= cutoff && d.steps !== undefined);
  if (!before.length) return undefined;
  return kmFromSteps(before.reduce((n, d) => n + d.steps!, 0));
}

const TERMS: [string, number][] = [
  ['Delhi to Agra', 230],
  ['Delhi to Jaipur', 280],
  ['Mumbai to Goa', 590],
  ['Delhi to Mumbai', 1420],
  ['Kashmir to Kanyakumari', 3700],
];

/** "You've walked Delhi to Mumbai, twice." */
export function distanceInTerms(km: number): string | undefined {
  const fit = [...TERMS].reverse().find(([, d]) => km >= d);
  if (!fit) return undefined;
  const times = Math.floor(km / fit[1]);
  return `You’ve walked ${fit[0]}${times === 1 ? '' : times === 2 ? ', twice' : `, ${times} times`}.`;
}

/** Day closed's walk line: "Agra tomorrow" when a typical day gets you there, otherwise how far. */
export function nextStopLine(name: string, kmLeft: number, typicalKm: number | undefined): string {
  return typicalKm && kmLeft <= typicalKm ? `${name} tomorrow` : `${name} in ${fmtInt(Math.ceil(kmLeft))} km`;
}
