import { addDays, dayKey, parseDay } from '../domain/dates';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { CHAPTERS, CITIES, INDIA_OUTLINE, PLACE_COUNT, QUAD, arrivals, kmFromSteps, positionAt, statesReached, ALL_STATES, type Stop } from '../domain/walk';
import { hasReward } from '../domain/rewards';
import { useAllDays, useSettings, useToday } from '../db/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { ACTIVE_ACHIEVEMENTS as ACHIEVEMENTS, achievementById } from '../domain/achievements';
import { db } from '../db/db';
import { back, go } from '../router';
import { TIER_COLOR } from '../ui/Moments';
import { Icon } from '../ui/Icon';
import { useUnlockedIds } from '../ui/Theme';

const path = (pts: { x: number; y: number }[]) => (pts.length ? `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}` : '');

export function MapPage() {
  const settings = useSettings();
  const days = useAllDays();
  const today = useToday();
  const unlocked = useUnlockedIds();
  if (!settings || !days || !unlocked) return <div className="page" />;

  const steps = new Map(days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const totalSteps = [...steps.values()].reduce((a, b) => a + b, 0);
  const km = kmFromSteps(totalSteps);
  const pos = positionAt(km);
  const ch = pos.chapter;
  const seenNames = new Set<string>();
  const reached = arrivals(steps).filter((a) => !seenNames.has(a.name) && seenNames.add(a.name));
  const week = Array.from({ length: 7 }, (_, i) => steps.get(addDays(today, -i)) ?? 0);
  const pace = kmFromSteps(week.reduce((a, b) => a + b, 0)) / 7;
  const toNext = pos.to ? pos.to.km - km : 0;
  const eta = (target: number) => (pace > 0.1 ? dayKey(new Date(parseDay(today).getTime() + Math.ceil((target - km) / pace) * 86_400_000)) : undefined);
  const states = statesReached(km);
  const nextState = ALL_STATES.find((s) => s.km > km && !states.some((x) => x.name === s.name));
  const chapterLen = ch.end - ch.start;
  const inChapter = Math.max(0, Math.min(km, ch.end) - ch.start);
  const pct = pos.done ? 1 : inChapter / chapterLen;
  const gold = hasReward(unlocked, 'A gold route on your map');
  const walkedColor = gold ? 'var(--gold)' : 'var(--sage)';

  // The walked part of this chapter, up to where you are now, and what's ahead.
  const here = { x: pos.x, y: pos.y };
  const walked = [...ch.route.filter((s) => s.km <= km), ...(pos.done ? [] : [here])];
  const ahead = pos.done ? [] : [here, ...ch.route.filter((s) => s.km > km)];
  const earlier = CHAPTERS.filter((c) => c.n < ch.n);
  const next = CHAPTERS.find((c) => c.n === ch.n + 1);
  const label = (s: Stop, i: number, list: Stop[]) => (
    <text key={`${s.name}-${i}`} x={s.side === 'l' ? s.x - 5 : s.x + 4.5} y={s.y + 3} textAnchor={s.side === 'l' ? 'end' : 'start'} fill={i === list.length - 1 ? 'var(--gold)' : s.km <= km ? 'var(--text)' : 'var(--quiet)'}>
      {s.name}
    </text>
  );

  return (
    <div className="page">
      <button type="button" className="backlink" onClick={() => back('/journey')}>
        <Icon name="left" size={20} stroke={1.8} />
        Journey
      </button>
      <div className="col gap6">
        <h1 className="h1">Walk across India</h1>
        <div className="t15 q">
          Chapter {ch.n} · {ch.name}
        </div>
      </div>

      <div className="card" style={{ padding: 12, alignItems: 'center' }}>
        <svg width="100%" viewBox="0 0 300 322" role="img" aria-label={`Map of India. ${fmtInt(km)} km walked, in chapter ${ch.n}.`} style={{ maxWidth: 340 }}>
          <path d={INDIA_OUTLINE} fill="#171B24" stroke="var(--pearl)" strokeOpacity="0.55" strokeWidth="1.1" strokeLinejoin="round" />
          <ellipse cx="245" cy="264" rx="1.8" ry="14" fill="#171B24" stroke="var(--pearl)" strokeOpacity="0.55" strokeWidth="1" />
          <g fill="var(--pearl)" fillOpacity="0.55">
            <circle cx="249" cy="296" r="1.4" />
            <circle cx="252" cy="305" r="1.4" />
            <circle cx="254" cy="313" r="1.6" />
            <circle cx="53" cy="266" r="1.2" />
            <circle cx="55" cy="278" r="1.2" />
            <circle cx="59" cy="300" r="1.2" />
          </g>
          {earlier.map((c) => (
            <path key={c.n} d={path(c.route)} fill="none" stroke={walkedColor} strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {ch.n === 1 && <path d={`M98.6 98.9 L${QUAD[2].x} ${QUAD[2].y} L${QUAD[1].x} ${QUAD[1].y} L${QUAD[0].x} ${QUAD[0].y} Z`} fill="none" stroke="var(--gold)" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="2 3" />}
          {ahead.length > 1 && <path d={path(ahead)} fill="none" stroke="var(--text)" strokeOpacity="0.5" strokeWidth="1.4" strokeDasharray="3 3" strokeLinecap="round" />}
          {walked.length > 1 && <path d={path(walked)} fill="none" stroke={walkedColor} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
          {ch.route.map((s, i) =>
            s.km <= km ? (
              <circle key={`${s.name}-${i}`} cx={s.x} cy={s.y} r="2.6" fill="var(--gold)" />
            ) : i === ch.route.length - 1 ? (
              <circle key={`${s.name}-${i}`} cx={s.x} cy={s.y} r="3.6" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
            ) : (
              <circle key={`${s.name}-${i}`} cx={s.x} cy={s.y} r="2.2" fill="#171B24" stroke="var(--text)" strokeOpacity="0.8" strokeWidth="1.1" />
            ),
          )}
          {!pos.done && (
            <>
              <circle className="ping" cx={pos.x} cy={pos.y} r="5" fill="none" stroke={walkedColor} strokeWidth="1.5" />
              <circle cx={pos.x} cy={pos.y} r="3.4" fill={walkedColor} />
            </>
          )}
          <g fontFamily="var(--sans)" fontSize={ch.route.length > 12 ? 6.8 : 8.5}>
            {ch.route.map((s, i, list) => (i > 0 && list.slice(0, i).some((p) => p.name === s.name) ? null : label(s, i, list)))}
          </g>
          {ch.n === 1 && (
            <g fontFamily="var(--sans)" fontSize="7.5" fill="var(--gold)" fillOpacity="0.5">
              <text x="53" y="196" textAnchor="end">
                Mumbai
              </text>
              <text x="132" y="251">
                Chennai
              </text>
              <text x="207" y="157">
                Kolkata
              </text>
            </g>
          )}
        </svg>
        <div className="row t12 q" style={{ gap: 14, flexWrap: 'wrap', justifyContent: 'flex-start', alignSelf: 'stretch', padding: '0 6px 4px' }}>
          <span className="row" style={{ gap: 6 }}>
            <i style={{ width: 14, height: 3, borderRadius: 2, background: walkedColor }} />
            Walked
          </span>
          <span className="row" style={{ gap: 6 }}>
            <i style={{ width: 14, borderTop: '1.5px dashed var(--text)' }} />
            Ahead
          </span>
          {ch.n === 1 && (
            <span className="row" style={{ gap: 6 }}>
              <i style={{ width: 14, borderTop: '1.5px dashed var(--gold)', opacity: 0.6 }} />
              Chapter 2
            </span>
          )}
        </div>
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
          {!pos.done && eta(ch.end) && (
            <div className="row">
              <span>{ch.route[ch.route.length - 1].name}</span>
              <span className="q">around {fmtDayMonth(eta(ch.end)!)} at your pace</span>
            </div>
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
      <div className="t12 d center lh">Distances follow the highways, roughly. Islands are reached by sea.</div>
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
