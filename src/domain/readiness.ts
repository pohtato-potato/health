import { addDays, type DayKey } from './dates';
import { fmtDuration } from './format';
import { sleepMinutes } from './rings';
import type { Day, FoodEntry, SetEntry, TrainingSession } from './types';

export interface ReadinessPart {
  name: string;
  points: number;
  max: number;
  note?: string;
}

export interface Readiness {
  score: number;
  band: 'rest' | 'easy' | 'steady' | 'push';
  label: string;
  parts: ReadinessPart[];
  /** Enough to say anything: last night's sleep at least. */
  known: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * A simple readiness score, with every point shown: sleep 25, how rested 20,
 * rest since training 15, recent load 15, last night's drinks 10, joints 15.
 */
export function readiness(input: {
  today: DayKey;
  day?: Day;
  sleepTarget: number;
  sessions: TrainingSession[];
  entriesYesterday: FoodEntry[];
  flagDates: DayKey[];
}): Readiness {
  const { today, day, sleepTarget } = input;
  const parts: ReadinessPart[] = [];
  const done = input.sessions.filter((s) => s.status === 'done' && s.date < today).sort((a, b) => a.startedAt - b.startedAt);

  // Sleep: full marks 40 minutes past the target, nothing below 160 short of it.
  if (day?.sleep) {
    const m = sleepMinutes(day.sleep.asleep, day.sleep.woke);
    const full = sleepTarget + 40;
    const pts = Math.round(25 * clamp((m - (sleepTarget - 160)) / 200, 0, 1));
    const note = m >= full ? 'Full marks.' : m >= sleepTarget ? `Above your ${fmtDuration(sleepTarget)} line. ${full - m} more minutes would have been full marks.` : `${fmtDuration(sleepTarget - m)} under your line.`;
    parts.push({ name: `Sleep, ${fmtDuration(m)}`, points: pts, max: 25, note });
  } else {
    parts.push({ name: 'Sleep, not logged', points: 13, max: 25, note: 'Log it in the morning log for a truer score.' });
  }

  const rested = day?.sleep?.rested;
  parts.push({ name: rested ? `Felt rested, ${rested} of 5` : 'How rested, not logged', points: rested ? rested * 4 : 10, max: 20 });

  const last = done[done.length - 1];
  const sinceLast = last ? Math.round((Date.parse(`${today}T12:00:00`) - Date.parse(`${last.date}T12:00:00`)) / 86_400_000) : 99;
  parts.push({
    name: !last ? 'No sessions yet' : sinceLast <= 1 ? 'Trained yesterday' : `A rest day since ${sinceLast === 2 ? 'the day before yesterday' : `${sinceLast} days ago`}`,
    points: !last ? 15 : sinceLast <= 1 ? 5 : 15,
    max: 15,
  });

  const recent = done.filter((s) => s.date >= addDays(today, -4)).length;
  parts.push({
    name: `Training load: ${recent} session${recent === 1 ? '' : 's'} in 4 days`,
    points: recent <= 1 ? 15 : recent === 2 ? 13 : recent === 3 ? 10 : 5,
    max: 15,
    note: recent >= 4 ? 'High. The plan says rest.' : recent === 3 ? 'Slightly high, not a problem.' : undefined,
  });

  const drinks = input.entriesYesterday.filter((e) => e.kind === 'drink').reduce((n, e) => n + (e.drink?.count ?? 1), 0);
  parts.push({ name: drinks ? `${drinks} drink${drinks === 1 ? '' : 's'} last night` : 'No drinks last night', points: drinks === 0 ? 10 : drinks <= 2 ? 6 : 2, max: 10 });

  const lastFlag = [...input.flagDates].sort().pop();
  const cleanSessions = lastFlag ? done.filter((s) => s.date > lastFlag).length : done.length;
  parts.push({
    name: lastFlag ? `Joints clear for ${cleanSessions} session${cleanSessions === 1 ? '' : 's'}` : 'No joint flags',
    points: lastFlag ? 15 - Math.round(8 * 0.85 ** cleanSessions) : 15,
    max: 15,
    note: lastFlag && cleanSessions < 12 ? 'A recent flag still counts a little.' : undefined,
  });

  const score = parts.reduce((n, p) => n + p.points, 0);
  const band = score >= 80 ? 'push' : score >= 65 ? 'steady' : score >= 50 ? 'easy' : 'rest';
  const label = { push: 'Good to push', steady: 'Steady', easy: 'Take it easy', rest: 'Rest' }[band];
  return { score, band, label, parts, known: !!day?.sleep };
}

/**
 * The chance of beating last time, from your own history once there's enough:
 * the share of sets marked ! or !! in sessions that started at a similar score.
 */
export function beatChance(score: number, sessions: TrainingSession[], sets: SetEntry[]): { pct: number; learned: boolean } {
  const scored = sessions.filter((s) => s.status === 'done' && s.readiness !== undefined);
  if (scored.length >= 10) {
    const near = scored.filter((s) => Math.abs(s.readiness! - score) <= 10);
    const pool = near.length >= 4 ? near : scored;
    const ids = new Set(pool.map((s) => s.id));
    const mine = sets.filter((x) => ids.has(x.sessionId) && !x.drop);
    if (mine.length) return { pct: Math.round((mine.filter((x) => x.mark === '!' || x.mark === '!!').length / mine.length) * 100), learned: true };
  }
  return { pct: clamp(Math.round(score * 0.9 + 8), 25, 95), learned: false };
}
