import { spokenLine } from './gremlin';
import { seeded, type Sighting } from './creatures';
import { dayKey, daysBetween, parseDay, weekStart, type DayKey } from './dates';
import { fmtDayMonth, fmtInt } from './format';
import type { Stat } from './shakeStats';
import type { Day, Settings } from './types';
import { kmFromSteps, positionAt, setStride } from './walk';
import { lastFullWeek } from './weekly';

export type Lift =
  | { kind: 'ago'; text: string }
  | { kind: 'rank'; beat: number; of: number }
  | { kind: 'visitor'; id: string; mornings: number }
  | { kind: 'best'; value: string; note: string };
export type Mood = 'tired' | 'off' | 'bored';
export interface SlowInput { days: Day[]; sightings: Sighting[]; settings: Settings }

const GAP_DAYS = 3;
const MIN_WEEKS = 3;
const MIN_MORNINGS = 2;

const GREMLIN_MOOD = { tired: 'slowTired', off: 'slowOff', bored: 'slowBored' } as const;

function monthAgo(today: DayKey): DayKey | undefined {
  const d = parseDay(today);
  const day = d.getDate();
  const back = new Date(d.getFullYear(), d.getMonth() - 1, day, 12);
  if (back.getDate() !== day) return undefined;
  return dayKey(back);
}

/** How last full week's steps stood against your other logged weeks. Only said when it beat something. */
export function rankOfLastWeek(today: DayKey, days: Day[]): { beat: number; of: number } | undefined {
  const target = lastFullWeek(today);
  const current = weekStart(today);
  const weeks = new Map<DayKey, number>();
  for (const d of days) {
    if (d.steps === undefined) continue;
    const w = weekStart(d.date);
    if (w < current) weeks.set(w, (weeks.get(w) ?? 0) + d.steps);
  }
  const mine = weeks.get(target);
  if (mine === undefined || weeks.size < MIN_WEEKS) return undefined;
  const others = [...weeks].filter(([w]) => w !== target).map(([, v]) => v);
  const beat = others.filter((v) => v < mine).length;
  return beat ? { beat, of: others.length } : undefined;
}

function liftCandidates(today: DayKey, i: SlowInput): Lift[] {
  const out: Lift[] = [];
  const ago = monthAgo(today);
  const then = ago && i.days.find((d) => d.date === ago);
  if (then && then.steps) out.push({ kind: 'ago', text: `${fmtInt(then.steps)} steps, on ${fmtDayMonth(then.date)}.` });
  const rank = rankOfLastWeek(today, i.days);
  if (rank) out.push({ kind: 'rank', ...rank });
  const visits = new Map<string, number>();
  for (const s of i.sightings) visits.set(s.creatureId, (visits.get(s.creatureId) ?? 0) + 1);
  const top = [...visits].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (top && top[1] >= MIN_MORNINGS) out.push({ kind: 'visitor', id: top[0], mornings: top[1] });
  const steps = i.days.flatMap((d) => (d.steps ? [d] : []));
  if (steps.length) {
    const best = steps.reduce((a, b) => (b.steps! > a.steps! || (b.steps === a.steps && b.date < a.date) ? b : a));
    out.push({ kind: 'best', value: fmtInt(best.steps!), note: `Your most steps in a day, on ${fmtDayMonth(best.date)}` });
  }
  return out;
}

/** One small good thing, the same all day. */
export function todaysLift(today: DayKey, i: SlowInput): Lift | undefined {
  const all = liftCandidates(today, i);
  return all.length ? all[Math.floor(seeded(`lift:${today}`)() * all.length)] : undefined;
}

/** How often you have come back after a stretch away. The days since your last log aren't a return yet. */
export function comebacks(days: Day[], today: DayKey): { count: number; longestGap: number; backInDays: number | undefined } {
  const logged = days.filter((d) => d.date <= today && (d.steps !== undefined || d.sleep)).sort((a, b) => a.date.localeCompare(b.date));
  const steps = logged.flatMap((d) => (d.steps === undefined ? [] : [d.steps])).sort((a, b) => a - b);
  const usual = steps[Math.floor(steps.length / 2)];
  let count = 0;
  let longestGap = 0;
  const back: number[] = [];
  for (let n = 1; n < logged.length; n++) {
    const gap = daysBetween(logged[n - 1].date, logged[n].date) - 1;
    if (gap < GAP_DAYS) continue;
    count++;
    longestGap = Math.max(longestGap, gap);
    const usualAgain = logged.slice(n).find((d) => d.steps !== undefined && d.steps >= usual);
    if (usualAgain) back.push(daysBetween(logged[n].date, usualAgain.date));
  }
  return { count, longestGap, backInDays: back.length ? Math.round(back.reduce((a, b) => a + b, 0) / back.length) : undefined };
}

function aheadLine(today: DayKey, i: SlowInput): string {
  setStride(i.settings.strideM);
  const walked = i.days.reduce((n, d) => (d.date <= today && d.steps ? n + d.steps : n), 0);
  const to = positionAt(kmFromSteps(walked)).to;
  return to ? `${to.name} is still ahead, and it will wait.` : 'The road will still be there.';
}

export function moodCard(mood: Mood, today: DayKey, i: SlowInput, stat?: Stat): { title: string; line: string; gremlin: string } {
  const gremlin = spokenLine(i.settings, today, GREMLIN_MOOD[mood], today);
  if (mood === 'tired') return { title: 'Tired', line: `Nothing is owed today. ${aheadLine(today, i)}`, gremlin };
  if (mood === 'bored') return { title: 'Bored', line: stat?.text ?? 'Not enough logged for a good fact yet. Give it a few days.', gremlin };
  const c = comebacks(i.days, today);
  if (!c.count) return { title: 'Off plan', line: 'A day off plan is still a day. Log what happened, or log nothing. Both are fine.', gremlin };
  const back = c.backInDays === undefined ? '' : ` You were back to usual in about ${c.backInDays} day${c.backInDays === 1 ? '' : 's'}.`;
  return {
    title: 'Off plan',
    line: `You've come back ${c.count} time${c.count === 1 ? '' : 's'}. Your longest gap was ${c.longestGap} days.${back}`,
    gremlin,
  };
}

/** You've come back: the last logged day before today was a while ago. A first day has nothing to come back from. */
export function returnedAfterGap(days: Pick<Day, 'date' | 'steps' | 'sleep'>[], today: DayKey): boolean {
  const last = days.filter((d) => d.date < today && (d.steps !== undefined || d.sleep)).map((d) => d.date).sort().pop();
  return !!last && daysBetween(last, today) >= GAP_DAYS;
}
