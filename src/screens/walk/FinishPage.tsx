import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { db } from '../../db/db';
import { useToday } from '../../db/hooks';
import { markRouteDone } from '../../db/walkRoutes';
import { back, go, useRoute } from '../../router';
import { routeById } from '../../walk/catalogue';
import { FinishView } from './FinishMoment';
import { NotOnShelf } from './RoutePage';

/** #/finish?id=: a route's finish moment. Opening it marks it seen, so it never plays twice. */
export function FinishPage() {
  const route = useRoute();
  const today = useToday();
  const def = routeById(route.params.get('id') ?? '');
  const run = useLiveQuery(async () => (def ? ((await db.routes.get(def.id)) ?? null) : null), [def?.id]);
  useEffect(() => {
    if (!def) return;
    void db.seen.put({ id: `walk-finish:${def.id}`, at: Date.now() });
    void markRouteDone(def.id, today);
  }, [def?.id]);
  if (run === undefined) return <div className="page" />;
  if (!def || !run) return <NotOnShelf onShelf={() => go('/routes', {}, { replace: true })} />;
  return <FinishView def={def} doneOn={run.doneOn ?? today} from={run.spans[0]?.from ?? today} onPage={() => go('/route', { id: def.id }, { replace: true })} onClose={() => back('/walk')} />;
}
