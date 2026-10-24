import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAllDays, useToday } from '../../db/hooks';
import { setRouteStory, setRouteTarget } from '../../db/walkRoutes';
import { go, useRoute } from '../../router';
import { routeById } from '../../walk/catalogue';
import { usualAndBig } from '../../walk/page';
import { JoinView } from './JoinMoment';
import { NotOnShelf } from './RoutePage';

/** #/join?id=: the joining moment, after the join was saved. */
export function JoinPage() {
  const route = useRoute();
  const today = useToday();
  const days = useAllDays();
  const runs = useLiveQuery(() => db.routes.toArray(), []);
  const def = routeById(route.params.get('id') ?? '');
  if (!days || !runs) return <div className="page" />;
  if (!def) return <NotOnShelf onShelf={() => go('/routes', {}, { replace: true })} />;
  return (
    <JoinView
      def={def}
      runs={runs}
      usualKm={usualAndBig(days, today).usualKm}
      today={today}
      onStory={(s) => void setRouteStory(def.id, s)}
      onTarget={(d) => void setRouteTarget(def.id, d)}
      onStart={() => go('/route', { id: def.id }, { replace: true })}
      onPage={() => go('/route', { id: def.id }, { replace: true })}
    />
  );
}
