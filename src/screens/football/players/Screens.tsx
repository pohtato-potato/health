// Engine 2's player screens: the eleven on the pitch, a unit, a player, and the card moment (tap to break, reissue).
import { useState } from 'react';
import { stepName, stepRange, TIER_NAME } from '../../../football/players/cards';
import { elevenOf, PLACES_433, UNIT_COLOUR, UNIT_WHERE } from '../../../football/players/eleven';
import type { FbPlayer, Unit, XiPlace } from '../../../football/players/types';
import { LEGEND_APPS, LEGEND_RECORD_DAYS, LEGEND_SEASONS, membersOf } from '../../../football/store/players';
import { usePlayer, usePlayerRating, usePlayers } from '../../../football/store/hooks';
import { seeMoment } from '../../../football/store/save';
import { AXES } from '../../../football/types';
import { daysBetween, dayOfLogging } from '../../../domain/dates';
import { go } from '../../../router';
import { PlayerCard, TiltCard } from './Card';

/** Attribute colours from round 7: each bar also carries its name and number. */
const ATTR_COLOUR = ['#ff9a76', '#ffd56a', '#c2b2ff', '#8fdcb6'];
const uc = (u: Unit) => ({ ['--uc' as string]: UNIT_COLOUR[u] });
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const openPlayer = (id: string) => go('/football/player', { id });

/** The pitch's lines, drawn once. */
const LINES = (
  <svg className="pl-lines" viewBox="0 0 75 100" preserveAspectRatio="none" aria-hidden="true">
    <rect x="3" y="3" width="69" height="94" rx="2" /><line x1="3" y1="50" x2="72" y2="50" /><circle cx="37.5" cy="50" r="9" />
    <rect x="20" y="3" width="35" height="14" /><rect x="20" y="83" width="35" height="14" />
  </svg>
);

/** The Club page's eleven, from the stored players. */
export function ElevenSection() {
  const players = usePlayers();
  if (!players) return null;
  return <ElevenView xi={elevenOf(membersOf(new Map(players.map((p) => [p.id, p]))))} players={players} />;
}

/** The eleven in 4-3-3 (round 7): every token says its rating and name; the unit list says which colour is which. */
export function ElevenView({ xi, players }: { xi: XiPlace[]; players: FbPlayer[] }) {
  const waiting = players.filter((p) => p.moments.some((m) => !m.seen));
  const used: Record<string, number> = {};
  return (
    <section className="pl-eleven" aria-label="The eleven">
      {waiting[0] && (() => {
        const p = waiting[0];
        const more = waiting.length - 1;
        return (
          <button type="button" className="pl-banner" onClick={() => go('/football/card', { id: p.id })}>
            <PlayerCard card={p.moments.find((x) => !x.seen)!.from} art={p.art} seed={p.id} />
            <span><b>{p.name}</b>{more ? ` and ${more} more have` : ' has'} a new card waiting. Tap to open {more ? 'the first' : 'it'}.</span>
          </button>
        );
      })()}
      <div className="fb-row"><h2 className="fb-t">The eleven</h2><span className="fb-s">4-3-3</span></div>
      {xi.length === 0 ? <p className="fb-s">Log a habit and it signs for the club. The eleven fills as players sign.</p> : (
        <div className="pl-pitch">
          {LINES}
          {xi.map((x) => {
            const k = used[x.unit] = (used[x.unit] ?? -1) + 1;
            const spot = PLACES_433[x.unit][k] ?? PLACES_433[x.unit][0];
            return (
              <button key={`${x.unit}${k}`} type="button" className="pl-tk" style={{ left: `${spot.x}%`, top: `${spot.y}%`, ...uc(x.unit) }} onClick={() => openPlayer(x.player)} aria-label={`${x.name}, ${x.unit}, ${spot.place}, rated ${x.rating}`}>
                <b>{x.rating}</b><span>{x.name}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="pl-units">
        {AXES.map((u) => (
          <button key={u} type="button" className="pl-unit" style={uc(u)} onClick={() => go('/football/unit', { u })}>
            <i aria-hidden="true" /><span><b>{u}</b><small>{players.filter((p) => p.unit === u && p.status === 'squad').length} players</small></span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Row({ p, starts }: { p: FbPlayer; starts?: boolean }) {
  return (
    <button type="button" className="pl-row" style={uc(p.unit)} onClick={() => openPlayer(p.id)}>
      <PlayerCard card={p.card} art={p.art} seed={p.id} />
      <span className="pl-col"><b>{p.name}</b><span>{p.status === 'academy' ? 'In the academy' : p.status === 'left' ? 'No longer logged' : starts ? 'Starts' : 'Bench'} · {stepName(p.card)}</span></span>
      <b className="pl-num">{p.overall}</b>
    </button>
  );
}

/** One unit: its players, best first. */
export function UnitRoute({ unit }: { unit: string }) {
  const players = usePlayers();
  if (!players) return null;
  const u = AXES.find((a) => a === unit);
  if (!u) return <p className="fb-s">No such unit.</p>;
  const xi = new Set(elevenOf(membersOf(new Map(players.map((p) => [p.id, p])))).map((x) => x.player));
  const list = players.filter((p) => p.unit === u).sort((a, b) => (a.status === 'left' ? 1 : 0) - (b.status === 'left' ? 1 : 0) || b.overall - a.overall);
  return (
    <div className="pl-page">
      <button type="button" className="fb-btn sm" onClick={() => go('/football/club', undefined, { replace: true })}>← The eleven</button>
      <h2 className="fb-t">{u}</h2>
      <p className="pl-sub">Plays in {UNIT_WHERE[u]}. Its best players start.</p>
      <div className="pl-list">{list.length ? list.map((p) => <Row key={p.id} p={p} starts={xi.has(p.id)} />) : <p className="fb-s">No players yet.</p>}</div>
    </div>
  );
}

function legendProgress(p: FbPlayer): string {
  if (p.clubLegend) return `Club legend since ${fmtDate(p.clubLegend.on)}: ${p.clubLegend.why === 'apps' ? `${LEGEND_APPS} appearances` : p.clubLegend.why === 'record' ? 'held the record for 26 weeks' : `${LEGEND_SEASONS} seasons`}.`;
  const held = p.recordSince ? Math.floor(daysBetween(p.recordSince, dayOfLogging(Date.now())) / 7) : 0;
  return `${p.apps} of ${LEGEND_APPS} appearances · ${p.seasons.length} of ${LEGEND_SEASONS} seasons${p.recordSince ? ` · record held ${held} of ${LEGEND_RECORD_DAYS / 7} weeks` : ''}.`;
}

/** One player: the card, its number, the attributes that make it, and its story so far. */
export function PlayerPage({ id }: { id: string }) {
  const p = usePlayer(id);
  const r = usePlayerRating(id);
  if (p === undefined) return null;
  if (!p) return <p className="fb-s">No such player.</p>;
  const legend = p.card.tier === 'legend';
  return (
    <div className="pl-page" style={uc(p.unit)}>
      <button type="button" className="fb-btn sm" onClick={() => go('/football/unit', { u: p.unit })}>← {p.unit}</button>
      <div className={`pl-hero${legend ? ' lg' : ''}`}>
        <TiltCard card={p.card} art={p.art} seed={p.id} label={`${p.name}, ${stepName(p.card)} card`} />
        <div className="pl-heroinfo">
          <span className="pl-sub">{p.unit} · {UNIT_WHERE[p.unit]}</span>
          <h2 className="fb-t">{p.name}</h2>
          <div className="pl-overall"><b className="pl-num">{p.overall}</b><span>overall</span></div>
          <span className={`pl-stepname${legend ? ' pl-legendtext' : ''}`}>{stepName(p.card)}</span>
        </div>
      </div>
      <p className="pl-sub">Best {p.best} on {fmtDate(p.bestOn)}. The card keeps its best; only the number can drop.{p.status === 'academy' ? ' Waiting in the academy for its youngster.' : p.status === 'left' ? ' No longer logged.' : ''}</p>
      <section className="fb-card" aria-label="Attributes">
        <span className="fb-lb">Attributes · last 28 days</span>
        {r?.rating ? r.rating.attrs.map((a, i) => (
          <div key={a.id} className="pl-attr" style={{ ['--ac' as string]: ATTR_COLOUR[i % ATTR_COLOUR.length] }}>
            <b>{a.label}</b><b className="pl-num">{a.value}</b>
            <span className="pl-bar" aria-hidden="true"><i style={{ width: `${a.value}%` }} /></span>
            <p>{a.note}</p>
          </div>
        )) : <p className="fb-s">Nothing in the last 28 days. It keeps its last number until it is logged again.</p>}
      </section>
      <section className="pl-stats" aria-label="Career">
        <div><b className="pl-num">{p.apps}</b><span>appearances</span></div>
        <div><b className="pl-num">{p.goals}</b><span>goals</span></div>
        <div><b className="pl-num">{p.saves}</b><span>saves</span></div>
      </section>
      <section className="fb-card" aria-label="Club legend">
        <span className="fb-lb">Club legend</span>
        <p className="pl-prog">{legendProgress(p)}</p>
      </section>
      {p.limitBreaks.length > 0 && (
        <section className="fb-card gold" aria-label="Limit breaks">
          <span className="fb-lb">Limit breaks</span>
          {p.limitBreaks.map((l) => <p key={`${l.on}${l.why}`} className="pl-prog">{fmtDate(l.on)} · {l.why === 'awakening' ? 'carried over from an Awakening' : l.why}{l.trait ? ` · ${l.trait}` : ''}</p>)}
        </section>
      )}
      <section className="fb-card" aria-label="Card history">
        <span className="fb-lb">Card history</span>
        <div className="pl-vs">
          {p.versions.map((v, i) => (
            <div key={`${v.on}${i}`} className={i === p.versions.length - 1 ? 'now' : undefined}>
              <PlayerCard card={v} art={p.art} seed={p.id} />
              <b>{stepName(v)}</b><small>{fmtDate(v.on)}</small><small>{stepRange(v)}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const CRACK = <svg className="ck8" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><path d="M52 0 L46 30 L56 52 L42 86 L54 140" /><path d="M46 30 L18 22 M56 52 L84 44 M42 86 L12 108 M42 86 L80 112" /></svg>;
const SHARDS: [number, number, number][] = [[-120, -60, 40], [130, -40, -30], [-90, 90, 70], [110, 120, 20], [-30, -140, 110], [40, 150, -60], [-150, 20, 15], [150, 60, 80]];
const BUILD: Partial<Record<string, string>> = { gold: 'bu-gold', prism: 'bu-prism', icon: 'bu-icon' };
const DONE_MS: Record<string, number> = { '': 2600, 'bu-gold': 3500, 'bu-prism': 4800, 'bu-icon': 6400 };

/**
 * The card moment (round 9): the old card waits until tapped, then breaks and the new one is issued. A step up is the
 * break alone; a tier up plays the new tier's build-up first. Nothing autoplays. Reset plays it again.
 */
export function CardMomentRoute({ id }: { id: string }) {
  const p = usePlayer(id);
  const [go_, setGo] = useState(false);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);
  if (p === undefined) return null;
  if (!p) return <p className="fb-s">No such player.</p>;
  // Several step-ups while away play as one: from the oldest card still waiting to the card it is now.
  const unseen = p.moments.filter((x) => !x.seen);
  const last = unseen[unseen.length - 1] ?? p.moments[p.moments.length - 1];
  if (!last) return <p className="fb-s">No card waiting.</p>;
  const from = (unseen[0] ?? last).from;
  const m = { ...last, from, kind: from.tier !== last.tier ? 'tier' as const : last.kind };
  // Legend's own build-up arrives with the story moments (layer 4); until then it breaks straight to the new card.
  const build = m.kind === 'tier' ? BUILD[m.tier] ?? '' : '';
  const tierCls = m.tier === 'legend' ? 'legend' : m.tier === 'icon' ? 'icon' : m.tier === 'prism' ? 'prism' : 'gold';
  const play = () => {
    if (go_) return;
    setGo(true);
    window.setTimeout(() => { setDone(true); void seeMoment(p.id); }, DONE_MS[build]);
  };
  return (
    <div className={`pl-moment ${tierCls}`}>
      <span className="pl-kick">{m.kind === 'tier' ? `${TIER_NAME[m.tier]} card` : 'Step up'}</span>
      <h2 className="fb-t">{p.name}</h2>
      <button key={run} type="button" className={`rb8 ${build}${go_ ? ' go' : ''}`} onClick={play} aria-label={go_ ? `${stepName(m)} card` : `Tap to break the ${stepName(m.from)} card`}>
        <div className="nw8"><PlayerCard card={m} art={p.art} seed={p.id} /></div>
        <div className="old8">
          <div className="hf8 l"><PlayerCard card={m.from} art={p.art} seed={p.id} /></div>
          <div className="hf8 r"><PlayerCard card={m.from} art={p.art} seed={p.id} /></div>
          {CRACK}
        </div>
        {SHARDS.map(([dx, dy, rz]) => <i key={`${dx}${dy}`} className="sd8" style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, ['--rz' as string]: `${rz}deg` }} />)}
        <i className="fl8" />
      </button>
      {!go_ && <p className="pl-sub">{stepName(m.from)} · tap the card to break it.</p>}
      <div className={`pl-after${done ? ' on' : ''}`} aria-live="polite">
        {done && <>
          <b className={`pl-stepname${m.tier === 'legend' ? ' pl-legendtext' : ''}`}>{stepName(m)}</b>
          <p className="pl-sub">Rated {m.overall} on {fmtDate(m.on)}. {stepName(m)} runs {stepRange(m)}.</p>
          <div className="pl-btns">
            <button type="button" className="fb-btn" onClick={() => { setGo(false); setDone(false); setRun(run + 1); }}>Play it again</button>
            <button type="button" className="fb-btn pri" onClick={() => openPlayer(p.id)}>See {p.name}</button>
          </div>
        </>}
      </div>
    </div>
  );
}
