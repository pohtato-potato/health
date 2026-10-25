import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAllDays, useToday } from '../../db/hooks';
import { joinRoute, pauseStory, pickRouteUp, setRouteDown, setRouteTarget } from '../../db/walkRoutes';
import { back, go, useRoute } from '../../router';
import { useToast } from '../../ui/Toasts';
import { CATALOGUE, kindOf, routeById } from '../../walk/catalogue';
import { usualAndBig } from '../../walk/page';
import { placesFree, routeKm, stepsByDay } from '../../walk/runs';
import { NotOnShelf, RoutePageView } from './RoutePage';
import { TAKEN } from './Shelf';

/** #/route?id=: a route's page, with the database behind it. A draft opens only in development, or once joined. */
export function RouteScreen() {
  const route = useRoute();
  const today = useToday();
  const days = useAllDays();
  const runs = useLiveQuery(() => db.routes.toArray(), []);
  const toast = useToast();
  const def = routeById(route.params.get('id') ?? '');
  if (!days || !runs) return <div className="page" />;
  const run = def && runs.find((r) => r.id === def.id);
  if (!def || (!def.ready && !import.meta.env.DEV && !run)) return <NotOnShelf onShelf={() => go('/routes', {}, { replace: true })} />;
  const steps = stepsByDay(days);
  const kmById = new Map(runs.map((r) => [r.id, CATALOGUE.find((d) => d.id === r.id) ? routeKm(r, CATALOGUE.find((d) => d.id === r.id)!, steps) : 0]));
  const km = run ? routeKm(run, def, steps) : 0;
  const noPlace = () => toast({ text: TAKEN[kindOf(def)] });
  return (
    <RoutePageView
      def={def}
      run={run}
      km={km}
      steps={steps}
      usualKm={usualAndBig(days, today).usualKm}
      today={today}
      free={placesFree(runs, kmById)}
      onBack={() => back('/walk')}
      onJoin={() => void joinRoute(def.id, today).then((r) => (r === 'joined' ? go('/join', { id: def.id }) : r === 'no place' ? noPlace() : undefined))}
      onDown={() => void setRouteDown(def.id, today)}
      onUp={() => void pickRouteUp(def.id, today).then((r) => (r === 'no place' ? noPlace() : undefined))}
      onPause={() => void pauseStory(def.id, km)}
      onResume={() => void pauseStory(def.id, undefined)}
      onTarget={(d) => void setRouteTarget(def.id, d)}
    />
  );
}
