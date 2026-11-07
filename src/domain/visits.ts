import type { UsageEvent } from './types';

type RouteLike = { path: string; params: URLSearchParams };

/** Ids in a path (a session, a club) say nothing about what's read, so they're folded into ":id". */
const ID = /^(?=.*\d)[0-9a-z-]{8,}$/i;
export const screenName = (path: string) =>
  path
    .split('/')
    .map((p) => (ID.test(p) ? ':id' : p))
    .join('/');

/**
 * What a route change counts as in the usage log: a screen opened, a sheet opened, or nothing
 * (a sheet closing, a filter changing). Kept on the phone; the audit pack carries it.
 */
export function visitsFor(prev: RouteLike | undefined, next: RouteLike): { kind: 'screen' | 'sheet'; detail: string }[] {
  const out: { kind: 'screen' | 'sheet'; detail: string }[] = [];
  if (!prev || screenName(prev.path) !== screenName(next.path)) out.push({ kind: 'screen', detail: screenName(next.path) });
  const sheet = next.params.get('sheet');
  if (sheet && sheet !== prev?.params.get('sheet')) out.push({ kind: 'sheet', detail: sheet });
  return out;
}

/** Visits per screen and sheet, most visited first: what the audit reads to see what gets used. */
export function screenSummary(usage: Pick<UsageEvent, 'at' | 'kind' | 'detail'>[]): { kind: 'screen' | 'sheet'; name: string; visits: number; last: number }[] {
  const by = new Map<string, { kind: 'screen' | 'sheet'; name: string; visits: number; last: number }>();
  for (const u of usage) {
    if ((u.kind !== 'screen' && u.kind !== 'sheet') || !u.detail) continue;
    const k = `${u.kind}:${u.detail}`;
    const cur = by.get(k) ?? { kind: u.kind as 'screen' | 'sheet', name: u.detail, visits: 0, last: 0 };
    cur.visits++;
    cur.last = Math.max(cur.last, u.at);
    by.set(k, cur);
  }
  return [...by.values()].sort((a, b) => b.visits - a.visits || b.last - a.last);
}
