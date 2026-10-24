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
  // Only a route that has reached its length gets its finish (and its gold stamp); any other goes to its page.
  useEffect(() => {
    if (!def) return;
    void markRouteDone(def.id, today).then((done) => {
      if (done) void db.seen.put({ id: `walk-finish:${def.id}`, at: Date.now() });
      else go('/route', { id: def.id }, { replace: true });
    });
  }, [def?.id]);
  if (run === undefined) return <div className="page" />;
  if (!def || !run) return <NotOnShelf onShelf={() => go('/routes', {}, { replace: true })} />;
  if (!run.doneOn) return <div className="page" />;
  return <FinishView def={def} doneOn={run.doneOn} from={run.spans[0]?.from ?? today} onPage={() => go('/route', { id: def.id }, { replace: true })} onClose={() => back('/walk')} />;
}
