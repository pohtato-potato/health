// A cup run, in the tactics-board world (spec §6–§8, §13; visual rounds 1–3): the map with the route lit, and every
// kind of stop: matches (with full time, the card pick and an elite club's heirloom), the physio's room, the stall,
// story events and the final; then the run's end, lost or won. Saved after every card and every stop.
import { cupSpeaker } from '../../../football/cast/bonds';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { buzz } from '../../../audio';
import { canUpgrade, abandon, buy, choose, enter, leaveStop, pickCard, reachable, rest, restAmount, stopsCleared, summary, takeHeirloom, updateMatch, canAfford, type MatchStop, type RunCtx, type RunState, type Stop, type StopKind } from '../../../football/cup/run';
import { cardName, longText } from '../../../football/cup/cards';
import { eventById, fxWords } from '../../../football/cup/events';
import { heirloomById, type HeirloomId } from '../../../football/cup/heirlooms';
import { cupByN, CUPS } from '../../../football/cup/ladder';
import { combosOf, outcome, TUNE } from '../../../football/cup/match';
import { clearRun, loadBook, loadRun, runCtx, saveRun, type CupRun } from '../../../football/cup/store';
import type { Card } from '../../../football/cup/types';
import { useSave } from '../../../football/store/hooks';
import { OWN } from '../../../football/store/season';
import { go } from '../../../router';
import { AXIS_INK } from '../../../ui/inks';
import { Icon } from '../../../ui/Icon';
import { Panel, Sect } from '../../../ui/kit/Kit';
import { ArtDefs, Crest, HeirloomDrawing, LevelMarks, MarkIcon, MoveCard, Silhouette, StopMark, Trophy, type MarkKind } from './CupArt';
import { CupAct, CupHead, MAP_HOW } from './CupKit';
import { MatchScreen, ScoreRow, Sheet, Speaker } from './CupMatch';

const FIT_MAX = TUNE.fitness;
const MARK_INK: Record<StopKind, string> = { match: '#d9e8f3', elite: '#f2c46d', rest: '#93c3dc', market: '#f4aedb', event: '#f4aedb', final: '#e9a46a' };
const WHAT: Record<StopKind, string> = {
  match: 'A match against a club from this cup.', elite: 'An elite club: harder, and it pays an heirloom.', rest: 'The physio\'s room: rest, drill a card, or clear your head.',
  market: 'Something on the way: a stall, or a story.', event: 'Something on the way: a stall, or a story.', final: 'The final.',
};
/** "the quarter-final", "round one". */
const theRound = (l: string) => (/^Round/.test(l) ? l.toLowerCase() : `the ${l.toLowerCase()}`);
const labelOf = (r: RunState, node: number) => r.map.labels[r.map.nodes[node].row];

/** Back to the cups page; the run is saved after every card and every stop. */
const toCups = () => go('/football/cup', undefined, { replace: true });

/** /football/cup/run: the run in progress. */
export function RunRoute() {
  const [rec, setRec] = useState<CupRun | null | undefined>(undefined);
  const [ctx, setCtx] = useState<RunCtx | null>(null);
  useEffect(() => {
    void loadRun().then((x) => setRec(x ?? null));
    void runCtx().then(setCtx);
  }, []);
  if (rec === undefined || !ctx) return null;
  if (!rec) {
    return (
      <div className="cup-board">
        <CupHead back="Cups" onBack={toCups} title="NO RUN IN PROGRESS" />
        <p>Start one from the cups.</p>
        <CupAct onClick={toCups}>To the cups</CupAct>
      </div>
    );
  }
  return <Run key={rec.run.startedAt} rec={rec} ctx={ctx} />;
}

function Run({ rec, ctx }: { rec: CupRun; ctx: RunCtx }) {
  const [r, setR] = useState<RunState>(rec.run);
  const [end, setEnd] = useState<CupRun['end']>(rec.end);
  const busy = useRef(Promise.resolve());
  const put = (n: RunState) => {
    if (n === r) return;
    setR(n);
    // saved in order, after every card and every stop
    busy.current = busy.current.then(async () => { const e = await saveRun(n); if (e) setEnd(e); });
    window.scrollTo(0, 0);
  };
  const cup = cupByN(r.cup);
  const style = { '--cup': cup.colour } as CSSProperties;
  if (r.over) return <div style={style}><RunEnd r={r} end={end} /></div>;
  const st = r.stop;
  let body;
  if (!st) body = <MapScreen r={r} onGo={(id) => put(enter(r, id, ctx))} onAbandon={() => put(abandon(r))} />;
  else if (st.kind === 'match' || st.kind === 'elite' || st.kind === 'final') {
    if (!st.offer) {
      body = <MatchScreen key={st.node} s={st.match} label={`${cup.name} · ${labelOf(r, st.node)}`} commit={(m) => put(updateMatch(r, m))} onLeave={toCups} />;
    } else if (!st.offer.picked) body = <FullTime r={r} st={st} onPick={(i) => put(pickCard(r, i))} />;
    else body = <HeirloomScreen r={r} id={st.offer.heirloom!} from={st.club.name} round={labelOf(r, st.node)} onTake={() => put(takeHeirloom(r))} />;
  } else if (st.kind === 'rest') body = <RestRoom r={r} onRest={(c, id) => put(rest(r, c, id))} />;
  else if (st.kind === 'market') body = <Stall r={r} st={st} onBuy={(w) => put(buy(r, w))} onLeave={() => put(leaveStop(r))} />;
  else if (st.kind === 'event') body = <EventScreen r={r} st={st} onChoose={(i) => put(choose(r, i))} onLeave={() => put(leaveStop(r))} />;
  return <div style={style}>{body}</div>;
}

// --- the map -------------------------------------------------------------------------------------------------------
const ROW_H = 58;
const COLX = [150, 214, 278];
/** The map leads its page: the rounds named down the side, your route lit in the cup's colour, the stops you can reach
 *  breathing. Tap one to see what it is and go there. Nothing is pinned over it. */
function MapScreen({ r, onGo, onAbandon }: { r: RunState; onGo: (id: number) => void; onAbandon: () => void }) {
  const cup = cupByN(r.cup);
  const open = reachable(r);
  const [pick, setPick] = useState<number | null>(null);
  const [deck, setDeck] = useState(false);
  const [quit, setQuit] = useState(false);
  const here = useRef<SVGGElement>(null);
  useEffect(() => { here.current?.scrollIntoView({ block: 'center' }); }, []);
  const H = r.map.rows * ROW_H + 24;
  const yOf = (row: number) => H - 34 - row * ROW_H;
  const xy = (id: number) => { const n = r.map.nodes[id]; return [COLX[n.col], yOf(n.row)] as const; };
  const route = r.path;
  const onRoute = new Set(route);
  const edges = r.map.nodes.flatMap((n) => n.next.map((m) => [n.id, m] as const));
  const lit = (a: number, b: number) => { const i = route.indexOf(a); return i >= 0 && route[i + 1] === b; };
  const fromHere = (a: number, b: number) => r.at === a && open.includes(b);
  // round names down the side: at the lowest row of each round
  const firsts = r.map.labels.map((l, row) => (row === 0 || r.map.labels[row - 1] !== l ? row : -1)).filter((x) => x >= 0);
  const reachedRow = r.at == null ? -1 : r.map.nodes[r.at].row;
  const picked = pick != null ? r.map.nodes[pick] : null;
  return (
    <div className="cup-board cup-mapscr">
      <CupHead back="Cups" onBack={toCups} title={cup.name.toUpperCase()} help={MAP_HOW} />
      <div className="cup-chiprow">
        <span className="cup-stat" style={{ '--ink': '#93c3dc' } as CSSProperties}><b>{r.fitness}</b> fitness</span>
        <span className="cup-stat" style={{ '--ink': '#f2c46d' } as CSSProperties}><b>{r.coins}</b> coins</span>
        <button type="button" className="cup-stat tap" onClick={() => setDeck(true)}><b>{r.deck.length}</b> cards <Icon name="right" size={14} stroke={2.4} /></button>
      </div>
      <svg className="cup-map" viewBox={`0 0 336 ${H}`} role="group" aria-label={`The cup map: ${r.map.rows} stops to the ${r.map.labels[r.map.rows - 1].toLowerCase()}. ${stopsCleared(r)} cleared. Tap a lit stop.`}>
        <defs><filter id="cup-gm" filterUnits="userSpaceOnUse" x="0" y="0" width="336" height={H}><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {firsts.map((row) => (
          <g key={row}>
            <path d={`M4 ${yOf(row) + 29}h328`} stroke="rgba(237,230,218,.14)" />
            <text x="8" y={yOf(row) + 5} fontSize="15" fill={row <= reachedRow + 1 ? '#ede6da' : '#c4c1cf'}>{r.map.labels[row]}</text>
          </g>
        ))}
        {edges.map(([a, b]) => {
          const [x1, y1] = xy(a); const [x2, y2] = xy(b);
          const on = lit(a, b); const nx = fromHere(a, b);
          return <path key={`${a}-${b}`} d={`M${x1} ${y1}L${x2} ${y2}`} stroke={on ? cup.colour : nx ? '#ede6da' : 'rgba(237,230,218,.3)'} strokeWidth={on ? 4 : nx ? 2.4 : 2} strokeDasharray={on ? undefined : '4 7'} filter={on ? 'url(#cup-gm)' : undefined} />;
        })}
        {r.map.nodes.map((n) => {
          const [x, y] = xy(n.id);
          const can = open.includes(n.id);
          const been = onRoute.has(n.id);
          const ink = n.kind === 'final' ? cup.colour : MARK_INK[n.kind];
          const isHere = r.at === n.id;
          const sel = pick === n.id;
          return (
            <g key={n.id} ref={isHere || (r.at == null && n.row === 0 && n.col === 1) ? here : undefined}
              className={`cup-node ${can ? 'can' : ''} ${sel ? 'sel' : ''}`}
              {...(can ? { role: 'button', tabIndex: 0, 'aria-label': `${r.map.labels[n.row]}: ${WHAT[n.kind]}`, onClick: () => setPick(n.id), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') setPick(n.id); } } : { 'aria-hidden': true })}>
              {can && <circle cx={x} cy={y} r={26} fill="transparent" />}
              <circle cx={x} cy={y} r={20} fill={been || isHere ? `color-mix(in srgb, ${ink} 22%, #0a1712)` : '#0a1712'} stroke={ink} strokeWidth={been || can ? 3 : 1.6} opacity={been || can || n.row > reachedRow ? 1 : 0.5} filter={isHere || can ? 'url(#cup-gm)' : undefined} />
              <StopMark kind={n.kind as MarkKind} x={x} y={y} ink={ink} scale={1.15} />
            </g>
          );
        })}
      </svg>
      <p className="cup-legend">
        {(['match', 'elite', 'rest', 'event', 'final'] as MarkKind[]).map((k) => (
          <span key={k}><MarkIcon kind={k} ink={k === 'final' ? cup.colour : MARK_INK[k as StopKind]} size={18} />{{ match: 'match', elite: 'elite club', rest: 'rest', event: 'stall or story', final: 'final' }[k as string]}</span>
        ))}
      </p>
      <p className="cup-q">{open.length ? 'Tap a lit stop to see it and go there.' : ''}</p>
      <CupAct quiet onClick={() => setQuit(true)}>Give up the run</CupAct>
      {picked && (
        <Sheet title={r.map.labels[picked.row]} onClose={() => setPick(null)}>
          <p className="cup-pickline"><MarkIcon kind={picked.kind as MarkKind} ink={picked.kind === 'final' ? cup.colour : MARK_INK[picked.kind]} size={30} /><span>{WHAT[picked.kind]}</span></p>
          <CupAct onClick={() => { const id = picked.id; setPick(null); onGo(id); }}>Go there</CupAct>
        </Sheet>
      )}
      {deck && <DeckSheet r={r} onClose={() => setDeck(false)} />}
      {quit && (
        <Sheet title="Give up this run?" onClose={() => setQuit(false)}>
          <p>The run ends here and keeps what it earned: {stopsCleared(r)} stop{stopsCleared(r) === 1 ? '' : 's'} cleared counts for the record book{' '}and, if no run has paid today, for research.</p>
          <CupAct onClick={() => { setQuit(false); onAbandon(); }}>Give up the run</CupAct>
        </Sheet>
      )}
    </div>
  );
}

function DeckSheet({ r, onClose }: { r: RunState; onClose: () => void }) {
  const [read, setRead] = useState<Card | null>(null);
  return (
    <Sheet title={`Your deck · ${r.deck.length} cards`} onClose={onClose}>
      <ArtDefs />
      {r.heirlooms.length > 0 && <div className="cup-chips">{r.heirlooms.map((h) => <HeirChip key={h} id={h} />)}</div>}
      <div className="cup-grid">
        {r.deck.map((c) => <button key={c.id} type="button" className={`cup-hc ${read?.id === c.id ? 'sel' : ''}`} aria-label={`${cardName(c)}, ${c.level}`} onClick={() => setRead(read?.id === c.id ? null : c)}><MoveCard c={c} /></button>)}
      </div>
      {read && <p><b>{cardName(read)}.</b> {longText(read)}</p>}
    </Sheet>
  );
}
const HeirChip = ({ id }: { id: HeirloomId }) => { const h = heirloomById(id)!; return <span className="cup-chip" title={h.rule}>{h.name}</span>; };

/** A short "Coupe de Belgique · before the last 16" line under a stop's slab. */
function StopUnder({ r }: { r: RunState }) {
  const node = r.stop?.node ?? r.at;
  return <p className="cup-under">{cupByN(r.cup).name}{node != null ? ` · ${theRound(labelOf(r, node))}` : ''}</p>;
}

// --- full time, the card pick and the heirloom ------------------------------------------------------------------
function FullTime({ r, st, onPick }: { r: RunState; st: MatchStop; onPick: (i: number | null) => void }) {
  const s = st.match;
  const [sel, setSel] = useState<number | null>(null);
  const finishes = s.feed.filter((f) => f.chance != null);
  const best = Math.max(0, ...finishes.map((f) => f.chance!));
  const combos = combosOf(s);
  const p = s.pens;
  return (
    <div className="cup-board cup-ft">
      <ArtDefs />
      <CupHead back="Cups" onBack={toCups} title={`FULL TIME · ${labelOf(r, st.node).toUpperCase()}`} />
      <ScoreRow s={s} />
      {p && <p className="cup-q">{p.us.filter(Boolean).length}–{p.them.filter(Boolean).length} on penalties.</p>}
      <Panel ink="#d9e8f3">
        <ul className="cup-rows">
          <li><span>Moves built</span><b>{finishes.length}</b></li>
          <li><span>Combinations</span><b>{combos.length ? `${combos.length} · ${[...new Set(combos)].slice(0, 2).join(', ')}` : '0'}</b></li>
          <li><span>Best chance</span><b>{best || '–'}</b></li>
          <li><span>Fitness</span><b>{s.fit0 ?? r.fitness} to {r.fitness}</b></li>
          <li><span>Coins</span><b>+{st.offer!.coins}</b></li>
        </ul>
      </Panel>
      <Sect>Pick one for the run</Sect>
      <div className="cup-offer" role="radiogroup" aria-label="Pick one card for the run">
        {st.offer!.cards.map((c, i) => (
          <button key={c.id} type="button" role="radio" aria-checked={sel === i} className={`cup-hc ${sel === i ? 'sel' : ''}`} aria-label={`${cardName(c)}, ${c.level}. ${longText(c)}`} onClick={() => setSel(i)}>
            <MoveCard c={c} />
          </button>
        ))}
      </div>
      {sel != null ? <p><b>{cardName(st.offer!.cards[sel])}.</b> <span className="cup-q">{longText(st.offer!.cards[sel])}</span></p> : <p className="cup-q">Tap a card to read it.</p>}
      <span className="cup-grow" />
      {sel != null && <CupAct onClick={() => onPick(sel)}>Take {cardName(st.offer!.cards[sel])}</CupAct>}
      <CupAct quiet={sel != null} onClick={() => onPick(null)}>Skip the card</CupAct>
    </div>
  );
}

function HeirloomScreen({ r, id, from, round, onTake }: { r: RunState; id: HeirloomId; from: string; round: string; onTake: () => void }) {
  const h = heirloomById(id)!;
  const cup = cupByN(r.cup);
  return (
    <div className="cup-board cup-heir">
      <CupHead back="Cups" onBack={toCups} title="AN HEIRLOOM" />
      <div className="cup-heir-art"><HeirloomDrawing art={h.art} colour={cup.colour} size={170} /></div>
      <div><h2 className="cup-h1">{h.name}</h2><p className="cup-under">Won from {from} in {theRound(round)}. Yours until this run ends.</p></div>
      <Panel ink={cup.colour}><p className="cup-rule">{h.rule}</p></Panel>
      {r.heirlooms.length > 0 && <><Sect>Carrying</Sect><div className="cup-chips">{r.heirlooms.map((x) => <HeirChip key={x} id={x} />)}</div></>}
      <span className="cup-grow" />
      <CupAct onClick={onTake}>Take it</CupAct>
    </div>
  );
}

// --- the physio's room ---------------------------------------------------------------------------------------------
const PHYSIO = [
  'Sit down. You look like you ran here.',
  'Ice first, opinions later.',
  'That calf has been talking to me since the tunnel.',
  'Lie still. The table is the only thing in this room that is level.',
];
function RestRoom({ r, onRest }: { r: RunState; onRest: (c: 'rub' | 'drills' | 'clear', id?: string) => void }) {
  const [drills, setDrills] = useState(false);
  const amount = restAmount(r);
  const punt = r.deck.find((c) => c.kind === 'punt');
  const up = r.deck.filter(canUpgrade);
  const frac = r.fitness / FIT_MAX;
  const after = (r.fitness + amount) / FIT_MAX;
  const arc = (f: number) => { const a = Math.PI * (1 - f); return `${150 + 58 * Math.cos(a)} ${124 - 58 * Math.sin(a)}`; };
  if (drills) {
    return (
      <div className="cup-board cup-rest">
        <ArtDefs />
        <CupHead back="The room" onBack={() => setDrills(false)} title="EXTRA DRILLS" />
        <p>Pick one card to drill. It goes up a level for the rest of the run.</p>
        <div className="cup-grid">
          {up.map((c) => <button key={c.id} type="button" className="cup-hc" aria-label={`Drill ${cardName(c)}, now ${c.level}`} onClick={() => onRest('drills', c.id)}><MoveCard c={c} /></button>)}
        </div>
      </div>
    );
  }
  return (
    <div className="cup-board cup-rest">
      <CupHead back="Cups" onBack={toCups} title="THE PHYSIO'S ROOM" />
      <StopUnder r={r} />
      <svg className="cup-room" viewBox="0 0 336 170" role="img" aria-label={`The physio's room. Fitness ${r.fitness} of ${FIT_MAX}.`}>
        <g fill="none" stroke="#f3efe4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity=".85">
          <path d="M12 140h312" opacity=".4" />
          <path d="M228 100h100v10H228zM236 110v30M320 110v30M228 96q8-10 22-8" />
          <path d="M14 112h44v28H14zM24 112v-8h24v8M36 118v16M28 126h16" />
        </g>
        <path d="M92 124A58 58 0 0 1 208 124" fill="none" stroke="rgba(237,230,218,.18)" strokeWidth="10" strokeLinecap="round" />
        <path d={`M92 124A58 58 0 0 1 ${arc(Math.min(1, after))}`} fill="none" stroke="#93c3dc" strokeWidth="10" strokeLinecap="round" opacity=".35" />
        <path className="cup-gauge" d={`M92 124A58 58 0 0 1 ${arc(Math.max(0.01, frac))}`} fill="none" stroke="#93c3dc" strokeWidth="10" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px #93c3dc)' }} />
        <text x="150" y="116" fontSize="30" fontWeight="600" fill="#93c3dc" textAnchor="middle" fontFamily="var(--serif)">{r.fitness}</text>
        <text x="150" y="140" fontSize="15" fill="#c4c1cf" textAnchor="middle">fitness of {FIT_MAX}</text>
      </svg>
      <Speaker who="The physio" quote={PHYSIO[r.map.nodes[r.stop!.node].id % PHYSIO.length]} />
      <Sect>One thing before you go back out</Sect>
      <div className="cup-tiles">
        <RoomTile k="rub" ink="#93c3dc" name="Rub-down" line="Recover fitness" val={amount > 0 ? `${r.fitness} to ${r.fitness + amount}` : 'Fully fit'} off={amount <= 0} onClick={() => onRest('rub')} />
        <RoomTile k="drills" ink={AXIS_INK.Routine} name="Extra drills" line="One card up a level" val={up.length ? <><LevelMarks level="good" size={8} /> up</> : 'All great'} off={!up.length} onClick={() => setDrills(true)} />
        <RoomTile k="clear" ink={AXIS_INK.Shape} name="Clear the head" line="Bin a hopeful punt" val={punt ? '−1 card' : 'No punts'} off={!punt} onClick={() => onRest('clear')} />
      </div>
    </div>
  );
}
function RoomTile({ k, ink, name, line, val, off, onClick }: { k: 'rub' | 'drills' | 'clear'; ink: string; name: string; line: string; val: ReactNode; off: boolean; onClick: () => void }) {
  return (
    <button type="button" className="cup-tile" style={{ '--ink': ink } as CSSProperties} disabled={off} onClick={onClick}>
      <RoomIcon k={k} />
      <b>{name}</b>
      <span className="cup-q">{line}</span>
      <span className="cup-tile-v">{val}</span>
    </button>
  );
}
function RoomIcon({ k }: { k: 'rub' | 'drills' | 'clear' }) {
  const d = { rub: 'M8 26q10-14 28-6M10 32q12-8 26-2M16 12a5 5 0 1 0 0.01 0', drills: 'M10 34L22 10l12 24M14 26h16M6 38h32', clear: 'M12 12h20M16 12l2 24h8l2-24M19 12v-4h6v4' }[k];
  return <svg viewBox="0 0 44 44" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

// --- the stall -----------------------------------------------------------------------------------------------------
function Stall({ r, st, onBuy, onLeave }: { r: RunState; st: Extract<Stop, { kind: 'market' }>; onBuy: (w: { card: number } | { heirloom: true } | { remove: string }) => void; onLeave: () => void }) {
  const [drop, setDrop] = useState(false);
  const [read, setRead] = useState<number | null>(null);
  const h = st.stock.heirloom;
  const hd = h ? heirloomById(h.id)! : null;
  const canDrop = !st.stock.remove.used && r.coins >= st.stock.remove.price && r.deck.length > 8;
  const item = read != null && !st.stock.cards[read].sold ? st.stock.cards[read] : null;
  return (
    <div className="cup-board cup-stall">
      <ArtDefs />
      <CupHead back="Cups" onBack={toCups} title="THE STALL" right={<span className="cup-coins">{r.coins} coins</span>} />
      <Speaker who="The kit man" quote="Everything here fell off a kit van. Legally." />
      <div className="cup-offer">
        {st.stock.cards.map((x, i) => (
          <button key={x.card.id} type="button" className={`cup-hc ${read === i ? 'sel' : ''}`} disabled={x.sold}
            aria-label={`${cardName(x.card)}, ${x.card.level}, ${x.price} coins${x.sold ? ', bought' : ''}`} onClick={() => setRead(read === i ? null : i)}>
            <MoveCard c={x.card} off={x.sold || r.coins < x.price} note={x.sold ? 'Bought' : `${x.price} coins`} noteKind="price" />
          </button>
        ))}
      </div>
      {item ? (
        <Panel ink="#f2c46d">
          <p><b>{cardName(item.card)}.</b> <span className="cup-q">{longText(item.card)}</span></p>
        </Panel>
      ) : <p className="cup-q">Tap a card to read it.</p>}
      {h && hd && (
        <Panel ink="#f2c46d" onClick={h.sold || r.coins < h.price ? undefined : () => onBuy({ heirloom: true })} label={`Buy ${hd.name} for ${h.price} coins`} className={h.sold || r.coins < h.price ? 'cup-dim' : undefined}>
          <span className="cup-opt-l"><HeirloomDrawing art={hd.art} colour="#f2c46d" size={40} /><span className="cup-grow"><b className="k-lb">{hd.name}</b><br /><span className="k-q">{hd.rule}</span></span><b className="cup-price">{h.sold ? 'Yours' : h.price}</b></span>
        </Panel>
      )}
      <Panel ink="#ff9270" onClick={canDrop ? () => setDrop(true) : undefined} label="Leave a card behind" className={canDrop ? undefined : 'cup-dim'}>
        <span className="cup-opt-l"><span className="cup-grow"><b className="k-lb">Leave a card behind</b><br /><span className="k-q">{st.stock.remove.used ? 'Done' : r.deck.length <= 8 ? 'Your deck is as small as it goes' : 'Take one card out of your deck'}</span></span><b className="cup-price">{st.stock.remove.price}</b></span>
      </Panel>
      <span className="cup-grow" />
      {item && <CupAct disabled={r.coins < item.price} onClick={() => { onBuy({ card: read! }); setRead(null); }}>{r.coins < item.price ? 'Not enough coins' : `Buy for ${item.price}`}</CupAct>}
      <CupAct quiet={!!item} onClick={onLeave}>Walk on</CupAct>
      {drop && (
        <Sheet title="Which card stays behind?" onClose={() => setDrop(false)}>
          <ArtDefs />
          <div className="cup-grid">
            {r.deck.map((c) => <button key={c.id} type="button" className="cup-hc" aria-label={`Leave ${cardName(c)} behind`} onClick={() => { onBuy({ remove: c.id }); setDrop(false); }}><MoveCard c={c} /></button>)}
          </div>
        </Sheet>
      )}
    </div>
  );
}

// --- a story event -------------------------------------------------------------------------------------------------
const CAST_NAME: Record<string, string> = {
  physio: 'The physio', chairman: 'The chairman', academy: 'The academy head', 'kit man': 'The kit man', 'rival manager': 'A rival manager',
  'federation official': 'A federation official', supporters: 'The supporters', groundsman: 'The groundsman', scout: 'A scout',
};
function EventScreen({ r, st, onChoose, onLeave }: { r: RunState; st: Extract<Stop, { kind: 'event' }>; onChoose: (i: number) => void; onLeave: () => void }) {
  const e = eventById(st.event)!;
  const chosen = st.chose != null ? e.choices[st.chose] : null;
  return (
    <div className="cup-board cup-event">
      <CupHead back="Cups" onBack={toCups} title={e.title.toUpperCase()} />
      <p className="cup-under">{r.coins} coins · fitness {r.fitness}</p>
      {e.cast && <div className="cup-speaker"><Silhouette size={56} /><p className="cup-cap">{cupSpeaker(e.cast) ?? CAST_NAME[e.cast] ?? e.cast}</p></div>}
      <p className="cup-read-col">{e.text}</p>
      {e.voices?.map(([a, v]) => <p key={a} className="cup-voice"><b style={{ color: AXIS_INK[a] }}>{a.toUpperCase()}</b> — {v}</p>)}
      {chosen ? (
        <>
          <Panel ink="#f4aedb"><p className="cup-read-col">{chosen.after}</p>{st.got && <p className="k-q">You got: {st.got}.</p>}</Panel>
          <span className="cup-grow" />
          <CupAct onClick={onLeave}>Walk on</CupAct>
        </>
      ) : (
        <div className="cup-col">
          {e.choices.map((c, i) => {
            const ok = canAfford(r, c.fx);
            return (
              <Panel key={i} ink="#f4aedb" onClick={ok ? () => { onChoose(i); buzz(18); } : undefined} label={c.label} className={ok ? undefined : 'cup-dim'}>
                <b className="k-lb">{c.label}</b>
                <span className="k-q">{fxWords(c.fx) || 'Nothing changes.'}{!ok ? ' Not enough coins.' : ''}</span>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- the end of a run --------------------------------------------------------------------------------------------------
function RunEnd({ r, end }: { r: RunState; end: CupRun['end'] }) {
  const cup = cupByN(r.cup);
  const s = summary(r);
  const lastNode = r.stop?.node ?? r.at;
  const round = lastNode != null ? labelOf(r, lastNode) : r.map.labels[0];
  const last = r.stop && 'match' in r.stop ? r.stop.match : null;
  const leave = async () => { await clearRun(); go('/football/cup', undefined, { replace: true }); };
  const keep = (
    <>
      <Sect>You keep</Sect>
      <Panel ink={AXIS_INK.Fuel}>
        <ul className="cup-rows">
          <li><span>Research</span><b className="cup-res">{end ? (end.pay.research ? `+${end.pay.research}` : 'none today') : '…'}</b></li>
          {end?.pay.album && <li><span>Album card</span><b>for reaching the final</b></li>}
          <li><span>Cup record</span><b>{end?.news.length ? end.news.join('. ') : 'counted'}</b></li>
        </ul>
        {end && !end.pay.research && !end.pay.album && <p className="k-q">{end.pay.why}</p>}
      </Panel>
    </>
  );
  if (r.over === 'won') return <CupWon r={r} keep={keep} onLeave={leave} />;
  const title = r.over === 'abandoned' ? 'RUN GIVEN UP' : `OUT IN ${theRound(round).toUpperCase()}`;
  return (
    <div className="cup-board cup-end">
      <CupHead back="Cups" onBack={toCups} title={title} />
      {last && outcome(last) === 'L' && (
        <>
          <ScoreRow s={last} />
          <h2 className="cup-h">{last.club.name} {last.score[1]}–{last.score[0]}{last.pens ? ` (${last.pens.them.filter(Boolean).length}–${last.pens.us.filter(Boolean).length} on penalties)` : ''}.</h2>
          <p className="cup-under">The run ends here, in {cup.name}.</p>
        </>
      )}
      <Sect>This run</Sect>
      <Panel ink="#d9e8f3">
        <ul className="cup-rows">
          <li><span>Stops cleared</span><b>{s.stopsCleared} of {s.stops}</b></li>
          <li><span>Clubs beaten</span><b>{r.stats.beaten.length}</b></li>
          <li><span>Best scoreline</span><b>{r.stats.biggest ? `${r.stats.biggest.for}–${r.stats.biggest.against} v ${r.stats.biggest.club}` : '–'}</b></li>
        </ul>
      </Panel>
      {keep}
      <span className="cup-grow" />
      <CupAct onClick={() => void leave()}>Go again</CupAct>
    </div>
  );
}

const CONFETTI = ['#ff7a1a', '#9a74ec', '#ff9a4d', '#c4abff'];
function CupWon({ r, keep, onLeave }: { r: RunState; keep: ReactNode; onLeave: () => void }) {
  const save = useSave();
  const cup = cupByN(r.cup);
  const last = r.stop && 'match' in r.stop ? r.stop.match : null;
  const nextCup = CUPS[r.cup];
  const book = useLiveQuery(loadBook, []);
  const wins = book?.cups[r.cup]?.won ?? 1;
  useEffect(() => { if (save?.buzz !== false) buzz([80, 60, 80, 60, 300]); }, [save?.buzz]);
  return (
    <div className="cup-board cup-won">
      <div className="cup-confetti" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i % 7) * 0.18}s`, '--c': CONFETTI[i % 4], '--r': `${(i * 53) % 360}deg` } as CSSProperties} />)}
      </div>
      <CupHead back="Cups" onBack={toCups} title="WINNERS" />
      <div className="cup-won-trophy"><Trophy kind={cup.silver} colour={cup.colour} size={170} label={cup.name} /></div>
      <div className="cup-centre">
        <h2 className="cup-h1" style={{ color: cup.colour }}>{cup.name}</h2>
        <p className="cup-sc sm"><Crest id={OWN} size={30} own={save?.crest} />Brabo United · {wins <= 1 ? 'first win' : `won ${wins} times`}</p>
        {last && <p className="cup-under">Final: Brabo {last.score[0]}–{last.score[1]} {last.club.name}{last.pens ? `, ${last.pens.us.filter(Boolean).length}–${last.pens.them.filter(Boolean).length} on penalties` : ''}.</p>}
      </div>
      {nextCup && (
        <Panel ink={nextCup.colour}>
          <span className="cup-opt-l"><Trophy kind={nextCup.silver} colour={nextCup.colour} size={40} /><span className="cup-grow"><b className="k-lb">{nextCup.name} is open</b><br /><span className="k-q">Its twist: {nextCup.twist}.</span></span><b className="cup-price">{nextCup.n} of {CUPS.length}</b></span>
        </Panel>
      )}
      {keep}
      <span className="cup-grow" />
      <CupAct onClick={() => void onLeave()}>To the cabinet</CupAct>
    </div>
  );
}

/** A stop's kind for the door: "Fitness 52 · 35 coins, at the quarter-final". */
export function whereNow(r: RunState): string {
  const node = r.stop?.node ?? r.at;
  return node == null ? 'At the start' : `At ${theRound(labelOf(r, node))}`;
}
