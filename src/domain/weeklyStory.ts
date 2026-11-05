import { metBetween, type Sighting } from './creatures';
import { dailyFinding, type Finding } from './dailyFinding';
import { addDays, weekStart, type DayKey } from './dates';
import { fmtDuration, fmtInt } from './format';
import type { Day, FoodEntry, SetEntry, Settings, TrainingSession } from './types';
import { kmFromSteps, positionAt, setStride } from './walk';
import { weekStats, type WeekStats } from './weekly';
import { targetsFor } from '../state/derived';

export interface StoryInput {
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  sightings: Sighting[];
  /** Only for the week you're reading now: backups aren't part of what happened that week. */
  backupText?: string;
}
export type StoryChapter =
  | { id: 'road'; km: number; toKm: number; reached: string; ahead?: string; aheadKm?: number }
  | { id: 'visitors'; ids: string[] }
  | { id: 'tally'; steps?: number; sessions: number; records: number; perfect: number }
  | { id: 'swing'; what: string; now: string; was: string; up: boolean }
  | { id: 'food'; proteinAvg?: number; foodDays: number; inRange: number }
  | { id: 'sleep'; avg: string; nights: number }
  | { id: 'training'; sessions: number; perWeek: number; sets: number; restDays: number; records: SetEntry[] }
  | { id: 'finding'; finding: Finding }
  | { id: 'next'; stop?: string; stepsPerDay?: number; by?: DayKey }
  | { id: 'backup'; text: string };

const NEXT_DAYS = 14;

function swing(w: WeekStats, prev: WeekStats | undefined): StoryChapter | undefined {
  if (!prev?.days) return undefined;
  const options: { what: string; rel: number; now: string; was: string; up: boolean }[] = [];
  const add = (what: string, a: number | undefined, b: number | undefined, fmtNow: (n: number) => string, fmtWas: (n: number) => string) => {
    if (a === undefined || b === undefined || b === 0 || a === b) return;
    options.push({ what, rel: Math.abs(a - b) / b, now: fmtNow(a), was: fmtWas(b), up: a > b });
  };
  add('Steps', w.stepsAvg || undefined, prev.stepsAvg || undefined, (n) => `${fmtInt(n)} a day`, fmtInt);
  add('Protein', w.proteinAvg, prev.proteinAvg, (n) => `${fmtInt(n)} g a day`, fmtInt);
  add('Sleep', w.sleepAvg, prev.sleepAvg, (n) => `${fmtDuration(n)} a night`, fmtDuration);
  add('Sessions', w.sessions || undefined, prev.sessions || undefined, fmtInt, fmtInt);
  if (!options.length) return undefined;
  const best = options.reduce((a, b) => (b.rel > a.rel ? b : a));
  return { id: 'swing', what: best.what, now: best.now, was: best.was, up: best.up };
}

/** One story for one week. It reads only that week and the one before, so a past week opens as it was. */
export function storyChapters(week: DayKey, i: StoryInput): StoryChapter[] {
  const end = addDays(week, 6);
  setStride(i.settings.strideM);
  const until = (d: { date: DayKey }) => d.date <= end;
  const days = i.days.filter(until);
  const entries = i.entries.filter(until);
  const sessions = i.sessions.filter(until);
  const sets = i.sets.filter(until);
  const w = weekStats(i.settings, week, days, entries, sessions, sets);
  const logged = w.days > 0 || w.sessions > 0 || w.foodDays > 0;
  if (!logged) return [];
  const prev = weekStats(i.settings, addDays(week, -7), days, entries, sessions, sets);
  const out: StoryChapter[] = [];

  const toKm = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
  const km = kmFromSteps(w.steps);
  const pos = positionAt(toKm);
  if (km > 0) out.push({ id: 'road', km, toKm, reached: pos.from.name, ahead: pos.to?.name, aheadKm: pos.to ? pos.to.km - toKm : undefined });

  const met = metBetween(i.sightings, week, end);
  if (met.length) out.push({ id: 'visitors', ids: met });

  if (w.steps || w.sessions || w.records.length || w.perfect) out.push({ id: 'tally', steps: w.steps || undefined, sessions: w.sessions, records: w.records.length, perfect: w.perfect });
  const s = swing(w, prev);
  if (s) out.push(s);
  if (w.foodDays > 0) out.push({ id: 'food', proteinAvg: w.proteinAvg, foodDays: w.foodDays, inRange: w.inRange });
  if (w.sleepAvg !== undefined) out.push({ id: 'sleep', avg: fmtDuration(w.sleepAvg), nights: days.filter((d) => d.date >= week && d.sleep).length });
  if (w.sessions > 0) out.push({ id: 'training', sessions: w.sessions, perWeek: targetsFor(i.settings, week).sessionsPerWeek, sets: w.sets, restDays: w.restDays, records: w.records });
  const finding = dailyFinding(end, { today: addDays(end, 1), days, sets });
  if (finding) out.push({ id: 'finding', finding });
  const next: StoryChapter = { id: 'next' };
  if (pos.to) {
    next.stop = pos.to.name;
    next.by = addDays(end, NEXT_DAYS);
    next.stepsPerDay = Math.ceil((pos.to.km - toKm) / kmFromSteps(1) / NEXT_DAYS);
  }
  out.push(next);
  if (i.backupText) out.push({ id: 'backup', text: i.backupText });
  return out;
}

/** Finished weeks with anything logged, newest first. */
export function weeksWithData(days: Day[], sessions: TrainingSession[], today: DayKey): DayKey[] {
  const current = weekStart(today);
  const weeks = new Set<DayKey>();
  for (const d of days) if (d.steps !== undefined || d.sleep) weeks.add(weekStart(d.date));
  for (const s of sessions) if (s.status === 'done') weeks.add(weekStart(s.date));
  return [...weeks].filter((w) => w < current).sort().reverse();
}
