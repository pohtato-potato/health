// Engine 2's player screens: the eleven on the pitch, a unit, a player, and the card moment (tap to break, reissue).
import { useState } from 'react';
import { rankOf, stepName, stepOf, stepRange, TIER_FLOOR, TIER_NAME } from '../../../football/players/cards';
import { elevenOf, PLACES_433, UNIT_COLOUR, UNIT_WHERE } from '../../../football/players/eleven';
import type { FbPlayer, Unit, XiPlace } from '../../../football/players/types';
import { LEGEND_APPS, LEGEND_RECORD_DAYS, LEGEND_SEASONS, membersOf } from '../../../football/store/players';
import { usePlayer, usePlayerRating, usePlayers, useSheet } from '../../../football/store/hooks';
import { seeMoment } from '../../../football/store/save';
import { AXES } from '../../../football/types';
import { daysBetween, dayOfLogging } from '../../../domain/dates';
import { go } from '../../../router';
import { PlayerCard, playerCardView, TiltCard } from './Card';
import { Action, Hero, Panel, Sect } from '../../../ui/kit/Kit';
import { Bar, Note, PanelTop } from '../club/Bits';
import { Icon } from '../../../ui/Icon';
import { openCard } from '../../../ui/CardViewer';
import { VALUE_INK, valueTier } from '../../../ui/inks';
import { CARD_TIERS, type CardTier } from '../../../football/players/types';
import { PlayerRotation, RotationLinks, rowWords } from './Rotation';
import { matchRating } from '../../../football/rotation/condition';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { loadHealth } from '../../../football/store/gather';
import { loggedOn } from '../../../football/globe/duty';
import { useSeenBefore } from '../../../ui/motion/motion';
import type { CSSProperties } from 'react';

/**
 * The eleven wake (motion board one, O44): the players whose habit is logged today, and of those the ones that woke
 * since the pitch was last seen today (they light up once; the lit ring then stays, with "logged today" in its label).
 */
function useAwake(xi: XiPlace[]): { awake: Set<string>; fresh: Set<string> } {
  const today = dayOfLogging(Date.now());
  const ids = xi.map((x) => x.player);
  const awake = useLiveQuery(async () => {
    const [h, ps] = [await loadHealth(), await db.fbPlayers.bulkGet(ids)];
    return ids.filter((_, i) => ps[i] && loggedOn(h, ps[i]!, today));
  }, [ids.join(','), today]);
  const before = useSeenBefore<string[] | null>(`eleven:${today}`, awake ?? null);
  const on = new Set(awake ?? []);
  return { awake: on, fresh: new Set([...on].filter((id) => !(before ?? []).includes(id))) };
}

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
  const sheet = useSheet();
  if (!players) return null;
  // The team sheet's eleven, so the club page and the sheet always agree on who starts.
  return <ElevenView xi={sheet?.xi ?? elevenOf(membersOf(new Map(players.map((p) => [p.id, p]))))} players={players} formation={sheet?.save.sheet?.formation} />;
}

/** The eleven in 4-3-3 (round 7): every token says its rating and name; the unit list says which colour is which. */
/** The pitch with every token's match rating and name (round 8: the number sits inside the circle). */
export function Pitch({ xi }: { xi: XiPlace[] }) {
  const used: Record<string, number> = {};
  const { awake, fresh } = useAwake(xi);
  let woke = 0;
  return (
    <div className="pl-pitch">
      {LINES}
      {xi.map((x) => {
        const k = used[x.unit] = (used[x.unit] ?? -1) + 1;
        const spot = PLACES_433[x.unit][k] ?? PLACES_433[x.unit][0];
        return (
          <button key={`${x.unit}${k}`} type="button" className={`pl-tk${awake.has(x.player) ? ' mo-awake' : ''}${fresh.has(x.player) ? ' mo-wake' : ''}`} style={{ left: `${spot.x}%`, top: `${spot.y}%`, ...uc(x.unit), ...(fresh.has(x.player) ? { '--d': `${300 + woke++ * 160}ms` } as CSSProperties : {}) }} onClick={() => openPlayer(x.player)} aria-label={`${x.name}, ${x.unit}, ${spot.place}, match rating ${x.rating}${awake.has(x.player) ? ', logged today' : ''}`}>
            <b>{x.rating}</b><span>{x.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ElevenView({ xi, players, formation = '4-3-3' }: { xi: XiPlace[]; players: FbPlayer[]; formation?: string }) {
  const waiting = players.filter((p) => p.moments.some((m) => !m.seen));
  return (
    <section className="pl-eleven" aria-label="The eleven">
      {waiting[0] && (() => {
        const p = waiting[0];
        const more = waiting.length - 1;
        return (
          <button type="button" className="pl-banner" onClick={() => go('/football/card', { id: p.id })}>
            <PlayerCard card={p.moments.find((x) => !x.seen)!.from} art={p.art} seed={p.id} player={p} />
            <span><b>{p.name}</b>{more ? ` and ${more} more have` : ' has'} a new card waiting. Tap to open {more ? 'the first' : 'it'}.</span>
          </button>
        );
      })()}
      <RotationLinks players={players} />
      <div className="fb-row"><h2 className="fb-t">The eleven</h2><span className="fb-s">{formation}</span></div>
      {xi.length === 0 ? <p className="fb-s">Log a habit and it signs for the club. The eleven fills as players sign.</p> : <Pitch xi={xi} />}
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
  const r = p.status === 'squad' ? matchRating(p) : p.overall;
  return (
    <Panel ink={UNIT_COLOUR[p.unit]} onClick={() => openPlayer(p.id)} label={`${p.name}, ${rowWords(p, Boolean(starts))}, rated ${r}`}>
      <span className={`ku-row${starts ? ' st' : ''}`}>
        <PlayerCard card={p.card} art={p.art} seed={p.id} player={p} noView />
        <span className="k-col"><b className="nm">{p.name}</b><span className="k-q">{rowWords(p, Boolean(starts))} · {stepName(p.card)}</span>{p.kind === 'exercise' && p.status === 'squad' && <Bar pct={p.fresh ?? 100} c="#8fdcb6" label={`Freshness ${p.fresh ?? 100}%`} />}</span>
        <b className="k-num">{r}</b>
      </span>
    </Panel>
  );
}

/** One unit (no drawing; on the kit): its colour, how many start, then its players best first. */
export function UnitRoute({ unit }: { unit: string }) {
  const players = usePlayers();
  const sheet = useSheet();
  if (!players) return null;
  const u = AXES.find((a) => a === unit);
  if (!u) return <p className="k-q">No such unit.</p>;
  const xiList = sheet?.xi ?? elevenOf(membersOf(new Map(players.map((p) => [p.id, p]))));
  const xi = new Set(xiList.map((x) => x.player));
  const list = players.filter((p) => p.unit === u).sort((a, b) => (a.status === 'left' ? 1 : 0) - (b.status === 'left' ? 1 : 0) || b.overall - a.overall);
  const squad = list.filter((p) => p.status === 'squad');
  const best = squad.length ? Math.max(...squad.map((p) => matchRating(p))) : 0;
  const c = UNIT_COLOUR[u];
  return (
    <div className="k-page" style={uc(u)}>
      <div className="kb-lead">
        <Hero value={squad.length} ink={c} label={squad.length === 1 ? 'player' : 'players'} under={`plays in ${UNIT_WHERE[u]}`} />
        <span className="k-r"><b className="k-num" style={{ color: c }}>{best || '–'}</b><span className="k-q">best tonight</span></span>
      </div>
      <Note>{xiList.filter((x) => x.unit === u).length} start tonight. The number is tonight’s match rating; the bar is freshness.</Note>
      <div className="kb-rows">{list.length ? list.map((p) => <Row key={p.id} p={p} starts={xi.has(p.id)} />) : <p className="k-q">No players yet.</p>}</div>
      <Action wide onClick={() => go('/football/sheet')}>Pick who starts</Action>
    </div>
  );
}

function legendProgress(p: FbPlayer): string {
  if (p.clubLegend) return `Club legend since ${fmtDate(p.clubLegend.on)}: ${p.clubLegend.why === 'apps' ? `${LEGEND_APPS} appearances` : p.clubLegend.why === 'record' ? 'held the record for 26 weeks' : `${LEGEND_SEASONS} seasons`}.`;
  const held = p.recordSince ? Math.floor(daysBetween(p.recordSince, dayOfLogging(Date.now())) / 7) : 0;
  return `${p.apps} of ${LEGEND_APPS} appearances · ${p.seasons.length} of ${LEGEND_SEASONS} seasons${p.recordSince ? ` · record held ${held} of ${LEGEND_RECORD_DAYS / 7} weeks` : ''}.`;
}

/** Why a card sits below its number: the top tiers need time held (owner, 9 Nov). */
function waitNote(p: FbPlayer): string | null {
  const today = dayOfLogging(Date.now());
  const want = stepOf(p.overall);
  if (rankOf(want) <= rankOf(p.card)) return null;
  const weeks = Math.floor((daysBetween(p.signed, today) + 1) / 7);
  if (want.tier === 'icon') return `Icon needs 8 weeks of history at 90+. ${weeks} weeks so far.`;
  if (want.tier === 'legend') {
    const held = p.at95Since ? daysBetween(p.at95Since, today) + 1 : 0;
    return `Legend needs 12 weeks of history and 95+ held for 28 days. ${weeks} weeks so far, ${held} of 28 days held.`;
  }
  return null;
}

/** "▲ 4 in four weeks": how far the overall moved over the last four weeks of its trail. */
function moved(p: FbPlayer): number | null {
  const t = p.trail ?? [];
  if (t.length < 2) return null;
  const last = t[t.length - 1];
  const back = t.find(([d]) => daysBetween(d, last[0]) <= 28) ?? t[0];
  return last[1] - back[1];
}
const nextTier = (o: number): CardTier | undefined => CARD_TIERS.find((t) => TIER_FLOOR[t] > o);

/** One player (board two, "A player"): the card and the rating lead; then the next tier, what it is made of, its season. */
type HistoryOf = Pick<FbPlayer, 'id' | 'name' | 'art' | 'versions' | 'overall' | 'best' | 'kind'>;
/** The big overall, the card's step and unit, and since when it has held that card (board 21, f21-card). */
export function PlayerHead({ p }: { p: Pick<FbPlayer, 'overall' | 'card' | 'unit' | 'versions' | 'signed'> }) {
  const since = p.versions[p.versions.length - 1]?.on ?? p.signed;
  return (
    <div className="pr19">
      <b className="tn" style={{ color: VALUE_INK[valueTier(p.overall, 100)] }}>{p.overall}</b>
      <span>{stepName(p.card)} · {p.unit}<em>{stepName(p.card)} since {fmtDate(since)}</em></span>
    </div>
  );
}
/** Every card this player has held, oldest first, each small with its step crowns in a row; the newest is lit. */
export function CardHistory({ p }: { p: HistoryOf }) {
  if (!p.versions.length) return null;
  const n = p.versions.length;
  return (
    <section className="tr19" aria-labelledby={`hs-${p.id}`}>
      <div className="h"><b id={`hs-${p.id}`}>Card history</b><span>{n} {n === 1 ? 'card' : 'cards'} since {fmtDate(p.versions[0].on)}</span></div>
      <div className="hs19">
        {p.versions.map((v, i) => (
          <div key={`${v.on}${i}`} className={`hs19-v${i === n - 1 ? ' now' : ''}`} style={{ '--d': `${0.1 + i * 0.07}s` } as CSSProperties}>
            <PlayerCard card={v} art={p.art} seed={p.id} player={p} label={`${p.name}, ${stepName(v)} card`} />
            <b className="tn">{v.overall}</b><span>{stepName(v)}</span><span>{fmtDate(v.on)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PlayerPage({ id }: { id: string }) {
  const p = usePlayer(id);
  const r = usePlayerRating(id);
  if (p === undefined) return null;
  if (!p) return <p className="k-q">No such player.</p>;
  const c = UNIT_COLOUR[p.unit];
  const mv = moved(p);
  const nt = nextTier(p.overall);
  const floor = TIER_FLOOR[CARD_TIERS.filter((t) => TIER_FLOOR[t] <= p.overall).pop() ?? 'bronze'];
  const since = p.versions[p.versions.length - 1]?.on ?? p.signed;
  const held = Math.max(0, daysBetween(since, dayOfLogging(Date.now())));
  const cardProps = { card: p.card, art: p.art, seed: p.id, player: p, label: `${p.name}, ${stepName(p.card)} card` };
  return (
    <div className="k-page" style={uc(p.unit)}>
      <div className="pc19"><div className={p.card.tier === 'legend' ? 'pl-hero lg' : undefined}><TiltCard {...cardProps} /></div></div>
      <PlayerHead p={p} />
      <div className="pr19-sub">
        {mv != null && mv !== 0 && <span className="kp-up" style={{ color: mv > 0 ? '#8fc9b0' : '#ff9a76' }}><Icon name={mv > 0 ? 'up' : 'down'} size={16} stroke={2.6} />{Math.abs(mv)} in four weeks</span>}
        <span className="k-q">{p.unit} · {UNIT_WHERE[p.unit]} · {p.apps} {p.apps === 1 ? 'appearance' : 'appearances'}</span>
      </div>
      {nt ? (
        <Panel ink="#f2c46d">
          <div className="k-row"><b>{TIER_FLOOR[nt] - p.overall} more to {TIER_NAME[nt]}</b><span className="k-q">held {held} {held === 1 ? 'day' : 'days'}</span></div>
          <Bar pct={((p.overall - floor) / (TIER_FLOOR[nt] - floor)) * 100} c="#f2c46d" label={`${p.overall} of ${TIER_FLOOR[nt]}`} />
          {waitNote(p) && <span className="k-q">{waitNote(p)}</span>}
        </Panel>
      ) : (
        <Panel ink="#f2c46d"><b>At the top: {stepName(p.card)}</b><span className="k-q">held {held} {held === 1 ? 'day' : 'days'}</span></Panel>
      )}
      <Sect>What {p.name} is made of</Sect>
      {r?.rating ? r.rating.attrs.map((a) => (
        <div key={a.id}>
          <div className="kp-attr"><span>{a.label}</span><Bar pct={a.value} c={c} label={`${a.label} ${a.value}`} /><b>{a.value}</b></div>
          <p className="k-q kb-small" style={{ margin: '0 0 4px' }}>{a.note}</p>
        </div>
      )) : <Note>Nothing in the last 28 days. It keeps its last number until it is logged again.</Note>}
      <Sect>This season</Sect>
      <div className="st19">
        <span><b className="tn">{p.goals}</b>goals</span>
        <span><b className="tn">{p.saves}</b>saves</span>
        <span><b className="tn">{p.kind === 'exercise' ? p.fresh ?? 100 : p.best}</b>{p.kind === 'exercise' ? 'freshness' : 'best'}</span>
      </div>
      <Panel ink="#f2c46d">
        <PanelTop name="Club legend" c="#f2c46d" right={`best ${p.best} on ${fmtDate(p.bestOn)}`} />
        <span className="k-q">{legendProgress(p)}{p.status === 'academy' ? ' Waiting in the academy for its youngster.' : p.status === 'left' ? ' No longer logged.' : ''}</span>
      </Panel>
      <PlayerRotation p={p} />
      <CardHistory p={p} />
      <Action quiet wide onClick={() => openCard(playerCardView(cardProps))}>See the card full screen</Action>
    </div>
  );
}

const CRACK = <svg className="ck8" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><path d="M52 0 L46 30 L56 52 L42 86 L54 140" /><path d="M46 30 L18 22 M56 52 L84 44 M42 86 L12 108 M42 86 L80 112" /></svg>;
const SHARDS: [number, number, number][] = [[-120, -60, 40], [130, -40, -30], [-90, 90, 70], [110, 120, 20], [-30, -140, 110], [40, 150, -60], [-150, 20, 15], [150, 60, 80]];
const BUILD: Partial<Record<string, string>> = { gold: 'bu-gold', prism: 'bu-prism', icon: 'bu-icon', legend: 'bu-legend' };
const DONE_MS: Record<string, number> = { '': 2600, 'bu-gold': 3500, 'bu-prism': 4800, 'bu-icon': 6400, 'bu-legend': 7800 };
/** Legend D (round nine): molten seams spread across the old card in black glass, the rim comes alive, then it breaks. */
const SEAMS = <svg className="sm9" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><path d="M8 18 L34 30 L52 12 L70 34 L94 22" /><path d="M34 30 L28 62 L50 74 L74 58 L70 34" /><path d="M28 62 L6 84 M50 74 L46 104 L20 126 M74 58 L94 92 L66 118 M46 104 L78 132" /></svg>;
const EMBERS: [number, number][] = [[18, 0], [32, 1.2], [50, 0.4], [64, 2], [80, 0.9], [42, 2.6], [72, 3.1], [26, 3.6], [58, 1.7]];

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
  // A tier up plays the new tier's build-up; Legend D has its own (layer 4).
  const build = m.kind === 'tier' ? BUILD[m.tier] ?? '' : '';
  const tierCls = m.tier === 'legend' ? 'legend' : m.tier === 'icon' ? 'icon' : m.tier === 'prism' ? 'prism' : 'gold';
  const play = () => {
    if (go_) return;
    setGo(true);
    window.setTimeout(() => { setDone(true); void seeMoment(p.id); }, DONE_MS[build]);
  };
  const legend = build === 'bu-legend';
  return (
    <div className={`pl-moment ${tierCls}${legend && go_ ? ' lg9' : ''}${legend && done ? ' out' : ''}`}>
      {legend && go_ && <><i className="crn9" aria-hidden="true" />{EMBERS.map(([x, dl]) => <i key={x} className="em9" aria-hidden="true" style={{ left: `${x}%`, animationDelay: `${dl}s` }} />)}</>}
      <span className="pl-kick">{m.kind === 'tier' ? `${TIER_NAME[m.tier]} card` : 'Step up'}</span>
      <h2 className="fb-t">{p.name}</h2>
      {legend && done ? (
        <div className="lgout9"><TiltCard card={m} art={p.art} seed={p.id} player={p} label={`${p.name}, ${stepName(m)} card`} /></div>
      ) : <button key={run} type="button" className={`rb8 ${build}${go_ ? ' go' : ''}`} onClick={play} aria-label={go_ ? `${stepName(m)} card` : `Tap to break the ${stepName(m.from)} card`}>
        <div className="nw8"><PlayerCard card={m} art={p.art} seed={p.id} player={p} /></div>
        <div className="old8">
          <div className="hf8 l"><PlayerCard card={m.from} art={p.art} seed={p.id} player={p} /></div>
          <div className="hf8 r"><PlayerCard card={m.from} art={p.art} seed={p.id} player={p} /></div>
          {CRACK}
          {legend && SEAMS}
        </div>
        {legend && <i className="rim9" />}
        {SHARDS.map(([dx, dy, rz]) => <i key={`${dx}${dy}`} className="sd8" style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, ['--rz' as string]: `${rz}deg` }} />)}
        <i className="fl8" />
      </button>}
      {legend && done && <p className="pl-sub">Drag across the card: the drawing steps out.</p>}
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
