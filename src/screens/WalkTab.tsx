import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type CSSProperties } from 'react';
import { addDays, daysBetween } from '../domain/dates';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { seasonalThemeOn } from '../domain/themes';
import { prefOn, type RouteRun } from '../domain/types';
import { kmFromSteps } from '../domain/walk';
import { changePlace } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useDay, useSettings, useToday } from '../db/hooks';
import { regionAt } from '../domain/regions';
import { go } from '../router';
import { Aurora } from '../ui/live/Aurora';
import type { Festive } from '../walk/art/festive';
import { kindOf, routeById } from '../walk/catalogue';
import { STOPS, STRETCHES } from '../walk/content';
import { arrivedToday, auroraFor, nearestPlace, statusLines, stoneFor, stopLine, timeAtPace, tomorrowLine, usualAndBig, whereLine, whereNow } from '../walk/page';
import { stopToday, stretchAt, stretchDay, stretchEndToShow } from '../walk/road';
import type { Stretch } from '../walk/content/types';
import { Sheet } from '../ui/Sheet';
import { StretchEndView } from './walk/StretchEndView';
import { peopleMet } from '../walk/people';
import { placesFree, routeKm, runState, stepsByDay } from '../walk/runs';
import { journeyStart } from './Journey';
import { PlaceStatusRow } from './walk/PlaceStatusRow';
import { ChallengeCard, ExpeditionLine } from './walk/RouteCards';
import { StatusLines } from './walk/StatusLines';
import { WalkDoors } from './walk/WalkDoors';
import { WalkTitle } from './walk/WalkTitle';
import { WalkTop } from './walk/WalkTop';
import { WalkStrip } from './walk/WalkStrip';
import { stripFor } from '../walk/strip';
import { NewsBannerView } from './walk/NewsBanner';
import { useRoadNews } from './walk/useRoadNews';

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
  const lines = statusLines({ arrival: arrivedToday(steps, today), stop: stop && stopLine(stop), person: met?.who, status: day?.status, near });
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

  return (
    <div className="page lv lv-tab walk2" style={auroraFor(regionAt(km)) as CSSProperties}>
      <Aurora />
      <div className="walk2-col">
        <WalkTop km={km} todayKm={todayKm} stone={stoneFor(km)} festive={festive} />
        {stretch ? (
          <WalkTitle where={stretch.name} sub={`${stretch.plain} · day ${stretchDay(steps, today, stretch)} of ${timeAtPace(stretch.toKm - stretch.fromKm, usualKm)}`} onWhere={() => go('/stretch', { id: stretch.id })} />
        ) : (
          <WalkTitle where={whereLine(where)} sub={`${fmtInt(Math.round(km))} km from Delhi · day ${fmtInt(Math.max(1, dayN))}`} />
        )}
        <WalkStrip strip={stripFor(km, todayKm, stretch, STOPS)} onOpen={() => go('/map')} />
        <PlaceStatusRow settings={settings} today={today} day={day} onPlace={(id) => void changePlace(today, id)} />
        <StatusLines
          today={`${steps.has(today) ? `Today ${todayKm.toFixed(1)} km` : 'Today: no steps logged yet'}${stretch ? ` · ${fmtInt(Math.round(km))} km from Delhi` : ''}`}
          lines={lines} onOpen={(path) => go(path.split('?')[0], Object.fromEntries(new URLSearchParams(path.split('?')[1] ?? '')))} tomorrow={days.some((d) => d.steps !== undefined) ? tomorrow : "Log today's steps and you'll set off from Delhi."} />

        {news?.banner && <NewsBannerView banner={news.banner} kmById={news.kmById} onOpen={news.open} onDismiss={news.dismiss} />}

        {challenges.length > 0 && (
          <section className="walk-section" aria-label="Challenges">
            <h2 className="walk-h2">Challenges</h2>
            {challenges.map((c) => (
              <ChallengeCard key={c.run.id} id={c.run.id} km={c.km} state={c.state as 'walking' | 'set down'} line={c.line} target={c.target} onOpen={() => go('/route', { id: c.run.id })} />
            ))}
          </section>
        )}
        {expeditions.length > 0 && (
          <section className="walk-section" aria-label="Expeditions">
            <h2 className="walk-h2">Expeditions</h2>
            {expeditions.map((e) => (
              <ExpeditionLine key={e.run.id} id={e.run.id} km={e.km} state={e.state as 'walking' | 'set down'} onOpen={() => go('/route', { id: e.run.id })} />
            ))}
          </section>
        )}

        <button type="button" className="walk-primary walk-find" onClick={() => go('/routes')}>
          Choose a walk
          <small>{freeLine(placesFree(runs ?? [], new Map(walking.map((w) => [w.run.id, w.km]))))}</small>
        </button>

        <WalkDoors onGo={(path) => go(path)} />
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
