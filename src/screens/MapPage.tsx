import { useEffect, useRef, useState } from 'react';
import { hasReward } from '../domain/rewards';
import { fmtInt } from '../domain/format';
import { ALL_STATES, chapterAt, kmFromSteps, statesReached, strideM } from '../domain/walk';
import { useAllDays, useSettings } from '../db/hooks';
import { back, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { useUnlockedIds } from '../ui/Theme';
import { STRETCHES } from '../walk/content';
import { flyoverAllowed, flyoverBox, trailTo, type MapLevel } from '../walk/mapView';
import { stretchAt } from '../walk/road';
import { RouteSwitch } from '../walk/RouteSwitch';
import { stepsByDay } from '../walk/runs';
import { IndiaMap, MAP_ASPECT, MapKey, MapLevels } from './walk/IndiaMap';
import { WalkFrame } from './walk/WalkFrame';
import { auroraFor } from '../walk/page';
import { regionAt } from '../domain/regions';

/** How long the flyover lasts. */
const FLY_MS = 15_000;


/**
 * The map: the walk on a night map of India, opening on the stretch you're on, out to the chapter or all of India
 * by word buttons, with a flyover along your trail that a tap stops.
 */
export function MapPage() {
  const settings = useSettings();
  const days = useAllDays();
  const unlocked = useUnlockedIds();
  const [level, setLevel] = useState<MapLevel>('stretch');
  const [flyT, setFlyT] = useState<number>();
  const raf = useRef(0);
  const km = days ? kmFromSteps([...stepsByDay(days).values()].reduce((a, b) => a + b, 0)) : 0;
  const canFly = flyoverAllowed(km);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const fly = () => {
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / FLY_MS);
      setFlyT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setFlyT(undefined);
    };
    raf.current = requestAnimationFrame(tick);
  };
  // Opened from the road so far as #/map?fly=1: the whole road replays once, if there's a trail to fly along.
  const flyAsked = useRoute().params.get('fly') === '1';
  const flown = useRef(false);
  useEffect(() => {
    if (!flyAsked || !days || !canFly || flown.current) return;
    flown.current = true;
    fly();
  }, [flyAsked, days, canFly]);
  if (!settings || !days || !unlocked) return <div className="page" />;

  const ch = chapterAt(km);
  const reached = statesReached(km).map((s) => s.name);
  const nextState = ALL_STATES.find((s) => s.km > km && !reached.includes(s.name));
  const stretch = stretchAt(km, STRETCHES);
  const gold = hasReward(unlocked, 'A gold route on your map');

  const stop = () => {
    cancelAnimationFrame(raf.current);
    setFlyT(undefined);
  };

  return (
    <WalkFrame tint={auroraFor(regionAt(km))}>
      <button type="button" className="backlink" onClick={() => back('/walk')}>
        <Icon name="left" size={20} stroke={1.8} />
        Walk
      </button>
      <RouteSwitch on="route" />
      <header className="walk-head">
        <h1 className="walk-title">{stretch ? stretch.name : 'The walk across India'}</h1>
        <p className="walk-sub">
          {fmtInt(Math.round(km))} of {fmtInt(Math.round(ch.end))} km · chapter {ch.n}
          {nextState ? ` · next: ${nextState.name}` : ''}
        </p>
      </header>
      <MapLevels level={level} chapter={ch.n} onLevel={(l) => (stop(), setLevel(l))} />
      <div className="walk-imap-wrap" onClick={flyT !== undefined ? stop : undefined}>
        <IndiaMap km={km} reached={reached} level={level} gold={gold} box={flyT !== undefined ? flyoverBox(trailTo(km), flyT, MAP_ASPECT) : undefined} />
      </div>
      {canFly && (
        <button type="button" className="walk-ghost" onClick={flyT === undefined ? fly : stop}>
          {flyT === undefined ? 'Fly over your trail' : 'Stop the flyover'}
        </button>
      )}
      <p className="walk-sub">
        Walked into: {reached.join(', ')}.
      </p>
      <MapKey />
      <p className="walk-sub">Each step counts as {strideM().toFixed(2)} m (you can change it in Settings). Distances follow the highways, roughly. Islands are reached by sea.</p>
    </WalkFrame>
  );
}
