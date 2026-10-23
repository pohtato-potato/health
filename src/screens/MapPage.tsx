import { addDays, dayKey, parseDay } from '../domain/dates';
import { fmtDayMonth, fmtDayMonthFrom, fmtInt } from '../domain/format';
import { CHAPTERS, CITIES, INDIA_OUTLINE, PLACE_COUNT, arrivals, kmFromSteps, positionAt, statesReached, strideM, ALL_STATES, type Stop } from '../domain/walk';
import { hasReward } from '../domain/rewards';
import { useAllDays, useSettings, useToday } from '../db/hooks';
import { routeLayers } from '../walk/routeMap';
import { useLiveQuery } from 'dexie-react-hooks';
import { ACTIVE_ACHIEVEMENTS as ACHIEVEMENTS, achievementById } from '../domain/achievements';
import { db } from '../db/db';
import { back, go } from '../router';
import { TIER_COLOR } from '../ui/Moments';
import { Icon } from '../ui/Icon';
import { useUnlockedIds } from '../ui/Theme';
import { useState } from 'react';
import { RouteSwitch } from '../walk/RouteSwitch';
import { useZoomPan } from '../walk/zoom';
import { reachedCards } from '../walk/cards';

const path = (pts: { x: number; y: number }[]) => (pts.length ? `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}` : '');

export function MapPage() {
  const settings = useSettings();
  const days = useAllDays();
  const today = useToday();
  const unlocked = useUnlockedIds();
  const zp = useZoomPan(300, 322);
  const [picked, setPicked] = useState<Stop | null>(null);
  if (!settings || !days || !unlocked) return <div className="page" />;

  const steps = new Map(days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const totalSteps = [...steps.values()].reduce((a, b) => a + b, 0);
  const km = kmFromSteps(totalSteps);
  const layers = routeLayers(km);
  const pos = positionAt(km);
  const ch = pos.chapter;
  const seenNames = new Set<string>();
  const reached = arrivals(steps).filter((a) => !seenNames.has(a.name) && seenNames.add(a.name));
  // Pace from the logged days of the last two weeks, not counting today's partial count.
  const logged = Array.from({ length: 14 }, (_, i) => steps.get(addDays(today, -1 - i))).filter((v): v is number => v !== undefined);
  const pace = logged.length ? kmFromSteps(logged.reduce((a, b) => a + b, 0)) / logged.length : 0;
  const toNext = pos.to ? pos.to.km - km : 0;
  const eta = (target: number) => (pace > 0.1 ? dayKey(new Date(parseDay(today).getTime() + Math.ceil((target - km) / pace) * 86_400_000)) : undefined);
  const states = statesReached(km);
  const nextState = ALL_STATES.find((s) => s.km > km && !states.some((x) => x.name === s.name));
  const chapterLen = ch.end - ch.start;
  const inChapter = Math.max(0, Math.min(km, ch.end) - ch.start);
  const pct = pos.done ? 1 : inChapter / chapterLen;
  const gold = hasReward(unlocked, 'A gold route on your map');
  const walkedColor = gold ? 'var(--gold)' : 'var(--sage)';

  const cards = new Set(reachedCards(km).map((c) => c.city));
  const next = CHAPTERS.find((c) => c.n === ch.n + 1);
  const label = (s: Stop, i: number, list: Stop[]) => (
    <text key={`${s.name}-${i}`} x={s.side === 'l' ? s.x - 5 : s.x + 4.5} y={s.y + 3} textAnchor={s.side === 'l' ? 'end' : 'start'} fill={i === list.length - 1 ? 'var(--gold)' : s.km <= km ? 'var(--text)' : 'var(--quiet)'}>
      {s.name}
    </text>
  );

  return (
    <div className="page">
      <button type="button" className="backlink" onClick={() => back('/walk')}>
        <Icon name="left" size={20} stroke={1.8} />
        Walk
      </button>
      <RouteSwitch on="route" />
      <div className="row base">
        <h1 className="h1">India</h1>
        <span className="t13 q">
          {fmtInt(Math.round(km))} of {fmtInt(Math.round(ch.end))} km · chapter {ch.n}
        </span>
      </div>

      <div className="route-map" style={{ position: 'relative' }}>
        <svg width="100%" viewBox="0 0 300 322" {...zp.handlers} style={{ touchAction: 'none', display: 'block' }} role="img" aria-label={`India with the three chapters of the walk; ${fmtInt(Math.round(km))} km walked, now near ${pos.from.name}.`}>
          <defs>
            <linearGradient id="landg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1f2452" />
              <stop offset="1" stopColor="#151938" />
            </linearGradient>
            <radialGradient id="youg">
              <stop offset="0" stopColor="#EDE6DA" stopOpacity=".55" />
              <stop offset="1" stopColor="#EDE6DA" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g transform={`translate(${zp.view.x} ${zp.view.y}) scale(${zp.view.k})`}>
          <g stroke="#1b1f45" strokeWidth=".5">
            <path d="M0 60h300M0 120h300M0 180h300M0 240h300M0 300h300M60 0v322M120 0v322M180 0v322M240 0v322" />
          </g>
          <path d={INDIA_OUTLINE} fill="url(#landg)" stroke="#8b93d6" strokeOpacity="0.45" strokeWidth="0.9" strokeLinejoin="round" />
          {/* Hills in the north, and the desert's sand in the west. */}
          <g stroke="#cfd6ff" strokeOpacity=".18" strokeWidth=".8" fill="none">
            <path d="M60 40l6-5 6 5 6-6 6 6M90 34l5-4 5 4 5-5 5 5M120 40l5-4 5 4" />
            <path d="M200 112l5-4 5 4 5-4 5 4" />
          </g>
          <g fill="#c9a26a" opacity=".22">
            <circle cx="40" cy="120" r=".8" />
            <circle cx="48" cy="114" r=".8" />
            <circle cx="36" cy="132" r=".8" />
            <circle cx="54" cy="126" r=".8" />
            <circle cx="44" cy="140" r=".8" />
          </g>
          {/* The islands: the Andamans and Nicobars, and Lakshadweep. */}
          <g fill="#1f2452" stroke="#8b93d6" strokeOpacity=".45" strokeWidth=".7">
            <ellipse cx="245" cy="264" rx="1.8" ry="12" />
            <circle cx="249" cy="296" r="1.4" />
            <circle cx="252" cy="305" r="1.4" />
            <circle cx="254" cy="313" r="1.6" />
            <circle cx="53" cy="266" r="1.2" />
            <circle cx="55" cy="278" r="1.2" />
            <circle cx="59" cy="300" r="1.2" />
          </g>
          {layers.later.map((c) => (
            <path
              key={c.n}
              d={path(c.route)}
              fill="none"
              stroke={c.n === 2 ? '#F2C46D' : '#B7A6F0'}
              strokeOpacity={c.n === 2 ? 0.35 : 0.3}
              strokeWidth={c.n === 2 ? 1.2 : 1}
              strokeDasharray={c.n === 2 ? '3 3' : '1.5 3'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {layers.earlier.map((c) => (
            <path key={c.n} d={path(c.route)} fill="none" stroke={walkedColor} strokeOpacity="0.4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {layers.ahead.length > 1 && <path d={path(layers.ahead)} fill="none" stroke="#EDE6DA" strokeOpacity=".5" strokeWidth="1.4" strokeDasharray="3 3" strokeLinecap="round" />}
          {layers.walked.length > 1 && (
            <>
              <path d={path(layers.walked)} fill="none" stroke={walkedColor} strokeOpacity=".18" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <path d={path(layers.walked)} fill="none" stroke={walkedColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
          {ch.route.map((s, i) =>
            s.km > km ? <circle key={`${s.name}-${i}`} cx={s.x} cy={s.y} r="2.1" fill="#3a3f6a" stroke="#0e1020" strokeWidth=".8" /> : null,
          )}
          {layers.reached.map((s) => (
            <circle key={s.name} cx={s.x} cy={s.y} r="2.6" fill="#F2C46D" stroke="#0e1020" strokeWidth=".8">
              <title>{s.name}</title>
            </circle>
          ))}
          {!layers.done && (
            <>
              <circle cx={layers.you.x} cy={layers.you.y} r="9" fill="url(#youg)" />
              <circle className="ping" cx={layers.you.x} cy={layers.you.y} r="5" fill="none" stroke={walkedColor} strokeWidth="1.2" />
              <circle cx={layers.you.x} cy={layers.you.y} r="3.2" fill="#EDE6DA" stroke="#0e1020" strokeWidth="1" />
              <text x={layers.you.x + 9} y={layers.you.y + 4} fontFamily="var(--sans)" fontSize="6.5" fontWeight="700" fill="#EDE6DA">
                You
              </text>
            </>
          )}
          <g fontFamily="var(--sans)" fontSize={ch.route.length > 12 ? 5.6 : 6.2}>
            {ch.route.map((s, i, list) => (i > 0 && list.slice(0, i).some((p) => p.name === s.name) ? null : label(s, i, list)))}
          </g>
          {/* Tap targets for each stop, larger than the dots. */}
          <g fill="transparent">
            {ch.route.map((s, i) => (
              <circle
                key={`hit-${s.name}-${i}`}
                cx={s.x}
                cy={s.y}
                r={11 / zp.view.k}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (zp.wasGesture()) return;
                  if (s.km <= km && cards.has(s.name)) go('/postcard', { c: s.name });
                  else setPicked(s);
                }}
              >
                <title>{s.name}</title>
              </circle>
            ))}
          </g>
          </g>
        </svg>
        <div className="map-zoom">
          <button type="button" className="icon-btn" aria-label="Zoom in" onClick={() => zp.zoom(1.5)}>
            +
          </button>
          <button type="button" className="icon-btn" aria-label="Zoom out" onClick={() => zp.zoom(1 / 1.5)}>
            −
          </button>
          {zp.view.k > 1 && (
            <button type="button" className="icon-btn" aria-label="Show all of India" onClick={zp.reset}>
              ⤢
            </button>
          )}
        </div>
      </div>
      {picked && (
        <div className="card row" role="status">
          <span className="col gap2">
            <span className="t15">{picked.name}</span>
            <span className="t13 q">
              {picked.km <= km ? `Passed at ${fmtInt(Math.round(picked.km))} km` : `${fmtInt(Math.ceil(picked.km - km))} km ahead${eta(picked.km) ? ` · around ${fmtDayMonthFrom(eta(picked.km)!, today)}` : ''}`}
            </span>
          </span>
          <button type="button" className="btn ghost sm" onClick={() => setPicked(null)}>
            Close
          </button>
        </div>
      )}
      <div className="place-key t12 q">
        <span>
          <i className="key-dot solid" style={{ background: walkedColor }} /> walked
        </span>
        {ch.n === 1 && (
          <span>
            <i className="key-dot solid" style={{ background: '#EDE6DA' }} /> chapter 1 ahead
          </span>
        )}
        {layers.later.some((c) => c.n === 2) && (
          <span>
            <i className="key-dot solid" style={{ background: '#F2C46D' }} /> chapter 2
          </span>
        )}
        {layers.later.some((c) => c.n === 3) && (
          <span>
            <i className="key-dot solid" style={{ background: '#B7A6F0' }} /> chapter 3
          </span>
        )}
      </div>
      <div className="list">
        <div className="li">
          <span className="s">
            <span>States crossed</span>
            <small>
              {states.map((x) => x.name).join(', ') || 'None yet'} · {states.length} of {PLACE_COUNT}
            </small>
          </span>
        </div>
        {pos.to && (
          <div className="li">
            <span className="s">
              <span>Next stop</span>
              <small>
                {pos.to.name} · {fmtInt(Math.ceil(toNext))} km{pos.to.sea ? ' by sea' : ''}
                {eta(pos.to.km) ? ` · around ${fmtDayMonthFrom(eta(pos.to.km)!, today)}` : ''}
              </small>
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="row base">
          <div className="lbl sage">
            Chapter {ch.n} · {ch.name}
          </div>
          <div className="t13 q">{Math.round(pct * 100)}%</div>
        </div>
        <div className="num" style={{ fontSize: 34 }}>
          {fmtInt(inChapter)} <span className="t16 q">of {fmtInt(chapterLen)} km</span>
        </div>
        <div className="bar lg">
          <i style={{ width: `${pct * 100}%`, background: walkedColor }} />
        </div>
        <div className="col gap6 t14">
          {pos.to ? (
            <div className="row">
              <span>Next stop</span>
              <span>
                {pos.to.name} · {fmtInt(Math.ceil(toNext))} km{pos.to.sea ? ' by sea' : ''}
                {pace > 0.1 ? ` · about ${Math.max(1, Math.ceil(toNext / pace))} day${Math.ceil(toNext / pace) === 1 ? '' : 's'}` : ''}
              </span>
            </div>
          ) : (
            <div className="gold">Every chapter walked. The whole of India, one lap of home at a time.</div>
          )}
          <div className="row">
            <span>Walked in all</span>
            <span className="q">{fmtInt(km)} km</span>
          </div>
          {!steps.size && <div className="q">Log your steps and you'll set off from Delhi.</div>}
        </div>
      </div>

      <div className="card" style={{ gap: 0 }}>
        <div className="lbl" style={{ paddingBottom: 6 }}>
          Chapters
        </div>
        {CHAPTERS.map((c) => {
          const done = km >= c.end;
          const now = c.n === ch.n && !done;
          return (
            <div key={c.n} className="sess" style={{ minHeight: 50, opacity: done || now ? 1 : 0.5 }}>
              <span className="col gap2">
                <span className="t15">
                  {c.n}. {c.name}
                </span>
                <span className="t12 q">
                  {fmtInt(c.end - c.start)} km · {c.route[0].name} to {c.route[c.route.length - 1].name}
                </span>
              </span>
              <span className={`t12 ${done ? 'gold' : 'q'}`}>{done ? 'Done' : now ? `${Math.round(pct * 100)}%` : c.n === next?.n ? 'Next' : 'Later'}</span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="row base">
          <div className="lbl">States and territories</div>
          <div className="t13 q">
            {states.length} of {PLACE_COUNT}
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
          {states.map((s) => (
            <span key={s.name} className="chip sm" style={{ height: 32, background: '#1c2a24', color: 'var(--sage)', borderColor: 'var(--sage-border)' }}>
              {s.name}
            </span>
          ))}
          {nextState && (
            <span className="chip sm q" style={{ height: 32, borderStyle: 'dashed' }}>
              {nextState.name} in {fmtInt(Math.ceil(nextState.km - km))} km
            </span>
          )}
        </div>
      </div>

      {reached.length > 0 && (
        <div className="col gap10">
          <div className="row base">
            <div className="lbl">Postcards</div>
            <div className="t13 q">
              {reached.length} of {CITIES.length}
            </div>
          </div>
          <div className="row" style={{ gap: 10, overflowX: 'auto', justifyContent: 'flex-start', paddingBottom: 4 }}>
            {[...reached].reverse().map((r) => (
              <button
                type="button"
                key={r.name}
                onClick={() => go('/postcard', { c: r.name })}
                style={{ flexShrink: 0, width: 120, height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', textAlign: 'left', padding: 12, borderRadius: 14, border: '1px solid var(--gold-rule)', background: '#17150f' }}
              >
                <b className="sf" style={{ fontWeight: 400, fontSize: r.name.length > 11 ? 16 : 20, overflowWrap: 'anywhere' }}>
                  {r.name}
                </b>
                <span className="t11 gold-text">
                  {r.km === 0 ? 'Set off' : 'Arrived'} {fmtDayMonth(r.date)}
                  <br />
                  {fmtInt(r.km)} km
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {settings.loopSteps && totalSteps > 0 ? (
        <div className="t13 q center lh">
          It took {fmtInt(Math.round(totalSteps / settings.loopSteps))} laps of your home loop to get this far.
        </div>
      ) : null}
      <div className="t14 d center lh">Each step counts as {strideM().toFixed(2)} m (you can change it in Settings). Distances follow the highways, roughly. Islands are reached by sea.</div>
    </div>
  );
}

export function AchievementsCard() {
  const unlocked = useLiveQuery(() => db.achievements.toArray(), []);
  if (!unlocked) return null;
  const got = new Set(unlocked.map((u) => u.id));
  const latest = [...unlocked].sort((a, b) => b.at - a.at)[0];
  const latestDef = latest ? achievementById(latest.id) : undefined;
  return (
    <button type="button" className="card" onClick={() => go('/achievements')}>
      <div className="row">
        <div className="lbl">Achievements</div>
        <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
      </div>
      <div className="t15">
        <span className="sf" style={{ fontSize: 22 }}>
          {unlocked.length}
        </span>{' '}
        <span className="q">of {ACHIEVEMENTS.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(7px, 1fr))', gap: 3 }} aria-hidden="true">
        {ACHIEVEMENTS.map((a) => (
          <i key={a.id} style={{ aspectRatio: '1', borderRadius: 1.5, background: got.has(a.id) ? (a.cat === 'secret' ? 'var(--lavender)' : TIER_COLOR[a.tier]) : 'var(--track)' }} />
        ))}
      </div>
      {latestDef && <div className="t13 q">Latest: {latestDef.cat === 'secret' ? `${latestDef.name} (secret)` : latestDef.name}</div>}
    </button>
  );
}
