import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { addDays, daysBetween } from '../domain/dates';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { seasonalThemeOn } from '../domain/themes';
import { prefOn, type RouteRun } from '../domain/types';
import { kmFromSteps } from '../domain/walk';
import { changePlace } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useDay, useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import type { Festive } from '../walk/art/festive';
import { kindOf, routeById } from '../walk/catalogue';
import { STOPS, STRETCHES } from '../walk/content';
import { arrivedToday, nearestPlace, statusLines, stoneFor, stopLine, timeAtPace, tomorrowLine, usualAndBig, whereLine, whereNow } from '../walk/page';
import { stopToday, stretchAt, stretchDay, stretchEndToShow } from '../walk/road';
import type { Stretch } from '../walk/content/types';
import { Sheet } from '../ui/Sheet';
import { StretchEndView } from './walk/StretchEndView';
import { peopleMet } from '../walk/people';
import { placesFree, routeKm, runState, stepsByDay } from '../walk/runs';
import { journeyStart } from './Journey';
import { PlaceStatusRow } from './walk/PlaceStatusRow';
import { StatusLines } from './walk/StatusLines';
import { Action, Door, Doors, Hero, Panel, Sect } from '../ui/kit/Kit';
import { WalkTitle } from './walk/WalkTitle';
import { WalkTop } from './walk/WalkTop';
import { WalkStrip } from './walk/WalkStrip';
import { stripFor } from '../walk/strip';
import { NewsBannerView } from './walk/NewsBanner';
import { skyLine } from '../walk/sky';
import { useRoadNews } from './walk/useRoadNews';
import { HabitLine } from './football/HabitLine';

/** "1 challenge place free", or both kinds, in words. */
function freeLine(free: { challenge: number; expedition: number }): string {
  const part = (n: number, kind: string) => `${n} ${kind} ${n === 1 ? 'place' : 'places'} free`;
  if (!free.challenge && !free.expedition) return 'Every place is taken';
  return [free.challenge && part(free.challenge, 'challenge'), free.expedition && part(free.expedition, 'expedition')].filter(Boolean).join(' · ');
}

/** The Walk tab: the scene and the stone, where you are, a few lines about today, tomorrow, your routes, the doors. */
export function WalkTab() {
  const today = useToday();
  const days = useAllDays();
  const settings = useSettings();
  const day = useDay(today);
  const runs = useLiveQuery(() => db.routes.toArray(), []);
  const seenStretches = useLiveQuery(async () => new Set((await db.seen.where('id').startsWith('walk-stretch:').toArray()).map((s) => s.id)), []);
  const [showing, setShowing] = useState<{ done: Stretch; next?: Stretch }>();
  const news = useRoadNews();
  const end = days && seenStretches ? stretchEndToShow(stepsByDay(days), STRETCHES, seenStretches) : undefined;
  useEffect(() => {
    if (!end?.show) return;
    setShowing({ done: end.show, next: end.next });
    void db.seen.bulkPut(end.markSeen.map((id) => ({ id, at: Date.now() })));
    // Only a newly ended stretch matters here.
  }, [end?.show?.id]);
  if (!days || !settings) return <div className="page" />;

  const steps = stepsByDay(days);
  const km = kmFromSteps([...steps.values()].reduce((a, b) => a + b, 0));
  const todayKm = kmFromSteps(steps.get(today) ?? 0);
  const where = whereNow(km);
  const near = nearestPlace(km);
  const dayN = daysBetween(journeyStart(settings, days), today) + 1;
  const { usualKm, bigKm } = usualAndBig(days, today);
  const festive = prefOn(settings.prefs, 'seasonal') ? (seasonalThemeOn(today, settings.birthday) as Festive | undefined) : undefined;
  // Someone met on the road shows for the day they were met and the day after, as steps are often logged late.
  const met = peopleMet(days.filter((d) => d.date <= today))
    .filter((m) => m.date >= addDays(today, -1))
    .at(-1);
  const stop = stopToday(steps, today, STOPS);
  const lines = statusLines({ arrival: arrivedToday(steps, today), stop: stop && stopLine(stop), person: met?.who, status: day?.status, sky: skyLine(today), near });
  const stretch = stretchAt(km, STRETCHES);
  const tomorrow = tomorrowLine(km, usualKm, bigKm);

  const walking = (runs ?? [])
    .map((run: RouteRun) => {
      const def = routeById(run.id);
      if (!def) return undefined;
      const routeKmNow = routeKm(run, def, steps);
      const state = runState(run, def, routeKmNow);
      if (state === 'finished') return undefined;
      const page = [...def.pages].reverse().find((p) => p.km <= routeKmNow);
      const target = run.target && run.target >= today ? `aiming for ${fmtDayMonth(run.target)}` : undefined;
      return { run, def, km: routeKmNow, state, line: page?.line, target };
    })
    .filter((x) => x !== undefined);
  const challenges = walking.filter((w) => kindOf(w.def) === 'challenge');
  const expeditions = walking.filter((w) => kindOf(w.def) === 'expedition');

  // Look pass (board four, "Walk, in layered dusk"): the scene leads and runs larger, the stretch's name under it,
  // kilometres from Delhi as the big number, tomorrow as one panel, routes as doors, one glowing action. The scene
  // is drawn in layered dusk (fork L6) on the Walk light.
  const routes = [...challenges, ...expeditions];
  return (
    <div className="page walk2 k-light walk">
      <div className="walk2-col k-page">
        <WalkTop km={km} todayKm={todayKm} stone={stoneFor(km)} festive={festive} />
        {stretch ? (
          <WalkTitle where={stretch.name} sub={`${stretch.plain} · day ${stretchDay(steps, today, stretch)} of ${timeAtPace(stretch.toKm - stretch.fromKm, usualKm)}`} onWhere={() => go('/stretch', { id: stretch.id })} />
        ) : (
          <WalkTitle where={whereLine(where)} sub={`Day ${fmtInt(Math.max(1, dayN))} on the road`} />
        )}
        <div className="k-row end">
          <Hero value={fmtInt(Math.round(km))} ink="var(--steps)" size="md" label="km from Delhi" />
          <span className="k-col k-r"><b className="k-num">{steps.has(today) ? todayKm.toFixed(1) : '0'}</b><span className="k-q">km today</span>{steps.has(today) && <span className="k-q">{fmtInt(steps.get(today) ?? 0)} steps</span>}</span>
        </div>
        <WalkStrip strip={stripFor(km, todayKm, stretch, STOPS)} onOpen={() => go('/map')} />
        <PlaceStatusRow settings={settings} today={today} day={day} onPlace={(id) => void changePlace(today, id)} />
        <Panel ink="#8fdcb6">
          <StatusLines
            today={steps.has(today) ? undefined : 'Today: no steps logged yet'}
            lines={lines} onOpen={(path) => go(path.split('?')[0], Object.fromEntries(new URLSearchParams(path.split('?')[1] ?? '')))} tomorrow={days.some((d) => d.steps !== undefined) ? tomorrow : "Log today's steps and you'll set off from Delhi."} />
        </Panel>
        <HabitLine axis="Pace" />

        {news?.banner && <NewsBannerView banner={news.banner} kmById={news.kmById} onOpen={news.open} onDismiss={news.dismiss} />}

        {routes.length > 0 && (
          <>
            <Sect>Your routes</Sect>
            <Doors two label="Your routes">
              {routes.map((r) => (
                <Door key={r.run.id} icon={kindOf(r.def) === 'challenge' ? 'route' : 'map'} name={r.state === 'set down' ? `${r.def.name} · set down` : r.def.name} value={`${fmtInt(Math.round(r.km))} km`} family="walk" onClick={() => go('/route', { id: r.run.id })} />
              ))}
            </Doors>
          </>
        )}

        <Action wide onClick={() => go('/routes')}>Choose a walk</Action>
        <span className="k-q" style={{ textAlign: 'center', marginTop: -4 }}>{freeLine(placesFree(runs ?? [], new Map(walking.map((w) => [w.run.id, w.km]))))}</span>

        <Doors two label="More of the walk">
          <Door icon="map" family="walk" name="Map" value={`${fmtInt(Math.round(km))} km`} onClick={() => go('/map')} />
          <Door icon="book" family="walk" name="Wrapped" value="The road" onClick={() => go('/road')} />
        </Doors>
      </div>
      {showing && (
        <Sheet onClose={() => setShowing(undefined)}>
          <StretchEndView
            done={showing.done}
            next={showing.next}
            onRead={() => {
              setShowing(undefined);
              if (showing.next) go('/stretch', { id: showing.next.id });
            }}
            onClose={() => setShowing(undefined)}
          />
        </Sheet>
      )}
    </div>
  );
}
