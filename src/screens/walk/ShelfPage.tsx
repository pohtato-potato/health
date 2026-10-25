import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { useAllDays, useToday } from '../../db/hooks';
import { joinRoute } from '../../db/walkRoutes';
import { back, go } from '../../router';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toasts';
import { CATALOGUE, kindOf, type RouteDef } from '../../walk/catalogue';
import { auroraFor, usualAndBig } from '../../walk/page';
import { regionAt } from '../../domain/regions';
import { kmFromSteps } from '../../domain/walk';
import { WalkFrame } from './WalkFrame';
import { placesFree, routeKm, stepsByDay } from '../../walk/runs';
import { chooseForMe } from '../../walk/shelf';
import { RouteSheetView, ShelfView, TAKEN } from './Shelf';

/** #/routes: the shelf, with the database behind it. */
export function ShelfPage() {
  const today = useToday();
  const days = useAllDays();
  const runs = useLiveQuery(() => db.routes.toArray(), []);
  const pins = useLiveQuery(async () => new Set((await db.seen.where('id').startsWith('walk-pin:').toArray()).map((s) => s.id.slice(9))), []);
  const toast = useToast();
  const [open, setOpen] = useState<string>();
  if (!days || !runs || !pins) return <div className="page" />;
  const steps = stepsByDay(days);
  const kmById = new Map(runs.map((r) => [r.id, CATALOGUE.find((d) => d.id === r.id) ? routeKm(r, CATALOGUE.find((d) => d.id === r.id)!, steps) : 0]));
  const free = placesFree(runs, kmById);
  const { usualKm } = usualAndBig(days, today);
  const def = open ? CATALOGUE.find((d) => d.id === open) : undefined;

  const join = async (d: RouteDef) => {
    const r = await joinRoute(d.id, today);
    setOpen(undefined);
    if (r === 'joined') go('/join', { id: d.id });
    else if (r === 'no place') toast({ text: TAKEN[kindOf(d)] });
    else go('/route', { id: d.id });
  };
  const pin = (id: string) => void (pins.has(id) ? db.seen.delete(`walk-pin:${id}`) : db.seen.put({ id: `walk-pin:${id}`, at: Date.now() }));
  const choose = () => {
    const c = chooseForMe(CATALOGUE, runs, pins, kmById);
    if (c) setOpen(c.id);
    else toast({ text: 'Nothing to suggest: every place is taken, or you’ve walked them all.' });
  };

  return (
    <WalkFrame tint={auroraFor(regionAt(kmFromSteps([...steps.values()].reduce((a, b) => a + b, 0))))}>
      <button type="button" className="backlink" onClick={() => back('/walk')}>
        <Icon name="left" size={20} stroke={1.8} />
        Walk
      </button>
      <header className="walk-head">
        <h1 className="walk-title">Routes</h1>
        <p className="walk-sub">
          Walk them alongside India, with the same steps. Two challenges and two expeditions at a time; {free.challenge} challenge {free.challenge === 1 ? 'place' : 'places'} and {free.expedition} expedition {free.expedition === 1 ? 'place' : 'places'} free.
        </p>
      </header>
      <ShelfView defs={CATALOGUE} runs={runs} kmById={kmById} pinned={pins} usualKm={usualKm} onOpen={setOpen} onChoose={choose} drafts={import.meta.env.DEV} />
      {def && (
        <Sheet title={def.name} onClose={() => setOpen(undefined)}>
          <RouteSheetView def={def} runs={runs} km={kmById.get(def.id) ?? 0} free={free} pinned={pins.has(def.id)} usualKm={usualKm} onJoin={() => void join(def)} onPage={() => (setOpen(undefined), go('/route', { id: def.id }))} onPin={() => pin(def.id)} />
        </Sheet>
      )}
    </WalkFrame>
  );
}
