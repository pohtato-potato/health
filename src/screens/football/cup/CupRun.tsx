// A cup run, in the tactics-board world (spec §6–§8, §13; visual rounds 1–3): the map with the route lit, and every
// kind of stop: matches (with full time, the card pick and an elite club's heirloom), the physio's room, the stall,
// story events and the final; then the run's end, lost or won. Saved after every card and every stop.
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
import { ArtDefs, Crest, HeirloomDrawing, MoveCard, Silhouette, Slab, Trophy } from './CupArt';
import { MatchScreen, ScoreRow, Sheet, Speaker } from './CupMatch';

const FIT_MAX = TUNE.fitness;
const MARK: Record<StopKind, string> = { match: 'v', elite: '★', rest: '+', market: '?', event: '?', final: '♛' };
const MARK_INK: Record<StopKind, string> = { match: '#d9e8f3', elite: '#f2c46d', rest: '#93c3dc', market: '#f4aedb', event: '#f4aedb', final: '#e9a46a' };
const WHAT: Record<StopKind, string> = {
  match: 'A match against a club from this cup.', elite: 'An elite club: harder, and it pays an heirloom.', rest: 'The physio\'s room: rest, drill a card, or clear your head.',
  market: 'Something on the way: a stall, or a story.', event: 'Something on the way: a stall, or a story.', final: 'The final.',
};
/** "the quarter-final", "round one". */
const theRound = (l: string) => (/^Round/.test(l) ? l.toLowerCase() : `the ${l.toLowerCase()}`);
const labelOf = (r: RunState, node: number) => r.map.labels[r.map.nodes[node].row];

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
        <Slab>NO RUN IN PROGRESS</Slab>
        <p>Start one from the cups.</p>
        <button type="button" className="cup-btn" onClick={() => go('/football/cup', undefined, { replace: true })}><span>To the cups</span></button>
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
      body = <MatchScreen key={st.node} s={st.match} label={`${cup.name} · ${labelOf(r, st.node)}`} commit={(m) => put(updateMatch(r, m))} onAbandon={() => put(abandon(r))} />;
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
function MapScreen({ r, onGo, onAbandon }: { r: RunState; onGo: (id: number) => void; onAbandon: () => void }) {
  const cup = cupByN(r.cup);
  const open = reachable(r);
  const [pick, setPick] = useState<number | null>(open.length === 1 ? open[0] : null);
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
  return (
    <div className="cup-board cup-mapscr">
      <div className="cup-top"><Slab>{cup.name.toUpperCase()}</Slab><span className="cup-q">Fitness {r.fitness} · {r.coins} coins</span></div>
      <svg className="cup-map" viewBox={`0 0 336 ${H}`} role="group" aria-label={`The cup map: ${r.map.rows} stops to the ${r.map.labels[r.map.rows - 1].toLowerCase()}. ${stopsCleared(r)} cleared.`}>
        <defs><filter id="cup-gm" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {firsts.map((row) => (
          <g key={row}>
            <path d={`M4 ${yOf(row) + 29}h328`} stroke="rgba(237,230,218,.14)" />
            <text x="8" y={yOf(row) + 5} fontSize="14" fill={row <= reachedRow + 1 ? '#ede6da' : '#c4c1cf'}>{r.map.labels[row]}</text>
          </g>
        ))}
        {edges.map(([a, b]) => {
          const [x1, y1] = xy(a); const [x2, y2] = xy(b);
          const on = lit(a, b); const nx = fromHere(a, b);
          return <path key={`${a}-${b}`} d={`M${x1} ${y1}L${x2} ${y2}`} stroke={on ? 'var(--cup)' : nx ? '#ede6da' : 'rgba(237,230,218,.3)'} strokeWidth={on ? 4 : nx ? 2.4 : 2} strokeDasharray={on ? undefined : '4 7'} filter={on ? 'url(#cup-gm)' : undefined} />;
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
              {...(can ? { role: 'button', tabIndex: 0, 'aria-label': `${r.map.labels[n.row]}: ${WHAT[n.kind]}`, 'aria-pressed': sel, onClick: () => setPick(n.id), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') setPick(n.id); } } : { 'aria-hidden': true })}>
              {can && <circle cx={x} cy={y} r={26} fill="transparent" />}
              <circle cx={x} cy={y} r={20} fill="#0a1712" stroke={ink} strokeWidth={been || can ? 3 : 1.6} opacity={been || can || n.row > reachedRow ? 1 : 0.5} filter={isHere || sel ? 'url(#cup-gm)' : undefined} />
              {sel && <circle cx={x} cy={y} r={25} fill="none" stroke="#ede6da" strokeWidth="2" />}
              <text x={x} y={y + 5} fontSize="16" fontWeight="700" fill={ink} textAnchor="middle">{MARK[n.kind]}</text>
            </g>
          );
        })}
      </svg>
      <p className="cup-q cup-legend"><b style={{ color: MARK_INK.match }}>v</b> match · <b style={{ color: MARK_INK.elite }}>★</b> elite club · <b style={{ color: MARK_INK.rest }}>+</b> rest · <b style={{ color: MARK_INK.event }}>?</b> stall or story · <b style={{ color: cup.colour }}>♛</b> final</p>
      <div className="cup-dock">
        {pick != null ? (
          <>
            <p><b>{r.map.labels[r.map.nodes[pick].row]}.</b> {WHAT[r.map.nodes[pick].kind]}</p>
            <button type="button" className="cup-btn" onClick={() => onGo(pick)}><span>Go there</span></button>
          </>
        ) : <p className="cup-q">Tap a lit stop to choose where to go next.</p>}
        <div className="cup-acts">
          <button type="button" className="cup-btn ghost" onClick={() => setDeck(true)}><span>Your deck · {r.deck.length}</span></button>
          <button type="button" className="cup-btn ghost" onClick={() => setQuit(true)}><span>Give up</span></button>
        </div>
      </div>
      {deck && <DeckSheet r={r} onClose={() => setDeck(false)} />}
      {quit && (
        <Sheet title="Give up this run?" onClose={() => setQuit(false)}>
          <p>The run ends here and keeps what it earned: {stopsCleared(r)} stop{stopsCleared(r) === 1 ? '' : 's'} cleared counts for the record book{' '}and, if no run has paid today, for research.</p>
          <button type="button" className="cup-btn" onClick={() => { setQuit(false); onAbandon(); }}><span>Give up the run</span></button>
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
        {r.deck.map((c) => <button key={c.id} type="button" className="cup-hc" aria-label={`${cardName(c)}, ${c.level}`} onClick={() => setRead(read?.id === c.id ? null : c)}><MoveCard c={c} /></button>)}
      </div>
      {read && <p><b>{cardName(read)}.</b> {longText(read)}</p>}
    </Sheet>
  );
}
const HeirChip = ({ id }: { id: HeirloomId }) => { const h = heirloomById(id)!; return <span className="cup-chip" title={h.rule}>{h.name}</span>; };

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
      <Slab>FULL TIME · {labelOf(r, st.node).toUpperCase()}</Slab>
      <ScoreRow s={s} />
      {p && <p className="cup-q">{p.us.filter(Boolean).length}–{p.them.filter(Boolean).length} on penalties.</p>}
      <ul className="cup-rows">
        <li><span>Moves built</span><b>{finishes.length}</b></li>
        <li><span>Combinations</span><b>{combos.length ? combos.join(', ') : 'none'}</b></li>
        <li><span>Best chance</span><b>{best || '–'}</b></li>
        <li><span>Fitness</span><b>{s.fit0 ?? r.fitness} → {r.fitness}</b></li>
        <li><span>Coins</span><b>+{st.offer!.coins}</b></li>
      </ul>
      <h2 className="cup-h">Pick one for the run</h2>
      <div className="cup-offer" role="radiogroup" aria-label="Pick one card for the run">
        {st.offer!.cards.map((c, i) => (
          <button key={c.id} type="button" role="radio" aria-checked={sel === i} className={`cup-hc ${sel === i ? 'sel' : ''}`} aria-label={`${cardName(c)}, ${c.level}. ${longText(c)}`} onClick={() => setSel(i)}>
            <MoveCard c={c} />
          </button>
        ))}
      </div>
      {sel != null && <p className="cup-q"><b>{cardName(st.offer!.cards[sel])}.</b> {longText(st.offer!.cards[sel])}</p>}
      <span className="cup-grow" />
      <button type="button" className="cup-btn" disabled={sel == null} onClick={() => onPick(sel)}><span>Take it</span></button>
      <button type="button" className="cup-btn ghost" onClick={() => onPick(null)}><span>Skip the card</span></button>
    </div>
  );
}

function HeirloomScreen({ r, id, from, round, onTake }: { r: RunState; id: HeirloomId; from: string; round: string; onTake: () => void }) {
  const h = heirloomById(id)!;
  const cup = cupByN(r.cup);
  return (
    <div className="cup-board cup-heir">
      <Slab>AN HEIRLOOM</Slab>
      <div className="cup-heir-art"><HeirloomDrawing art={h.art} colour={cup.colour} size={170} /></div>
      <h1 className="cup-h1">{h.name}</h1>
      <p className="cup-rule">{h.rule}</p>
      <p className="cup-q">Won from {from} in {theRound(round)}. Yours until this run ends.</p>
      {r.heirlooms.length > 0 && <div><p className="cup-cap">Carrying</p><div className="cup-chips">{r.heirlooms.map((x) => <HeirChip key={x} id={x} />)}</div></div>}
      <span className="cup-grow" />
      <button type="button" className="cup-btn" onClick={onTake}><span>Take it</span></button>
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
  const arc = (f: number) => { const a = Math.PI * (1 - f); return `${120 + 70 * Math.cos(a)} ${120 - 70 * Math.sin(a)}`; };
  if (drills) {
    return (
      <div className="cup-board cup-rest">
        <ArtDefs />
        <Slab>EXTRA DRILLS</Slab>
        <p>Pick one card to drill. It goes up a level for the rest of the run.</p>
        <div className="cup-grid">
          {up.map((c) => <button key={c.id} type="button" className="cup-hc" aria-label={`Drill ${cardName(c)}, now ${c.level}`} onClick={() => onRest('drills', c.id)}><MoveCard c={c} /></button>)}
        </div>
        <button type="button" className="cup-btn ghost" onClick={() => setDrills(false)}><span>Back to the room</span></button>
      </div>
    );
  }
  return (
    <div className="cup-board cup-rest">
      <Slab>THE PHYSIO'S ROOM</Slab>
      <svg className="cup-room" viewBox="0 0 336 170" role="img" aria-label={`The physio's room. Fitness ${r.fitness} of ${FIT_MAX}.`}>
        <g fill="none" stroke="#f3efe4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity=".85">
          <path d="M12 140h312" opacity=".4" />
          <path d="M196 96h120v10H196zM206 106v34M306 106v34M196 92q8-10 22-8" />
          <path d="M18 112h44v28H18zM28 112v-8h24v8M40 118v16M32 126h16" />
          <path d="M80 140V60h26v80M80 82h26M80 104h26" opacity=".6" />
        </g>
        <path d={`M50 120A70 70 0 0 1 190 120`} transform="translate(0,0)" fill="none" stroke="rgba(237,230,218,.18)" strokeWidth="10" strokeLinecap="round" />
        <path d={`M50 120A70 70 0 0 1 ${arc(Math.min(1, after))}`} fill="none" stroke="#93c3dc" strokeWidth="10" strokeLinecap="round" opacity=".35" />
        <path d={`M50 120A70 70 0 0 1 ${arc(Math.max(0.01, frac))}`} fill="none" stroke="#93c3dc" strokeWidth="10" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px #93c3dc)' }} />
        <text x="120" y="112" fontSize="30" fontWeight="700" fill="#ede6da" textAnchor="middle" fontFamily="var(--serif)">{r.fitness}</text>
        <text x="120" y="132" fontSize="14" fill="#c4c1cf" textAnchor="middle">fitness of {FIT_MAX}</text>
      </svg>
      <Speaker who="The physio" quote={PHYSIO[r.map.nodes[r.stop!.node].id % PHYSIO.length]} />
      <button type="button" className="cup-tile" style={{ '--ink': '#93c3dc' } as CSSProperties} disabled={amount <= 0} onClick={() => onRest('rub')}>
        <RoomIcon k="rub" /><span><b>Rub-down</b><br /><span className="cup-q">{amount > 0 ? `+${amount} fitness, to ${r.fitness + amount}` : 'Already fully fit'}</span></span>
      </button>
      <button type="button" className="cup-tile" style={{ '--ink': AXIS_INK.Routine } as CSSProperties} disabled={!up.length} onClick={() => setDrills(true)}>
        <RoomIcon k="drills" /><span><b>Extra drills</b><br /><span className="cup-q">{up.length ? 'One card goes up a level' : 'Every card is already great'}</span></span>
      </button>
      <button type="button" className="cup-tile" style={{ '--ink': AXIS_INK.Shape } as CSSProperties} disabled={!punt} onClick={() => onRest('clear')}>
        <RoomIcon k="clear" /><span><b>Clear the head</b><br /><span className="cup-q">{punt ? 'Drop one hopeful punt from your deck' : 'No hopeful punts to drop'}</span></span>
      </button>
    </div>
  );
}
function RoomIcon({ k }: { k: 'rub' | 'drills' | 'clear' }) {
  const d = { rub: 'M8 26q10-14 28-6M10 32q12-8 26-2M16 12a5 5 0 1 0 0.01 0', drills: 'M10 34L22 10l12 24M14 26h16M6 38h32', clear: 'M22 6a14 14 0 1 0 0.01 0M16 20l12 0M22 14v12' }[k];
  return <svg viewBox="0 0 44 44" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

// --- the stall -----------------------------------------------------------------------------------------------------
function Stall({ r, st, onBuy, onLeave }: { r: RunState; st: Extract<Stop, { kind: 'market' }>; onBuy: (w: { card: number } | { heirloom: true } | { remove: string }) => void; onLeave: () => void }) {
  const [drop, setDrop] = useState(false);
  const [read, setRead] = useState<number | null>(null);
  const h = st.stock.heirloom;
  const hd = h ? heirloomById(h.id)! : null;
  const canDrop = !st.stock.remove.used && r.coins >= st.stock.remove.price && r.deck.length > 8;
  return (
    <div className="cup-board cup-stall">
      <ArtDefs />
      <div className="cup-top"><Slab>THE STALL</Slab><span className="cup-q">{r.coins} coins</span></div>
      <Speaker who="The kit man" quote="Everything here fell off a kit van. Legally." />
      <div className="cup-offer">
        {st.stock.cards.map((x, i) => (
          <button key={x.card.id} type="button" className={`cup-hc ${read === i ? 'sel' : ''}`} disabled={x.sold}
            aria-label={`${cardName(x.card)}, ${x.card.level}, ${x.price} coins${x.sold ? ', bought' : ''}`} onClick={() => setRead(read === i ? null : i)}>
            <MoveCard c={x.card} off={x.sold || r.coins < x.price} note={x.sold ? 'Bought' : `${x.price} coins`} noteKind="price" />
          </button>
        ))}
      </div>
      {read != null && !st.stock.cards[read].sold && (
        <div className="cup-sig">
          <p><b>{cardName(st.stock.cards[read].card)}.</b> {longText(st.stock.cards[read].card)}</p>
          <button type="button" className="cup-btn" disabled={r.coins < st.stock.cards[read].price} onClick={() => { onBuy({ card: read }); setRead(null); }}>
            <span>{r.coins < st.stock.cards[read].price ? 'Not enough coins' : `Buy for ${st.stock.cards[read].price}`}</span>
          </button>
        </div>
      )}
      {h && hd && (
        <button type="button" className="cup-opt" disabled={h.sold || r.coins < h.price} onClick={() => onBuy({ heirloom: true })}>
          <span className="cup-opt-l"><HeirloomDrawing art={hd.art} colour="#f2c46d" size={44} /><span><b>{hd.name}</b><br /><span className="cup-q">{hd.rule}</span></span></span>
          <b className="n">{h.sold ? 'Yours' : h.price}</b>
        </button>
      )}
      <button type="button" className="cup-opt" disabled={!canDrop} onClick={() => setDrop(true)}>
        <span><b>Leave a card behind</b><br /><span className="cup-q">{st.stock.remove.used ? 'Done' : r.deck.length <= 8 ? 'Your deck is as small as it goes' : 'Take one card out of your deck'}</span></span>
        <b className="n">{st.stock.remove.price}</b>
      </button>
      <span className="cup-grow" />
      <button type="button" className="cup-btn" onClick={onLeave}><span>Walk on</span></button>
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
      <div className="cup-top"><Slab>{e.title.toUpperCase()}</Slab><span className="cup-q">{r.coins} coins · fitness {r.fitness}</span></div>
      {e.cast && <div className="cup-speaker"><Silhouette size={64} /><p className="cup-cap">{CAST_NAME[e.cast] ?? e.cast}</p></div>}
      <p className="cup-read-col">{e.text}</p>
      {e.voices?.map(([a, v]) => <p key={a} className="cup-voice"><b style={{ color: AXIS_INK[a] }}>{a.toUpperCase()}</b> — {v}</p>)}
      {chosen ? (
        <>
          <p className="cup-read-col">{chosen.after}</p>
          {st.got && <p className="cup-q">You got: {st.got}.</p>}
          <span className="cup-grow" />
          <button type="button" className="cup-btn" onClick={onLeave}><span>Walk on</span></button>
        </>
      ) : (
        <div className="cup-col">
          {e.choices.map((c, i) => (
            <button key={i} type="button" className="cup-opt" disabled={!canAfford(r, c.fx)} onClick={() => { onChoose(i); buzz(18); }}>
              <span><b>{c.label}</b><br /><span className="cup-q">{fxWords(c.fx) || 'Nothing changes.'}{!canAfford(r, c.fx) ? ' Not enough coins.' : ''}</span></span>
            </button>
          ))}
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
      <p className="cup-cap">You keep</p>
      <ul className="cup-rows">
        <li><span>Research</span><b>{end ? (end.pay.research ? `+${end.pay.research}` : 'none today') : '…'}</b></li>
        {end?.pay.album && <li><span>Album card</span><b>for reaching the final</b></li>}
        <li><span>Cup record</span><b>{end?.news.length ? end.news.join('. ') : 'counted'}</b></li>
      </ul>
      {end && !end.pay.research && !end.pay.album && <p className="cup-q">{end.pay.why}</p>}
    </>
  );
  if (r.over === 'won') return <CupWon r={r} keep={keep} onLeave={leave} />;
  const title = r.over === 'abandoned' ? 'RUN GIVEN UP' : `OUT IN ${theRound(round).toUpperCase()}`;
  return (
    <div className="cup-board cup-end">
      <Slab>{title}</Slab>
      {last && outcome(last) === 'L' && (
        <>
          <ScoreRow s={last} />
          <p className="cup-say">{last.club.name} {last.score[1]}–{last.score[0]}{last.pens ? ` (${last.pens.them.filter(Boolean).length}–${last.pens.us.filter(Boolean).length} on penalties)` : ''}. The run ends here.</p>
        </>
      )}
      <p className="cup-cap">This run</p>
      <ul className="cup-rows">
        <li><span>Stops cleared</span><b>{s.stopsCleared} of {s.stops}</b></li>
        <li><span>Clubs beaten</span><b>{r.stats.beaten.length}</b></li>
        <li><span>Best scoreline</span><b>{r.stats.biggest ? `${r.stats.biggest.for}–${r.stats.biggest.against} v ${r.stats.biggest.club}` : '–'}</b></li>
      </ul>
      {keep}
      <span className="cup-grow" />
      <button type="button" className="cup-btn" onClick={() => void leave()}><span>Go again</span></button>
      <p className="cup-q">{cup.name}: the cup you were on.</p>
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
      <Slab>WINNERS</Slab>
      <div className="cup-won-trophy"><Trophy kind={cup.silver} colour={cup.colour} size={170} label={cup.name} /></div>
      <h1 className="cup-h1">{cup.name}</h1>
      <p className="cup-sc"><Crest id={OWN} size={32} own={save?.crest} />Brabo United · {wins <= 1 ? 'first win' : `won ${wins} times`}</p>
      {last && <p className="cup-say">Brabo {last.score[0]}–{last.score[1]} {last.club.name} in the final{last.pens ? `, ${last.pens.us.filter(Boolean).length}–${last.pens.them.filter(Boolean).length} on penalties` : ''}.</p>}
      {nextCup && (
        <div className="cup-opt static"><span><b>{nextCup.name} opens</b><br /><span className="cup-q">Its twist: {nextCup.twist}.</span></span><Trophy kind={nextCup.silver} colour={nextCup.colour} size={44} /></div>
      )}
      {keep}
      <span className="cup-grow" />
      <button type="button" className="cup-btn" onClick={() => void onLeave()}><span>To the cabinet</span></button>
    </div>
  );
}

/** A stop's kind for the door: "Fitness 52 · 35 coins, at the quarter-final". */
export function whereNow(r: RunState): string {
  const node = r.stop?.node ?? r.at;
  return node == null ? 'At the start' : `At ${theRound(labelOf(r, node))}`;
}
