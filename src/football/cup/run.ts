// A cup run (spec §2, §6–§8): the map, the stops, fitness and coins carried from stop to stop, heirlooms, the card
// after each win. Pure and seeded: every action takes a run and returns a new one, so the store saves after every card
// and every stop and a saved run resumes exactly. A loss ends the run and keeps what it earned.
import type { DayKey } from '../../domain/dates';
import { hashSeed, rng, shuffle } from '../rng';
import { newCard, titleOf } from './cards';
import { clubSpec, SIGNATURE_OF, type ClubSpec } from './clubs';
import { eventById, EVENTS, type EventFx } from './events';
import { heirloomById, HEIRLOOMS, type HeirloomId } from './heirlooms';
import { cupByN, twists } from './ladder';
import { makeMap, type CupMap, type StopKind } from './map';
import { combosOf, newMatch, outcome, TUNE, type MatchMods, type MatchState } from './match';
import { POOL } from './pool';
import type { AnyKind, Card, Level } from './types';

/** A club as the run needs it: the league's data with the rating it plays at in the league. */
export interface ClubLite {
  id: string; name: string; short: string; rating: number; tier: number; style: string; colours: string[]; country: string; kind: string; abroad?: boolean;
}
export interface RunCtx { clubs: ClubLite[]; scouted: string[]; ownTier: number }

/** Every number a run uses that the spec marks (tune). Set by tests/football/cup/run-sim.test.ts. */
export const RUN_TUNE = {
  goalCoins: 3,
  eliteUp: 6, finalUp: 8,
  /** Card levels offered after a win, by stop: [basic, good, great] weights. */
  offerMatch: [0.6, 0.32, 0.08], offerElite: [0.25, 0.5, 0.25],
  price: { basic: 20, good: 28, great: 36 } as Record<Level, number>, heirloomPrice: 32, removePrice: 15, tieShare: 0.8,
  hamper: 0.1, physioBag: 3, ticketStub: 3,
};

export interface Offer { cards: Card[]; heirloom?: HeirloomId; coins: number; picked?: boolean; tookHeirloom?: boolean }
export interface Stock { cards: { card: Card; price: number; sold?: boolean }[]; heirloom?: { id: HeirloomId; price: number; sold?: boolean }; remove: { price: number; used?: boolean } }
export interface MatchStop { kind: 'match' | 'elite' | 'final'; node: number; club: ClubSpec; match: MatchState; offer?: Offer }
export type Stop =
  | MatchStop
  | { kind: 'rest'; node: number }
  | { kind: 'market'; node: number; stock: Stock }
  | { kind: 'event'; node: number; event: string; chose?: number; got?: string };

export interface RunStats {
  played: number; won: number; goalsFor: number; goalsAgainst: number; combos: Record<string, number>; beaten: string[];
  biggest?: { for: number; against: number; club: string }; cards: number;
}
export interface RunState {
  v: 2; cup: number; seed: number; date: DayKey; startedAt: number;
  deck: Card[]; nextId: number;
  map: CupMap;
  /** The last stop cleared, or null before the first. */
  at: number | null;
  path: number[];
  fitness: number; coins: number; heirlooms: HeirloomId[];
  stop: Stop | null;
  /** An event's gift for the next match. */
  gift?: Pick<MatchMods, 'firstShot' | 'firstCover' | 'see'>;
  seenEvents: string[]; met: string[]; lore: string[];
  stats: RunStats;
  over?: 'won' | 'lost' | 'abandoned';
  /** Extra card choices after a win: the manager's eye from the desk's coaching course, set when the run starts. */
  eye?: number;
}

const copy = (r: RunState): RunState => JSON.parse(JSON.stringify(r)) as RunState;
const rand = (r: RunState, ...p: (string | number)[]) => rng(hashSeed('cup-run', String(r.seed), ...p.map(String)));
const maxFit = () => TUNE.fitness;
const NO_UPGRADE: AnyKind[] = ['punt', 'total', 'loan', 'thunderbolt'];
export const canUpgrade = (c: Card) => c.level !== 'great' && !NO_UPGRADE.includes(c.kind);
const up = (lv: Level): Level => (lv === 'basic' ? 'good' : 'great');

export function startRun(o: { cup: number; seed: number; date: DayKey; now: number; deck: Card[]; eye?: number }): RunState {
  const tw = twists(o.cup);
  const deck = o.deck.map((c) => ({ ...c }));
  if (tw.extraPunt) deck.push({ id: 'cup-punt', kind: 'punt', level: 'basic', axis: null });
  return {
    v: 2, cup: o.cup, seed: o.seed >>> 0, date: o.date, startedAt: o.now, deck, nextId: 1,
    map: makeMap(o.seed, o.cup), at: null, path: [], fitness: tw.fitness, coins: 0, heirlooms: [], stop: null,
    seenEvents: [], met: [], lore: [],
    stats: { played: 0, won: 0, goalsFor: 0, goalsAgainst: 0, combos: {}, beaten: [], cards: 0 },
    ...(o.eye ? { eye: o.eye } : {}),
  };
}

/** The stops you may go to next. */
export function reachable(r: RunState): number[] {
  if (r.over || r.stop) return [];
  if (r.at == null) return r.map.nodes.filter((n) => n.row === 0).map((n) => n.id);
  return r.map.nodes[r.at].next;
}
export const stopsCleared = (r: RunState) => r.path.length;
export const isLastFinal = (r: RunState, node: number) => r.map.nodes[node].next.length === 0;

// --- choosing who you play ---------------------------------------------------------------------------------------
function poolFor(r: RunState, ctx: RunCtx): ClubLite[] {
  const cup = cupByN(r.cup);
  let pool = ctx.clubs.filter((c) => c.kind !== 'own' && cup.from(c as never));
  if (pool.length < 12) {
    const more = ctx.clubs.filter((c) => c.kind !== 'own' && !pool.includes(c) && (c.country === '' || c.tier === ctx.ownTier));
    pool = [...pool, ...more];
  }
  return pool;
}
/** The strength a stop plays at: up the cup's band row by row, more for elite clubs and the final. */
export function strengthAt(r: RunState, node: number): number {
  const n = r.map.nodes[node];
  const [lo, hi] = cupByN(r.cup).band;
  const p = n.row / Math.max(1, r.map.rows - 1);
  const tw = twists(r.cup);
  const kind = n.kind;
  return Math.round(lo + (hi - lo) * p + (kind === 'elite' || tw.allElite ? RUN_TUNE.eliteUp : 0) + (kind === 'final' ? RUN_TUNE.finalUp : 0));
}
export function clubFor(r: RunState, node: number, ctx: RunCtx): ClubSpec {
  const n = r.map.nodes[node];
  const target = strengthAt(r, node);
  const tw = twists(r.cup);
  const pool = poolFor(r, ctx).filter((c) => !r.met.includes(c.id));
  const giants = pool.filter((c) => SIGNATURE_OF[c.id]);
  const wantElite = n.kind === 'elite' || n.kind === 'final' || tw.allElite;
  let from = wantElite ? (giants.length ? giants : pool) : pool.filter((c) => !SIGNATURE_OF[c.id]);
  if (!from.length) from = pool.length ? pool : ctx.clubs.filter((c) => c.kind !== 'own');
  const ranked = wantElite && !giants.length
    ? [...from].sort((a, b) => b.rating - a.rating)
    : [...from].sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target));
  const top = ranked.slice(0, wantElite ? Math.min(3, ranked.length) : Math.min(4, ranked.length));
  const c = top[Math.floor(rand(r, 'club', node)() * top.length)];
  return clubSpec({ id: c.id, name: c.name, short: c.short, rating: target, tier: c.tier, style: c.style, colours: c.colours }, ctx.scouted.includes(c.id));
}

// --- going to a stop -----------------------------------------------------------------------------------------------
export function enter(r0: RunState, node: number, ctx: RunCtx): RunState {
  if (!reachable(r0).includes(node)) return r0;
  const r = copy(r0);
  const n = r.map.nodes[node];
  const tw = twists(r.cup);
  if (n.kind === 'match' || n.kind === 'elite' || n.kind === 'final') {
    const club = clubFor(r, node, ctx);
    const elite = n.kind !== 'match' || tw.allElite;
    const mods: MatchMods = { heir: [...r.heirlooms], threatPlus: tw.threatPlus, lineMul: elite ? tw.eliteLine : 1, ...r.gift };
    r.gift = undefined;
    r.met.push(club.id);
    const match = newMatch({ seed: hashSeed('cup-match', String(r.seed), String(node)), deck: r.deck, club, fitness: r.fitness, mods });
    r.stop = { kind: n.kind, node, club, match };
  } else if (n.kind === 'rest') r.stop = { kind: 'rest', node };
  else if (n.kind === 'market') r.stop = { kind: 'market', node, stock: stockFor(r, node) };
  else {
    const left = EVENTS.filter((e) => !r.seenEvents.includes(e.id));
    const pool = left.length ? left : EVENTS;
    const e = pool[Math.floor(rand(r, 'event', node)() * pool.length)];
    r.seenEvents.push(e.id);
    r.stop = { kind: 'event', node, event: e.id };
  }
  return r;
}

/** Clears the stop you are at: it joins the route, and the next row opens. */
function leave(r: RunState) {
  if (!r.stop) return;
  r.at = r.stop.node;
  r.path.push(r.stop.node);
  r.stop = null;
}

// --- a match ---------------------------------------------------------------------------------------------------------
/** Saves the match after a card; once it is over, settles it: a win pays and offers a card, a loss ends the run. */
export function updateMatch(r0: RunState, match: MatchState): RunState {
  const r = copy(r0);
  const st = r.stop;
  if (!st || (st.kind !== 'match' && st.kind !== 'elite' && st.kind !== 'final') || st.offer) return r0;
  st.match = match;
  const o = outcome(match);
  if (!o) return r;
  const s = r.stats;
  s.played++;
  s.goalsFor += match.score[0]; s.goalsAgainst += match.score[1];
  s.cards += match.played ?? 0;
  for (const c of combosOf(match)) s.combos[c] = (s.combos[c] ?? 0) + 1;
  r.fitness = match.fitness;
  if (o === 'L') { r.over = 'lost'; return r; }
  s.won++;
  if (!s.beaten.includes(st.club.id)) s.beaten.push(st.club.id);
  const margin = match.score[0] - match.score[1];
  if (!s.biggest || margin > s.biggest.for - s.biggest.against) s.biggest = { for: match.score[0], against: match.score[1], club: st.club.name };
  if (r.heirlooms.includes('physio-bag')) r.fitness = Math.min(maxFit(), r.fitness + RUN_TUNE.physioBag);
  const tw = twists(r.cup);
  const coins = tw.winCoins + RUN_TUNE.goalCoins * match.score[0] + (r.heirlooms.includes('ticket-stub') ? RUN_TUNE.ticketStub : 0);
  r.coins += coins;
  if (st.kind === 'final' && isLastFinal(r, st.node)) {
    // the final joins the route, and stays on show for the cup-won screen
    r.at = st.node;
    r.path.push(st.node);
    r.over = 'won';
    return r;
  }
  const n = tw.choices + (r.heirlooms.includes('boot-room-key') ? 1 : 0) + (r.eye ?? 0);
  st.offer = { cards: offerCards(r, st.node, n, st.kind === 'match' ? RUN_TUNE.offerMatch : RUN_TUNE.offerElite), coins };
  if (st.kind === 'elite') st.offer.heirloom = heirloomFor(r, st.node);
  return r;
}

function levelFrom(x: number, w: number[]): Level { return x < w[0] ? 'basic' : x < w[0] + w[1] ? 'good' : 'great'; }
function offerCards(r: RunState, node: number, n: number, w: number[]): Card[] {
  const rr = rand(r, 'offer', node);
  const owned = new Set(r.deck.map((c) => c.kind));
  const fresh = POOL.filter((d) => !owned.has(d.id));
  const pick = shuffle(rr, fresh.length >= n ? fresh : POOL).slice(0, n);
  return pick.map((d, i) => newCard(`o${node}-${i}`, d.id, levelFrom(rr(), w)));
}
function heirloomFor(r: RunState, node: number): HeirloomId | undefined {
  const left = HEIRLOOMS.filter((h) => !r.heirlooms.includes(h.id));
  if (!left.length) return undefined;
  return left[Math.floor(rand(r, 'heir', node)() * left.length)].id;
}

const addCard = (r: RunState, c: Card) => { r.deck.push({ ...c, id: `r${r.nextId++}` }); };

/** After a win: take one of the cards (or none), and an elite club's heirloom; then the stop is cleared. */
export function pickCard(r0: RunState, index: number | null): RunState {
  const st = r0.stop;
  if (!st || !('offer' in st) || !st.offer || st.offer.picked) return r0;
  const r = copy(r0);
  const o = (r.stop as MatchStop).offer!;
  o.picked = true;
  if (index != null && o.cards[index]) addCard(r, o.cards[index]);
  if (!o.heirloom) leave(r);
  return r;
}
export function takeHeirloom(r0: RunState): RunState {
  const st = r0.stop;
  if (!st || !('offer' in st) || !st.offer?.picked || !st.offer.heirloom) return r0;
  const r = copy(r0);
  const o = (r.stop as MatchStop).offer!;
  o.tookHeirloom = true;
  r.heirlooms.push(o.heirloom!);
  leave(r);
  return r;
}

// --- the rest stop ---------------------------------------------------------------------------------------------------
/** What the rub-down recovers now. */
export function restAmount(r: RunState): number {
  const share = twists(r.cup).restShare + (r.heirlooms.includes('hamper') ? RUN_TUNE.hamper : 0);
  return Math.min(maxFit() - r.fitness, Math.round(maxFit() * share));
}
export function rest(r0: RunState, choice: 'rub' | 'drills' | 'clear', cardId?: string): RunState {
  if (r0.stop?.kind !== 'rest') return r0;
  const r = copy(r0);
  if (choice === 'rub') r.fitness += restAmount(r);
  else if (choice === 'drills') {
    const c = r.deck.find((x) => x.id === cardId);
    if (!c || !canUpgrade(c)) return r0;
    c.level = up(c.level);
  } else {
    const i = r.deck.findIndex((x) => x.kind === 'punt');
    if (i < 0) return r0;
    r.deck.splice(i, 1);
  }
  leave(r);
  return r;
}

// --- the stall -------------------------------------------------------------------------------------------------------
function stockFor(r: RunState, node: number): Stock {
  const tw = twists(r.cup);
  const k = r.heirlooms.includes('club-tie') ? RUN_TUNE.tieShare : 1;
  const price = (x: number) => Math.round(x * k);
  const cards = offerCards(r, node + 1000, 3 - tw.stallLess, [0.4, 0.4, 0.2]).map((card) => ({ card, price: price(RUN_TUNE.price[card.level]) }));
  const h = heirloomFor(r, node + 1000);
  return { cards, ...(h ? { heirloom: { id: h, price: price(RUN_TUNE.heirloomPrice) } } : {}), remove: { price: price(RUN_TUNE.removePrice) } };
}
export function buy(r0: RunState, what: { card: number } | { heirloom: true } | { remove: string }): RunState {
  if (r0.stop?.kind !== 'market') return r0;
  const r = copy(r0);
  const st = r.stop as Extract<Stop, { kind: 'market' }>;
  if ('card' in what) {
    const item = st.stock.cards[what.card];
    if (!item || item.sold || r.coins < item.price) return r0;
    r.coins -= item.price; item.sold = true; addCard(r, item.card);
  } else if ('heirloom' in what) {
    const h = st.stock.heirloom;
    if (!h || h.sold || r.coins < h.price) return r0;
    r.coins -= h.price; h.sold = true; r.heirlooms.push(h.id);
  } else {
    const i = r.deck.findIndex((c) => c.id === what.remove);
    if (st.stock.remove.used || r.coins < st.stock.remove.price || i < 0 || r.deck.length <= 8) return r0;
    r.coins -= st.stock.remove.price; st.stock.remove.used = true; r.deck.splice(i, 1);
  }
  return r;
}
export function leaveStop(r0: RunState): RunState {
  const k = r0.stop?.kind;
  if (k !== 'market' && !(k === 'event' && (r0.stop as Extract<Stop, { kind: 'event' }>).chose != null)) return r0;
  const r = copy(r0);
  leave(r);
  return r;
}

// --- a story event ---------------------------------------------------------------------------------------------------
export const canAfford = (r: RunState, f: EventFx) => (f.coins ?? 0) >= 0 || r.coins >= -(f.coins ?? 0);
export function choose(r0: RunState, i: number): RunState {
  const st = r0.stop;
  if (st?.kind !== 'event' || st.chose != null) return r0;
  const e = eventById(st.event)!;
  const ch = e.choices[i];
  if (!ch || !canAfford(r0, ch.fx)) return r0;
  const r = copy(r0);
  const s = r.stop as Extract<Stop, { kind: 'event' }>;
  const f = ch.fx;
  const got: string[] = [];
  if (f.coins) r.coins += f.coins;
  if (f.fitness) r.fitness = Math.max(0, Math.min(maxFit(), r.fitness + f.fitness));
  if (f.card) { addCard(r, newCard('e', f.card.kind, f.card.level)); got.push(`${titleOf(f.card.kind)} (${f.card.level})`); }
  if (f.randomCard) {
    const d = POOL[Math.floor(rand(r, 'ecard', s.node)() * POOL.length)];
    addCard(r, newCard('e', d.id, f.randomCard)); got.push(`${d.title} (${f.randomCard})`);
  }
  if (f.heirloom) { const h = heirloomFor(r, s.node + 2000); if (h) { r.heirlooms.push(h); got.push(heirloomById(h)!.name); } }
  if (f.removePunt) { const k = r.deck.findIndex((c) => c.kind === 'punt'); if (k >= 0) r.deck.splice(k, 1); }
  if (f.upgrade) {
    const ok = r.deck.filter(canUpgrade);
    if (ok.length) { const c = ok[Math.floor(rand(r, 'eup', s.node)() * ok.length)]; c.level = up(c.level); got.push(`${titleOf(c.kind)} up to ${c.level}`); }
  }
  if (f.firstShot || f.firstCover || f.see) r.gift = { ...(f.firstShot ? { firstShot: f.firstShot } : {}), ...(f.firstCover ? { firstCover: f.firstCover } : {}), ...(f.see ? { see: true } : {}) };
  if (f.lore) r.lore.push(f.lore);
  s.chose = i;
  s.got = got.join(', ');
  return r;
}

export function abandon(r0: RunState): RunState {
  if (r0.over) return r0;
  return { ...copy(r0), over: 'abandoned' };
}

/** What a finished run hands to the record book and the pay rules. */
export interface RunSummary {
  cup: number; result: 'won' | 'lost' | 'abandoned'; date: DayKey; stopsCleared: number; reachedFinal: boolean; stats: RunStats;
  /** Stops on the route, final included. */
  stops: number;
}
export function summary(r: RunState): RunSummary {
  const finals = r.map.nodes.filter((n) => n.kind === 'final').map((n) => n.id);
  const reachedFinal = r.path.some((p) => finals.includes(p)) || (!!r.stop && finals.includes(r.stop.node));
  return { cup: r.cup, result: r.over ?? 'abandoned', date: r.date, stopsCleared: stopsCleared(r), reachedFinal, stats: r.stats, stops: r.map.rows };
}
export type { StopKind };
