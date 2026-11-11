// Youngsters, growing while you sleep (spec §9.2, steps 2–4). Replaces the old check: the "axis value 13 or more"
// fallback counted days nothing was done. Now a youngster counts only through the real habit it is linked to.
import { addDays, type DayKey } from '../../domain/dates';
import type { Health } from '../store/gather';
import type { FbSquadRow } from '../store/tables';
import { bedtimeKept } from './attributes';
import { keptPledgeNight } from '../../domain/pledge';

export const PROMOTE_SESSIONS = 12;
export const PROMOTE_GROWTH = 12;
/** Growth per kept night: more with higher potential. */
export const GROWTH_BY_STARS: Record<3 | 4 | 5, number> = { 3: 1, 4: 1.25, 5: 1.5 };

/** The habit a youngster is tied to: a checklist habit, or an exercise in the coach's plan. */
export interface YouthLink { kind: 'habit' | 'exercise'; id: string }

/** Whether the linked habit was logged that day. A youngster with no link is never counted. */
export function linkedLogged(h: Health, link: YouthLink | undefined, date: DayKey): boolean {
  if (!link) return false;
  if (link.kind === 'exercise') return h.sets.some((s) => s.date === date && s.exerciseId === link.id);
  const item = (h.settings.checklist ?? []).find((i) => i.id === link.id);
  const day = h.days.get(date);
  return Boolean(item && item.slots.some((_, k) => day?.ticks?.[`${item.id}:${k}`] != null));
}

/**
 * One day for one youngster. A logged day of its habit is a session. The night's sleep (logged on this day) adds growth
 * when the bedtime was kept, doubled after a rest day. Growth pauses but never goes back. A sick day moves nothing.
 */
/** Layer 4: a loan in the unit (×1.5), the sleep coach's extra growth, and the sessions promotion needs. */
export interface YouthOpts { mult?: number; extra?: number; sessions?: number }
export function youthDay(h: Health, y: FbSquadRow, date: DayKey, bedtime: number | undefined, o: YouthOpts = {}): FbSquadRow {
  if (y.status !== 'growing' || !y.link || h.days.get(date)?.status === 'sick') return y;
  const next = { ...y, sessions: [...(y.sessions ?? [])], grown: [...(y.grown ?? [])], growth: y.growth ?? 0 };
  if (!next.sessions.includes(date) && linkedLogged(h, y.link, date)) next.sessions.push(date);
  const sleep = h.days.get(date)?.sleep;
  // A kept lights-out pledge (matchday §5) grows the academy too; a pledge never takes a kept bedtime away.
  const kept = sleep && ((bedtime !== undefined && bedtimeKept(sleep.asleep, bedtime)) || keptPledgeNight(h.days, date));
  if (sleep && kept && !next.grown.includes(date)) {
    const restDay = !h.sessions.some((s) => s.date === addDays(date, -1));
    const n = Math.round((GROWTH_BY_STARS[y.potential] + (o.extra ?? 0)) * (restDay ? 2 : 1) * (o.mult ?? 1) * 100) / 100;
    next.growth = Math.round((next.growth + n) * 100) / 100;
    next.grown.push(date);
    next.lastGrow = { on: date, n };
  }
  next.logged = next.sessions;
  if (next.sessions.length >= (o.sessions ?? PROMOTE_SESSIONS) && next.growth >= PROMOTE_GROWTH) next.status = 'promoted';
  return next;
}

/** The overall a promoted youngster's player starts from, by potential (it then rates from its own logs). */
export const PROMOTED_START: Record<3 | 4 | 5, number> = { 3: 55, 4: 60, 5: 65 };

/** Habits a youngster can be tied to: not already tied to another youngster, and not tracked before it arrived. */
export function linkOptions(h: Health, y: FbSquadRow, others: FbSquadRow[], since: DayKey): { link: YouthLink; name: string }[] {
  const taken = new Set(others.filter((o) => o.id !== y.id && o.link).map((o) => `${o.link!.kind}:${o.link!.id}`));
  const out: { link: YouthLink; name: string }[] = [];
  for (const item of h.settings.checklist ?? []) {
    if (!item.active || item.med || taken.has(`habit:${item.id}`)) continue;
    const before = [...h.days.values()].some((d) => d.date < since && item.slots.some((_, k) => d.ticks?.[`${item.id}:${k}`] != null));
    if (!before) out.push({ link: { kind: 'habit', id: item.id }, name: item.name });
  }
  for (const ex of (h.settings.plan?.sessions ?? []).flatMap((s) => s.exercises)) {
    if (taken.has(`exercise:${ex.id}`) || out.some((o) => o.link.id === ex.id)) continue;
    if (!h.sets.some((s) => s.exerciseId === ex.id && s.date < since)) out.push({ link: { kind: 'exercise', id: ex.id }, name: ex.name });
  }
  return out;
}
