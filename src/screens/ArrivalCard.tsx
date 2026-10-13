import { useEffect, useRef, useState } from 'react';
import { partOfDay } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { ALL_STOPS, INDIA_OUTLINE } from '../domain/walk';
import { back, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { Scene } from '../walk/art/scene';
import { cardFor } from '../walk/cards';

/** A short zoom from the whole map into the city; skipped when motion is reduced. */
function Flyover({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const [t, setT] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return done.current();
    const start = performance.now();
    let id = 0;
    // A hidden tab pauses animation frames; the timer makes sure the card still opens.
    const fallback = window.setTimeout(() => done.current(), 2000);
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 1400);
      setT(1 - (1 - k) ** 3);
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(fallback);
    };
  }, []);
  const w = 300 - (300 - 40) * t;
  const h = 322 - (322 - 43) * t;
  const vx = (x - w / 2) * t;
  const vy = (y - h / 2) * t;
  return (
    <div className="flyover" aria-hidden>
      <svg viewBox={`${vx} ${vy} ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <path d={INDIA_OUTLINE} fill="var(--surface)" stroke="var(--btn-border)" strokeWidth={0.6} />
        <circle cx={x} cy={y} r={1.6} fill="var(--gold)" />
        <circle cx={x} cy={y} r={4} fill="none" stroke="var(--gold)" strokeOpacity={0.5} strokeWidth={0.5} />
      </svg>
    </div>
  );
}

/** A stop's card: drawn at the hour you open it, with a real fact, the food, the language and the souvenir. */
export function ArrivalCardPage() {
  const { params } = useRoute();
  const city = params.get('city') ?? 'Delhi';
  const [flying, setFlying] = useState(params.get('fly') === '1');
  const card = cardFor(city);
  const stop = ALL_STOPS.find((s) => s.name === city);
  if (!card || !stop) return <div className="page bare t15 q">No card for {city}.</div>;
  if (flying) return <Flyover x={stop.x} y={stop.y} onDone={() => setFlying(false)} />;
  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/walk')}>
        <Icon name="left" size={20} stroke={1.8} />
        Walk
      </button>
      <div className="t13 q">
        Stop {card.stopNo} of {card.stops}
      </div>
      <Scene city={city} part={partOfDay(new Date())} people />
      <h1 className="h1">{city}</h1>
      <p className="t16 lh" style={{ margin: 0 }}>
        {card.fact}
      </p>
      <div className="list">
        {[
          ['Eat', card.eat],
          ['Hear', card.hear],
          ['Keep', card.keep ?? '—'],
          ['Land', card.land],
          ['Next', card.next ? `${card.next.name} · ${fmtInt(card.next.km)} km` : 'The end of the road'],
        ].map(([k, v]) => (
          <div key={k} className="li" style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
            <span className="t13 q" style={{ width: 52, flexShrink: 0 }}>
              {k}
            </span>
            <span className="t15 lh grow">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
