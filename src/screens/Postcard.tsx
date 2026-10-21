import { useEffect } from 'react';
import { daysBetween, partOfDay } from '../domain/dates';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { ALL_STOPS, CITIES, INDIA_OUTLINE, POSTCARDS, arrivals, kmFromSteps } from '../domain/walk';
import { useAllDays, useSettings } from '../db/hooks';
import { back, go, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { Scene } from '../walk/art/scene';
import { cardFor } from '../walk/cards';

/** One page for each city on the walk: its postcard, sent the day you arrive, and what to eat, hear and see there. */
export function PostcardPage() {
  const route = useRoute();
  const settings = useSettings();
  const days = useAllDays();
  if (!settings || !days) return <div className="page" />;

  const name = route.params.get('c') ?? '';
  const i = CITIES.indexOf(name);
  const at = ALL_STOPS.findIndex((s) => s.name === name);
  const stop = ALL_STOPS[at];
  const steps = new Map(days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const reached = arrivals(steps);
  const arrival = reached.find((r) => r.name === name);
  const km = kmFromSteps([...steps.values()].reduce((a, b) => a + b, 0));

  if (!stop || !arrival) {
    return (
      <div className="page">
        <button type="button" className="backlink" onClick={() => back('/map')}>
          <Icon name="left" size={20} stroke={1.8} />
          Map
        </button>
        <div className="card" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div className="sf" style={{ fontSize: 26 }}>
            {stop ? `Not in ${stop.name} yet` : 'No postcard here'}
          </div>
          <div className="t15 q lh">{stop ? `${fmtInt(Math.ceil(stop.km - km))} km to go. The postcard is waiting for you there.` : "This city isn't on the walk."}</div>
          <button type="button" className="btn ghost sm" onClick={() => go('/map')}>
            See the map
          </button>
        </div>
      </div>
    );
  }

  const first = reached[0].date;
  const day = daysBetween(first, arrival.date) + 1;
  const thatDay = steps.get(arrival.date);
  const next = ALL_STOPS[at + 1];
  const postmark = fmtDayMonth(arrival.date).toUpperCase();
  const card = cardFor(stop.name);

  return (
    <div className="page">
      <button type="button" className="backlink" onClick={() => back('/map')}>
        <Icon name="left" size={20} stroke={1.8} />
        Map
      </button>

      <Scene city={stop.name} part={partOfDay(new Date())} people />

      <article className="postcard" aria-label={`Postcard from ${stop.name}`}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="col gap4">
            <span className="pc-kick">
              Postcard {i + 1} of {CITIES.length}
            </span>
            <span className="pc-greet">{i === 0 ? 'Setting off from' : 'Greetings from'}</span>
            <span className="pc-city">{stop.name}</span>
          </div>
          <div className="pc-stamp-wrap">
            <Stamp x={stop.x} y={stop.y} km={stop.km} />
            <div className="pc-postmark" aria-hidden="true">
              <span>{postmark}</span>
              <span>{stop.name.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div className="pc-rule" />
        <p className="pc-text">{POSTCARDS[stop.name]}</p>
        <div className="pc-rule" />
        <div className="pc-address">
          <span className="pc-to">To</span>
          <span className="pc-line">{settings.name || 'You'}</span>
          <span className="pc-line">On the road, day {day} of the walk</span>
          <span className="pc-line">
            {fmtInt(stop.km)} km from Delhi{next ? `, ${fmtInt(next.km - stop.km)} to ${next.name}` : ''}
          </span>
        </div>
        <div className="pc-foot">
          {i === 0 ? 'Set off' : 'Arrived'} {fmtDayMonth(arrival.date)}
          {thatDay !== undefined && <> · That day: {fmtInt(thatDay)} steps</>}
        </div>
      </article>

      {card && (
        <div className="list">
          {[
            ['Eat', card.eat],
            ['Hear', card.hear],
            ['Land', card.land],
            ['Next', card.next ? `${card.next.name} · ${fmtInt(card.next.km)} km` : 'The end of the road'],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="li" style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
                <span className="t13 q" style={{ width: 52, flexShrink: 0 }}>
                  {k}
                </span>
                <span className="t15 lh grow">{v}</span>
              </div>
            ))}
        </div>
      )}

      <div className="row gap10">
        <button type="button" className="btn lg grow" onClick={() => go('/today')}>
          Keep walking
        </button>
        <button type="button" className="btn lg ghost grow" onClick={() => go('/map')}>
          All postcards
        </button>
      </div>
    </div>
  );
}

/** A perforated stamp with the city marked on a tiny India. */
function Stamp({ x, y, km }: { x: number; y: number; km: number }) {
  const holes: [number, number][] = [];
  for (let t = 4; t <= 72; t += 6) holes.push([t, 0], [t, 88], [0, t + 8], [76, t + 8]);
  return (
    <svg width="76" height="88" viewBox="0 0 76 88" className="pc-stamp" aria-hidden="true">
      <defs>
        <mask id="perf">
          <rect width="76" height="88" fill="white" />
          {holes.map(([cx, cy], k) => (
            <circle key={k} cx={cx} cy={cy} r="2.2" fill="black" />
          ))}
        </mask>
      </defs>
      <rect width="76" height="88" fill="#f7f1e4" mask="url(#perf)" />
      <rect x="6" y="6" width="64" height="76" fill="#dfe9e2" stroke="#7a9a8a" strokeWidth="0.8" />
      <g transform="translate(10 9) scale(0.19)">
        <path d={INDIA_OUTLINE} fill="#b9cfc3" stroke="#4d6b5d" strokeWidth="4" />
        <circle cx={x} cy={y} r="14" fill="#b4533c" />
      </g>
      <text x="38" y="77" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#2a2620">
        {fmtInt(km)} KM
      </text>
    </svg>
  );
}

/** Old links to a city's arrival card now open its postcard. */
export function ArrivalRedirect() {
  const { params } = useRoute();
  const city = params.get('city') ?? 'Delhi';
  useEffect(() => go('/postcard', { c: city }, { replace: true }), [city]);
  return <div className="page" />;
}
