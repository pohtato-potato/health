import type { AskInput } from './askData';
import type { DayKey } from './dates';
import { fmtDuration, fmtInt, fmtTime } from './format';
import { placeFor } from './places';
import { sleepMinutes } from './rings';
import { drinksAnswer } from './trackRules';

export interface DayCard { lines: [string, string][]; missing: string[] }

const clock = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

/** One day in one place. What was logged, and what wasn't, in words. Blank never reads as zero. */
export function dayCard(date: DayKey, i: AskInput): DayCard {
  const day = i.days.find((d) => d.date === date);
  const food = i.entries.filter((e) => e.date === date);
  const lines: [string, string][] = [];
  const missing: string[] = [];
  const add = (label: string, value: string | undefined, gap: string) => {
    if (value === undefined) missing.push(gap);
    else lines.push([label, value]);
  };
  add('Steps', day?.steps !== undefined ? fmtInt(day.steps) : undefined, 'steps');
  add('Sleep', day?.sleep ? `${clock(day.sleep.asleep)} → ${clock(day.sleep.woke)} · ${fmtDuration(sleepMinutes(day.sleep.asleep, day.sleep.woke))}` : undefined, 'sleep');
  add('Weight', day?.weightKg !== undefined ? `${day.weightKg.toFixed(1)} kg` : undefined, 'weight');
  add('Food', food.length ? `${fmtInt(food.reduce((n, e) => n + e.protein, 0))} g protein, ${fmtInt(food.reduce((n, e) => n + e.kcal, 0))} kcal` : undefined, 'food');
  const drinks = drinksAnswer(date, day, i.entries);
  add('Drinks', drinks === 'not logged' ? undefined : drinks === 'none' ? 'None' : String(drinks), 'drinks');
  const done = i.sessions.filter((s) => s.date === date && s.status === 'done').length;
  if (done) lines.push(['Training', `${done} session${done === 1 ? '' : 's'}`]);
  const moves = (day?.placeChanges ?? []).map((c) => `${(i.settings.places?.find((p) => p.id === c.place)?.name ?? 'elsewhere').toLowerCase()} from ${fmtTime(c.at)}`);
  lines.push(['Place', [placeFor(day, i.settings).name, ...moves].join(', then ')]);
  return { lines, missing };
}

export interface DiaryHit { date: DayKey; text: string }

/** Every day that mentions it, newest first: notes, food and exercises. */
export function searchDiary(query: string, i: AskInput): DiaryHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const has = (s: string | undefined) => !!s && s.toLowerCase().includes(q);
  const seen = new Map<DayKey, string>();
  const put = (date: DayKey, text: string) => { if (!seen.has(date)) seen.set(date, text); };
  for (const d of i.days) if (has(d.note)) put(d.date, d.note!);
  for (const e of i.entries) if (has(e.name)) put(e.date, e.name!);
  for (const s of i.sets) if (has(s.exercise)) put(s.date, s.exercise);
  return [...seen].sort((a, b) => b[0].localeCompare(a[0])).map(([date, text]) => ({ date, text }));
}
