import { useLiveQuery } from 'dexie-react-hooks';
import { addDays } from '../../domain/dates';
import { db } from '../../db/db';
import { useAllDays, useToday } from '../../db/hooks';
import { go } from '../../router';
import { routeById } from '../../walk/catalogue';
import { gatherNews, laterItem, roadNews, type NewsBannerData, type NewsItem } from '../../walk/news';
import { routeKm, stepsByDay } from '../../walk/runs';
import { readKeys } from './NewsBanner';

/** Today's news from the road, gathered into one banner, with what dismissing and opening it do. */
export function useRoadNews(): { banner?: NewsBannerData; kmById: Map<string, number>; dismiss: () => void; open: (path: string) => void } | undefined {
  const today = useToday();
  const days = useAllDays();
  const runs = useLiveQuery(() => db.routes.toArray(), []);
  const seen = useLiveQuery(async () => (await db.seen.where('id').startsWithAnyOf('walk-read:', 'walk-later:').toArray()).map((s) => s.id), []);
  if (!days || !runs || !seen) return undefined;
  const read = new Set(seen.filter((id) => id.startsWith('walk-read:')).map((id) => id.slice(10)));
  const steps = stepsByDay(days);
  const recent = [`walk-later:${today}:`, `walk-later:${addDays(today, -1)}:`];
  const later = seen
    .filter((id) => recent.some((p) => id.startsWith(p)) && !read.has(id))
    .map(laterItem)
    .filter((x): x is NewsItem => !!x);
  const banner = gatherNews([...later, ...roadNews(runs, steps, today, read)]);
  const kmById = new Map(runs.map((r) => [r.id, routeById(r.id) ? routeKm(r, routeById(r.id)!, steps) : 0]));
  const mark = (ids: string[]) => void db.seen.bulkPut(ids.map((id) => ({ id, at: Date.now() })));
  return {
    banner,
    kmById,
    dismiss: () => banner && mark(readKeys(banner)),
    open: (path) => {
      const item = banner?.items.find((i) => i.open === path);
      if (item) mark([`walk-read:${item.key}`]);
      const [p, q = ''] = path.split('?');
      go(p, Object.fromEntries(new URLSearchParams(q)));
    },
  };
}
