// The line bank picker (spec §8.10): back page, studio, press. No template repeats within 30 days.
import { addDays } from '../domain/dates';
import type { DayKey } from './types';
import { pick } from './rng';
import { BACK } from './data/backpage';
import { STUDIO } from './data/studio';
import { PRESS, type PressItem } from './data/press';

export const FACT_KEYS = ['club', 'opp', 'score', 'minute', 'pct', 'streak', 'axis', 'tier'] as const;
export type FactKey = (typeof FACT_KEYS)[number];
export type Facts = Partial<Record<FactKey, string | number>> & {
  /** win, loss, draw, screamer, heartbreak, rival, promotion, relegation, streak, cup, world, oldself, fouram, rotation */
  situation: string;
  /** The night's result group, used when the situation runs dry. */
  result?: 'win' | 'loss' | 'draw';
  date: DayKey;
};
export type LineKind = 'back' | 'studio' | 'press';
export interface Picked { id: string; text: string; parts: string[] }

export const NO_REPEAT_DAYS = 30;
const PH = /\{(\w+)\}/g;

export const placeholders = (t: string) => [...t.matchAll(PH)].map((m) => m[1]);
export const fill = (t: string, f: Partial<Record<FactKey, string | number>>) =>
  t.replace(PH, (all, k: string) => (f[k as FactKey] ?? all).toString());

interface Entry { id: string; group: string; parts: string[] }

const PRESS_BY_GROUP: Record<string, PressItem[]> = {};
PRESS.forEach((p) => (PRESS_BY_GROUP[p.when ?? 'general'] ??= []).push(p));

const flat = (bank: Record<string, string[][]>, kind: LineKind): Entry[] =>
  Object.entries(bank).flatMap(([g, list]) => list.map((parts, i) => ({ id: `${kind}:${g}:${i}`, group: g, parts })));

const BANK: Record<LineKind, Entry[]> = {
  back: flat(Object.fromEntries(Object.entries(BACK).map(([g, l]) => [g, l.map((t) => [t])])), 'back'),
  studio: flat(STUDIO, 'studio'),
  press: flat(Object.fromEntries(Object.entries(PRESS_BY_GROUP).map(([g, l]) => [g, l.map((p) => [p.q, ...p.a])])), 'press'),
};
const PRESS_BY_ID = new Map<string, PressItem>();
Object.entries(PRESS_BY_GROUP).forEach(([g, l]) => l.forEach((p, i) => PRESS_BY_ID.set(`press:${g}:${i}`, p)));

export const bankSize = (kind: LineKind) => BANK[kind].length;
export const allTemplates = (kind: LineKind) => BANK[kind].map((e) => e.parts).flat();

/** Pick a line for tonight. Skips anything used in the last 30 days and anything needing a missing fact. */
export function pickLine(kind: LineKind, facts: Facts, used: { id: string; date: DayKey }[], r: () => number): Picked {
  const since = addDays(facts.date, -NO_REPEAT_DAYS);
  const recent = new Set(used.filter((u) => u.date > since && u.date <= facts.date).map((u) => u.id));
  const fits = (e: Entry) => e.parts.every((p) => placeholders(p).every((k) => facts[k as FactKey] !== undefined));
  const all = BANK[kind];
  const tiers = [facts.situation, facts.result, kind === 'back' ? undefined : 'general'].filter(Boolean) as string[];
  let pool: Entry[] = [];
  for (const g of tiers) {
    pool = all.filter((e) => e.group === g && !recent.has(e.id) && fits(e));
    if (pool.length) break;
  }
  if (!pool.length) pool = all.filter((e) => !recent.has(e.id) && fits(e));
  if (!pool.length) {
    // Everything used lately: take the one used longest ago.
    const last = new Map(used.map((u) => [u.id, u.date]));
    pool = [...all.filter(fits)].sort((a, b) => (last.get(a.id) ?? '').localeCompare(last.get(b.id) ?? '')).slice(0, 1);
  }
  const e = pick(r, pool);
  const parts = e.parts.map((p) => fill(p, facts));
  return { id: e.id, text: parts.join('\n'), parts };
}

export const pressItem = (id: string) => PRESS_BY_ID.get(id);
/** The headline for the answer picked (0–2). */
export const pressHeadline = (id: string, answer: number, facts: Partial<Record<FactKey, string | number>>) => {
  const p = PRESS_BY_ID.get(id);
  return p ? fill(p.h[answer], facts) : undefined;
};
