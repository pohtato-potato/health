import { addDays, type DayKey } from '../domain/dates';
import type { RouteRun } from '../domain/types';
import { kindOf, routeById } from './catalogue';
import { routeKm, runState } from './runs';
import { signatureOf } from './signature';
import { chaptersShown } from './story';

/** One thing that happened on a road. */
export interface RoadNews {
  /** Its seen id, `walk-news:<route>:<km>`. */
  key: string;
  routeId: string;
  kind: 'challenge' | 'expedition';
  what: string;
  km: number;
  /** Where "Read" goes, as a hash path. */
  open: string;
}

const KIND_WORD = { challenge: 'Challenge', expedition: 'Expedition' };

/**
 * What happened on each road you're walking, on days saved today or yesterday: the route pages you came to, the
 * named marks of its collection, and (walking with the story) the book's chapters. Seen ones are left out.
 */
export function roadNews(runs: RouteRun[], stepsByDay: Map<DayKey, number>, today: DayKey, seen: Set<string>): RoadNews[] {
  const before = new Map([...stepsByDay].filter(([d]) => d < addDays(today, -1)));
  const out: RoadNews[] = [];
  for (const run of runs) {
    const def = routeById(run.id);
    if (!def) continue;
    const now = routeKm(run, def, stepsByDay);
    if (runState(run, def, now) !== 'walking') continue;
    const then = routeKm(run, def, before);
    const crossed = (km: number) => km > then && km <= now;
    const kind = kindOf(def);
    const open = `/route?id=${def.id}`;
    const events = [
      ...def.pages.filter((p) => crossed(p.km)).map((p) => ({ km: p.km, what: p.line })),
      ...signatureOf(def)
        .marks.filter((m) => m.name && crossed(m.km))
        .map((m) => ({ km: m.km, what: `${signatureOf(def).title}: ${m.name}` })),
      ...chaptersShown(run, def, now)
        .filter((c) => crossed(c.km))
        .map((c) => ({ km: c.km, what: c.text })),
    ].sort((a, b) => a.km - b.km);
    for (const e of events) {
      const key = `walk-news:${def.id}:${e.km}`;
      if (!seen.has(key) && !out.some((n) => n.key === key)) out.push({ key, routeId: def.id, kind, what: e.what, km: e.km, open });
    }
  }
  return out;
}

/** A banner item: road news, or a moment that waited because the day had had its own. */
export type NewsItem = Pick<RoadNews, 'key' | 'what' | 'open'> & { routeId?: string; kind?: RoadNews['kind'] | 'walk' };

export interface NewsBannerData {
  title: string;
  text: string;
  action: string;
  items: NewsItem[];
}

const nameOf = (n: NewsItem) => (n.routeId ? (routeById(n.routeId)?.name ?? n.routeId) : 'The walk');

/** Everything that happened, gathered into one banner: one thing said plainly, several as "2 things happened on the road". */
export function gatherNews(items: NewsItem[]): NewsBannerData | undefined {
  if (!items.length) return undefined;
  if (items.length === 1) {
    const [n] = items;
    return { title: n.kind && n.kind !== 'walk' ? `${KIND_WORD[n.kind]} · ${nameOf(n)}` : 'The walk', text: n.what, action: 'Read what happened', items };
  }
  const names = [...new Set(items.map(nameOf))];
  return { title: `${items.length} things happened on the road`, text: names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join(' and '), action: items.length === 2 ? 'See both' : 'See all', items };
}

/** A moment that waited (`walk-later:<day>:<path>`), as a banner item in words. */
export function laterItem(id: string): NewsItem | undefined {
  const m = id.match(/^walk-later:\d{4}-\d{2}-\d{2}:(.+)$/);
  if (!m) return undefined;
  const path = m[1];
  const q = new URLSearchParams(path.split('?')[1] ?? '');
  if (path.startsWith('/finish')) {
    const def = routeById(q.get('id') ?? '');
    return def ? { key: id, what: `You finished ${def.name}`, open: path, routeId: def.id, kind: kindOf(def) } : undefined;
  }
  if (q.get('c') && q.get('end')) return { key: id, what: `You reached ${q.get('c')}: chapter ${q.get('ch')} is done`, open: path, kind: 'walk' };
  if (q.get('c')) return { key: id, what: `You reached ${q.get('c')}`, open: path, kind: 'walk' };
  if (q.get('s')) return { key: id, what: `You walked into ${q.get('s')}`, open: path, kind: 'walk' };
  return undefined;
}
