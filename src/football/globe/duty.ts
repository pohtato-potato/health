// International breaks and duty (spec §9.4). Pure.
// - Two breaks a season, three days each, with no league or cup matches: the season pauses before day 14 and day 30.
// - Called up: every squad player whose name carries a nation, plus the three best of the rest (six at most).
// - Logged on 2 of the 3 days, a player comes back with a trait (one it can play, for its unit or any) or, when it
//   already holds three or none fits, +2 to its lowest attribute. Fewer days: a quiet, rested trip. Never a penalty.
import type { DayKey } from '../../domain/dates';
import { BIG_DAY, LONG_WALK_KM } from '../players/catalogue';
import type { Attribute, FbPlayer } from '../players/types';
import { pickTrait, traitsOf, MAX_TRAITS } from '../rotation/traits';
import type { Health } from '../store/gather';
import { nationInName } from '../content/nations';
import { hashSeed } from '../rng';
import type { BreakPlayed, DutyRow } from './types';

export const BREAK_DAYS = 3;
/** The season days each break comes before. Day 14 and day 30 are league nights; the cups never fall in a break. */
export const BREAK_BEFORE: Record<1 | 2, number> = { 1: 14, 2: 30 };
export const DUTY_NEEDS = 2;
export const DUTY_ATTR = 2;
export const CALL_UPS = 6;
export const CALL_UP_BEST = 3;

/** The break the next day to play belongs to, if any: `day` is the season day waiting to play. */
export function breakDue(phase: string, season: number, day: number, breaks: BreakPlayed[]): { n: 1 | 2; done: number } | undefined {
  if (phase !== 'season') return undefined;
  for (const n of [1, 2] as const) {
    if (BREAK_BEFORE[n] !== day) continue;
    const b = breaks.find((x) => x.season === season && x.n === n);
    if ((b?.days.length ?? 0) < BREAK_DAYS) return { n, done: b?.days.length ?? 0 };
  }
  return undefined;
}

/** Whether a player's habit was logged on a day (the same data its rating reads). */
export function loggedOn(h: Health, p: Pick<FbPlayer, 'kind' | 'ref' | 'refs'>, date: DayKey): boolean {
  const d = h.days.get(date);
  if (d?.status === 'sick') return false;
  switch (p.kind) {
    case 'exercise': { const refs = p.refs ?? (p.ref ? [p.ref] : []); return h.sets.some((s) => s.date === date && refs.includes(s.exerciseId)); }
    case 'steps': case 'commuter': return d?.steps != null && !d.stepsEstimated;
    case 'big-days': return (d?.steps ?? 0) >= BIG_DAY && !d?.stepsEstimated;
    case 'long-walk': return h.walks.some((w) => w.date === date && w.km >= LONG_WALK_KM);
    case 'route-walker': return h.routes.some((r) => r.spans.some((s) => s.from <= date && (!s.to || s.to >= date)));
    case 'calories': case 'protein': return (h.kcal.get(date)?.n ?? 0) > 0;
    case 'meal': return Boolean(p.ref && h.meals.get(date)?.[p.ref as 'breakfast']);
    case 'habit': { const item = (h.settings.checklist ?? []).find((i) => i.id === p.ref); return Boolean(item?.slots.some((_, k) => d?.ticks?.[`${item.id}:${k}`] != null)); }
    case 'weigh-in': case 'trend': return d?.weightKg != null;
    case 'waist': return h.measures.some((m) => m.date === date && m.waist != null);
    case 'hours': case 'bedtime': return Boolean(d?.sleep);
    case 'rested': return d?.sleep?.rested != null;
  }
  return false;
}

/** Who is called up (spec §9.4): every squad player whose name carries a nation, then the best of the rest. */
export function callUps(players: Iterable<FbPlayer>, nations: Record<string, string>): { player: FbPlayer; nation: string }[] {
  const squad = [...players].filter((p) => p.status === 'squad' && nations[p.id]);
  const named = squad.filter((p) => nationInName(p.name));
  const rest = squad.filter((p) => !named.includes(p)).sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name)).slice(0, CALL_UP_BEST);
  return [...named, ...rest].slice(0, CALL_UPS).map((p) => ({ player: p, nation: nations[p.id] }));
}

/** The reward for a player back from duty: a trait it can play, else +2 to its lowest attribute; quiet under 2 days. */
export function dutyReward(p: FbPlayer, row: DutyRow, attrs: Attribute[] | null, on: DayKey): NonNullable<FbPlayer['duty']>[number] & { kind: 'trait' | 'attr' | 'quiet' } {
  const base = { on, nation: row.nation };
  if (row.days.length < DUTY_NEEDS) return { ...base, kind: 'quiet' };
  const trait = traitsOf(p).length < MAX_TRAITS ? pickTrait(p, `${on}:duty`, 'duty') : undefined;
  if (trait) return { ...base, kind: 'trait', trait };
  const low = [...(attrs ?? [])].sort((a, b) => a.value - b.value || (hashSeed(p.id, a.id) % 7) - (hashSeed(p.id, b.id) % 7))[0];
  if (!low) return { ...base, kind: 'quiet' };
  return { ...base, kind: 'attr', attr: low.id, d: DUTY_ATTR };
}

/** What duty added to each attribute (added to the rating worked out from the logs, capped at 100). */
export function dutyBonus(p: Pick<FbPlayer, 'duty'>): Record<string, number> | undefined {
  const out: Record<string, number> = {};
  for (const d of p.duty ?? []) if (d.attr && d.d) out[d.attr] = (out[d.attr] ?? 0) + d.d;
  return Object.keys(out).length ? out : undefined;
}
