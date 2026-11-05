import { addDays, dayKey, daysBetween, type DayKey } from './dates';
import { fmtDayMonth, fmtDuration, fmtInt } from './format';
import { monthLabel } from './goTo';
import type { MonthInput } from './monthReport';
import { sleepMinutes } from './rings';
import type { Settings } from './types';
import { kmFromSteps, setStride } from './walk';

const OFFER_DAYS = 7;
const COMPARE_DAYS = 14;
const TOP = 5;

const plural = (n: number, word: string) => `${fmtInt(n)} ${word}${n === 1 ? '' : 's'}`;

/** The week after each anniversary of the first day. */
export function yearOffered(settings: Pick<Settings, 'createdAt'>, today: DayKey): boolean {
  if (!settings.createdAt) return false;
  const start = dayKey(new Date(settings.createdAt));
  const md = start.slice(5);
  for (const year of [Number(today.slice(0, 4)), Number(today.slice(0, 4)) - 1]) {
    const ann = `${year}-${md}`;
    if (ann <= start) continue;
    const gap = daysBetween(ann, today);
    if (gap >= 0 && gap < OFFER_DAYS) return true;
  }
  return false;
}

const isLogged = (d: { steps?: number; sleep?: unknown; weightKg?: number }) => d.steps !== undefined || !!d.sleep || d.weightKg !== undefined;

function firstMonth(i: MonthInput): string | undefined {
  const all = [...i.days.filter(isLogged).map((d) => d.date), ...i.entries.map((e) => e.date), ...i.sessions.map((s) => s.date)].filter((d) => d <= i.today).sort();
  return all[0]?.slice(0, 7);
}

export interface AlmanacMonth { month: string; label: string; lines: string[]; empty?: string; km?: number }

/** Every month from the first to this one. A month with nothing logged says so. */
export function almanac(i: MonthInput): AlmanacMonth[] {
  const first = firstMonth(i);
  if (!first) return [];
  setStride(i.settings.strideM);
  const out: AlmanacMonth[] = [];
  for (let m = first; m <= i.today.slice(0, 7); m = addDays(`${m}-28`, 7).slice(0, 7)) {
    const inM = <T extends { date: DayKey }>(xs: T[]) => xs.filter((x) => x.date.startsWith(m) && x.date <= i.today);
    const days = inM(i.days).filter(isLogged);
    const food = new Set(inM(i.entries).map((e) => e.date));
    const sessions = inM(i.sessions).filter((s) => s.status === 'done');
    const dates = new Set([...days.map((d) => d.date), ...food, ...sessions.map((s) => s.date)]);
    const label = monthLabel(m);
    if (!dates.size) {
      out.push({ month: m, label, lines: [], empty: 'Not logged.' });
      continue;
    }
    const stepDays = days.filter((d) => d.steps);
    const steps = stepDays.reduce((n, d) => n + d.steps!, 0);
    const best = stepDays.length ? stepDays.reduce((a, b) => (b.steps! > a.steps! ? b : a)) : undefined;
    const km = steps ? kmFromSteps(steps) : undefined;
    const lines = [plural(dates.size, 'day') + ' logged'];
    if (km) lines.push(`${fmtInt(km)} km walked`);
    if (sessions.length) lines.push(plural(sessions.length, 'session'));
    if (best) lines.push(`Best day: ${fmtInt(best.steps!)} steps on ${fmtDayMonth(best.date)}`);
    out.push({ month: m, label, lines, km });
  }
  return out;
}

export interface MostOfList { title: string; rows: { name: string; value: string }[] }

function tally(names: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const n of names) m.set(n, (m.get(n) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, TOP);
}

/** The year's most-ofs. A list with nothing in it isn't shown. */
export function mostOf(i: MonthInput): MostOfList[] {
  const lists: MostOfList[] = [
    { title: 'Most walked', rows: i.days.filter((d) => d.steps).sort((a, b) => b.steps! - a.steps!).slice(0, TOP).map((d) => ({ name: fmtDayMonth(d.date), value: `${fmtInt(d.steps!)} steps` })) },
    { title: 'Most eaten', rows: tally(i.entries.flatMap((e) => (e.name ? [e.name] : []))).map(([name, n]) => ({ name, value: n === 1 ? 'once' : `${fmtInt(n)} times` })) },
    { title: 'Most lifted', rows: tally(i.sets.filter((s) => !s.skipped && s.exercise).map((s) => s.exercise)).map(([name, n]) => ({ name, value: plural(n, 'set') })) },
    { title: 'Most played', rows: tally(i.songs.flatMap((s) => (s.track ? [`${s.track}, ${s.artist}`] : []))).map(([name, n]) => ({ name, value: plural(n, 'play') })) },
  ];
  return lists.filter((l) => l.rows.length);
}

export interface ThenNow { label: string; then: string; now: string }
const NOT = 'not logged';

/** The first two logged weeks against the latest two. Blank stays blank. */
export function dayOneAgainstToday(i: MonthInput): ThenNow[] {
  const first = firstMonth(i) && [...i.days.filter(isLogged).map((d) => d.date), ...i.entries.map((e) => e.date)].sort()[0];
  const start = first ?? i.today;
  const openEnd = addDays(start, COMPARE_DAYS - 1);
  const closeStart = addDays(i.today, -(COMPARE_DAYS - 1));
  const row = (label: string, fmt: (n: number) => string, values: { date: DayKey; v: number }[]): ThenNow => {
    const lastDate = values.map((x) => x.date).sort().pop();
    const latest = lastDate && lastDate < closeStart ? addDays(lastDate, -(COMPARE_DAYS - 1)) : closeStart;
    const afterOpening = addDays(openEnd, 1);
    const recentFrom = latest < afterOpening ? afterOpening : latest;
    const avg = (from: DayKey, to: DayKey) => {
      const xs = values.filter((x) => x.date >= from && x.date <= to).map((x) => x.v);
      return xs.length ? fmt(xs.reduce((a, b) => a + b, 0) / xs.length) : NOT;
    };
    return { label, then: avg(start, openEnd), now: avg(recentFrom, i.today) };
  };
  const byDayFood = new Map<DayKey, number>();
  for (const e of i.entries) byDayFood.set(e.date, (byDayFood.get(e.date) ?? 0) + e.protein);
  return [
    row('Steps a day', (n) => fmtInt(n), i.days.filter((d) => d.steps !== undefined).map((d) => ({ date: d.date, v: d.steps! }))),
    row('Sleep a night', (n) => fmtDuration(Math.round(n)), i.days.filter((d) => d.sleep).map((d) => ({ date: d.date, v: sleepMinutes(d.sleep!.asleep, d.sleep!.woke) }))),
    row('Protein a day', (n) => `${fmtInt(n)} g`, [...byDayFood].map(([date, v]) => ({ date, v }))),
    row('Weight', (n) => `${n.toFixed(1)} kg`, i.days.filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, v: d.weightKg! }))),
  ];
}

export interface ReplayFrame { title: string; lines: string[] }

/** The year, played back a month at a time. */
export function yearReplay(i: MonthInput): ReplayFrame[] {
  const months = almanac(i).filter((m) => m.lines.length);
  if (!months.length) return [];
  const km = months.reduce((n, m) => n + (m.km ?? 0), 0);
  return [
    ...months.map((m) => ({ title: m.label, lines: m.lines })),
    { title: 'That is the year so far.', lines: km ? [`${fmtInt(km)} km, one step at a time.`] : [] },
  ];
}
