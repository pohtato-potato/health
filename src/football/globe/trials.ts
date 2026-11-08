// Sleep-style trials (spec §9.2 step 1, step 7). Pure.
// Every Sunday morning up to 2 youngsters turn up at the academy (Weekly trials adds a Wednesday, for one). The week's
// sleep style decides who comes, and better sleep makes a rarer youngster more likely:
//   early, regular nights → steady defenders (Shape or Rest habits)
//   long sleeps           → high-potential prospects (4 or 5 stars)
//   short but rested      → quick wingers (Pace habits)
//   mixed                 → anyone
// A trialist waits a couple of days to be tied to a real habit (the Portakabin: a week), then leaves kindly.
import { addDays, type DayKey } from '../../domain/dates';
import { sleepHours } from '../axes';
import { NATION_POOL } from '../content/nations';
import type { YouthDef } from '../data/load';
import { bedtimeKept } from '../players/attributes';
import { hashSeed, rng } from '../rng';
import type { Health } from '../store/gather';
import type { FbSquadRow } from '../store/tables';
import type { SleepStyle } from './types';

export const TRIAL_SIZE = 2;
/** Days a trialist waits for its habit link (the trial day and the next), unless the tree holds it longer. */
export const TRIAL_HOLD = 2;
/** Academy places before the tree adds more (spec §9.2 step 7). */
export const ACADEMY_SLOTS = 3;

export const weekday = (d: DayKey) => new Date(`${d}T12:00:00Z`).getUTCDay();
/** Sunday trials, and Wednesday ones with Weekly trials. */
export function trialDay(d: DayKey, extraDay: boolean): 'sunday' | 'midweek' | undefined {
  const w = weekday(d);
  if (w === 0) return 'sunday';
  if (extraDay && w === 3) return 'midweek';
  return undefined;
}

export interface SleepWeek { style: SleepStyle; nights: number; kept: number; hours: number; rested?: number; quality: number }
/**
 * The week's sleep style, from the last 7 logged nights up to `date`. Fewer than 3 nights logged reads as mixed with no
 * extra luck: nothing is ever guessed.
 */
export function sleepWeek(h: Health, date: DayKey, bedtime: number | undefined): SleepWeek {
  const nights = Array.from({ length: 7 }, (_, i) => h.days.get(addDays(date, -i))?.sleep).filter((s): s is NonNullable<typeof s> => Boolean(s));
  if (nights.length < 3) return { style: 'mixed', nights: nights.length, kept: 0, hours: 0, quality: 0 };
  const hours = nights.reduce((t, s) => t + sleepHours(s), 0) / nights.length;
  const kept = bedtime === undefined ? 0 : nights.filter((s) => bedtimeKept(s.asleep, bedtime)).length;
  const asleep = nights.map((s) => (s.asleep + 720) % 1440);
  const mean = asleep.reduce((a, b) => a + b, 0) / asleep.length;
  const spread = Math.sqrt(asleep.reduce((t, a) => t + (a - mean) ** 2, 0) / asleep.length);
  const rs = nights.map((s) => s.rested).filter((x): x is number => typeof x === 'number');
  const rested = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : undefined;
  let style: SleepStyle = 'mixed';
  if (kept >= Math.ceil(nights.length * 0.7) && spread <= 45) style = 'early';
  else if (hours >= 8) style = 'long';
  else if (hours < 7 && (rested ?? 0) >= 4) style = 'short';
  const quality = Math.min(1, (kept / 7 + Math.min(1, hours / 8) + (rested ? rested / 5 : 0.5)) / 3);
  return { style, nights: nights.length, kept, hours: Math.round(hours * 10) / 10, rested: rested && Math.round(rested * 10) / 10, quality: Math.round(quality * 100) / 100 };
}

export const STYLE_WORDS: Record<SleepStyle, { name: string; who: string }> = {
  early: { name: 'early, regular nights', who: 'steady defenders' },
  long: { name: 'long sleeps', who: 'high-potential prospects' },
  short: { name: 'short but rested nights', who: 'quick wingers' },
  mixed: { name: 'a mixed week', who: 'anyone' },
};

export interface TrialRules { size: number; hold: number; rarity: number; abroad: boolean; potential: number }

/**
 * Who comes to a trial day. Never a habit already tracked as a player or already at the academy. `taken` is every
 * name already at the club (players and youngsters, any status).
 */
export function trialists(pool: YouthDef[], week: SleepWeek, date: DayKey, season: number, taken: Set<string>, rules: TrialRules, kind: 'sunday' | 'midweek'): FbSquadRow[] {
  const r = rng(hashSeed('trials', date));
  const free = pool.filter((y) => !taken.has(y.name.trim().toLowerCase()));
  const fits = (y: YouthDef) => (week.style === 'early' ? y.axis === 'Shape' || y.axis === 'Rest' : week.style === 'long' ? y.potential >= 4 : week.style === 'short' ? y.axis === 'Pace' : true);
  const n = kind === 'midweek' ? 1 : rules.size;
  const out: FbSquadRow[] = [];
  const best = free.filter(fits), rest = free.filter((y) => !fits(y));
  for (let i = 0; i < n && best.length + rest.length; i++) {
    const from = best.length ? best : rest;
    const y = from.splice(Math.floor(r() * from.length), 1)[0];
    // Better sleep, rarer youngster: a chance at one more star, plus the tree's luck and Night school.
    const luck = week.quality * 0.5 + 0.15 * rules.rarity;
    const pot = Math.min(5, y.potential + (r() < luck ? 1 : 0) + rules.potential) as 3 | 4 | 5;
    const nation = rules.abroad ? NATION_POOL[Math.floor(r() * NATION_POOL.length)] : undefined;
    out.push({
      id: `trial:${i}:${date}`, kind: 'youth', name: y.name, axis: y.axis, potential: pot, what: y.what, exercise: y.kind === 'exercise', season,
      logged: [], status: 'trial', trialUntil: addDays(date, rules.hold - 1), style: week.style, ...(nation ? { nation } : {}),
    });
  }
  return out;
}

/** Youngsters tied to a habit and still growing: they fill the academy's places. */
export const academyFull = (squad: FbSquadRow[], slots: number) => squad.filter((y) => y.status === 'growing' && y.link).length >= slots;
