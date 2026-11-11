// Cup runs, layers 3 and 4: the map, the stops, the run, the ladder, the record book and the pay. Made-up decks.
import { describe, expect, it } from 'vitest';
import { cupsOpen, emptyBook, GOOD_DAY, payFor, record } from '../../../src/football/cup/book';
import { EVENTS, fxWords } from '../../../src/football/cup/events';
import { CUPS, twists } from '../../../src/football/cup/ladder';
import { makeMap, paths } from '../../../src/football/cup/map';
import { endSpell, TUNE, type MatchState } from '../../../src/football/cup/match';
import {
  abandon, buy, choose, clubFor, enter, leaveStop, pickCard, reachable, rest, restAmount, startRun, strengthAt, summary, takeHeirloom, updateMatch, type MatchStop, type RunCtx, type RunState,
} from '../../../src/football/cup/run';
import { SLOTS } from '../../../src/football/cup/deck';
import type { Card, Level } from '../../../src/football/cup/types';
import { CLUBS } from '../../../src/football/data/load';
import { ABROAD } from '../../../src/football/data/continental';
import { AXES } from '../../../src/football/types';

const deck = (lv: Level = 'good'): Card[] => AXES.flatMap((a) => SLOTS[a].map((kind, k): Card => ({ id: `${a}${k}`, kind, level: lv, axis: a })));
const ctx: RunCtx = {
  clubs: [...CLUBS.map((c) => ({ ...c, rating: c.rating ?? 40 })), ...ABROAD.map((c) => ({ ...c, rating: c.rating ?? 70, abroad: true }))],
  scouted: ['ant'], ownTier: 6,
};
const run = (cup = 1, seed = 5) => startRun({ cup, seed, date: '2026-11-11', now: 0, deck: deck() });
const nodeOf = (r: RunState, kind: string) => reachable(r).find((id) => r.map.nodes[id].kind === kind);
/** Ends the match in the run with a forced score. */
function force(r: RunState, us: number, them: number): RunState {
  const st = r.stop as Extract<RunState['stop'], { match: MatchState }>;
  const m: MatchState = JSON.parse(JSON.stringify(st.match));
  m.score = [us, them]; m.phase = 'done';
  return updateMatch(r, m);
}
/** Walks to a stop of a kind, winning matches and clearing stops on the way. */
function walkTo(r: RunState, kind: string, guard = 30): RunState {
  for (let i = 0; i < guard && !r.over; i++) {
    const want = nodeOf(r, kind);
    if (want != null) return enter(r, want, ctx);
    const leads = (id: number): boolean => r.map.nodes[id].kind === kind || r.map.nodes[id].next.some(leads);
    r = enter(r, reachable(r).find(leads) ?? reachable(r)[0], ctx);
    r = clear(r);
  }
  throw new Error(`no ${kind}`);
}
function clear(r: RunState): RunState {
  const st = r.stop!;
  if (st.kind === 'match' || st.kind === 'elite' || st.kind === 'final') {
    r = force(r, 2, 0);
    if (r.over) return r;
    r = pickCard(r, null);
    return r.stop ? takeHeirloom(r) : r;
  }
  if (st.kind === 'rest') return rest(r, 'rub');
  if (st.kind === 'market') return leaveStop(r);
  return leaveStop(choose(r, EVENTS.find((e) => e.id === (st as { event: string }).event)!.choices.findIndex((c) => (c.fx.coins ?? 0) >= 0)));
}

describe('the map', () => {
  it('fourteen or fifteen stops on every path, ending in the final; the same seed is the same map', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const m = makeMap(seed, 1);
      expect(makeMap(seed, 1)).toEqual(m);
      for (const p of paths(m)) {
        expect(p.length).toBeGreaterThanOrEqual(14);
        expect(p.length).toBeLessThanOrEqual(15);
        expect(p[p.length - 1]).toBe('final');
      }
    }
  });
  it('keeps the rules: first row all matches, no rest in the first three rows, the stall in the middle third, a rest or event before the final, no elite after elite', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const m = makeMap(seed, 1);
      const body = m.rows - 1;
      for (const n of m.nodes) {
        if (n.row === 0) expect(n.kind).toBe('match');
        if (n.kind === 'rest') expect(n.row).toBeGreaterThanOrEqual(3);
        if (n.kind === 'market') { expect(n.row).toBeGreaterThanOrEqual(Math.floor(body / 3)); expect(n.row).toBeLessThanOrEqual(Math.floor((2 * body) / 3)); }
        if (n.row === body - 1) expect(['rest', 'event']).toContain(n.kind);
        if (n.kind === 'elite') for (const x of n.next) expect(m.nodes[x].kind).not.toBe('elite');
      }
      expect(m.nodes.filter((n) => n.row === 0)).toHaveLength(3);
    }
  });
  it('every path is mostly matches, with elite clubs, rests, the stall and events among them', () => {
    let market = 0, elite = 0, total = 0;
    for (let seed = 1; seed <= 30; seed++) for (const p of paths(makeMap(seed, 1))) {
      total++;
      const k = (x: string) => p.filter((y) => y === x).length;
      expect(k('match') + k('elite')).toBeGreaterThanOrEqual(5);
      if (k('market')) market++;
      if (k('elite')) elite++;
    }
    expect(market / total).toBeGreaterThan(0.4);
    expect(elite / total).toBeGreaterThan(0.6);
  });
  it('rounds are named down the side; the FA Cup adds an elite guard; the Champions League two finals', () => {
    expect(makeMap(3, 1).labels[0]).toBe('Round one');
    expect(makeMap(3, 1).labels.at(-1)).toBe('Final');
    const fa = makeMap(3, 8);
    expect(fa.nodes.filter((n) => n.row === fa.rows - 2).every((n) => n.kind === 'elite')).toBe(true);
    expect(fa.labels.at(-2)).toBe('The guard');
    const cl = makeMap(3, 11);
    expect(cl.labels.slice(-2)).toEqual(['First final', 'Second final']);
  });
});

describe('the ladder', () => {
  it('twelve cups in the approved order, each with its own colour and silverware', () => {
    expect(CUPS.map((c) => c.name)).toEqual(['The Scheldt Shield', 'Coupe de Belgique', 'The Lowlands Lantern', 'Coppa Italia', 'The North Sea Cup', 'DFB-Pokal', 'Copa del Rey', 'The FA Cup', 'The Conference League', 'The Europa League', 'The Champions League', 'The Club World Cup']);
    expect(new Set(CUPS.map((c) => c.colour)).size).toBe(12);
  });
  it('each cup keeps the earlier twists', () => {
    expect(twists(1)).toMatchObject({ eliteLine: 1, restShare: 0.3, extraPunt: false, winCoins: 10, threatPlus: 0, fitness: 60, choices: 3 });
    expect(twists(7)).toMatchObject({ eliteLine: 1.15, restShare: 0.2, extraPunt: true, winCoins: 7, threatPlus: 1, fitness: 50, finalGuard: false });
    expect(twists(12)).toMatchObject({ finalGuard: true, choices: 2, stallLess: 1, twoFinals: true, allElite: true });
    expect(run(4).deck.filter((c) => c.kind === 'punt')).toHaveLength(1);
    expect(run(7).fitness).toBe(50);
  });
  it('opponents come from the cup\'s country; elite stops prefer the giants', () => {
    const r = run(7);
    const first = reachable(r)[0];
    const c = clubFor(r, first, ctx);
    expect(ctx.clubs.find((x) => x.id === c.id)!.country).toBe('ES');
    const elite = r.map.nodes.find((n) => n.kind === 'elite')!;
    expect(['atm', 'bar', 'rma']).toContain(clubFor(r, elite.id, ctx).id);
    expect(clubFor(r, elite.id, ctx).elite).toBeDefined();
  });
  it('a stop plays harder the further up the map, and harder still for elite clubs and the final', () => {
    const r = run(1);
    const by = (row: number) => strengthAt(r, r.map.nodes.find((n) => n.row === row)!.id);
    expect(by(0)).toBe(CUPS[0].band[0]);
    expect(by(r.map.rows - 1)).toBeGreaterThan(by(5));
  });
});

describe('a run', () => {
  it('starts at the bottom with three stops to choose; a match takes the run\'s fitness and heirlooms', () => {
    let r = run();
    expect(reachable(r)).toHaveLength(3);
    r.fitness = 41; r.heirlooms = ['turnstile'];
    r = enter(r, reachable(r)[0], ctx);
    const st = r.stop as Extract<RunState['stop'], { match: MatchState }>;
    expect(st.match.fitness).toBe(41);
    expect(st.match.cover).toBe(TUNE.turnstile);
    expect(reachable(r)).toEqual([]);
  });
  it('a win pays coins and offers three cards; picking one adds it for this run and opens the next row', () => {
    let r = enter(run(), reachable(run())[0], ctx);
    r = force(r, 3, 1);
    expect(r.coins).toBe(10 + 3 * 3);
    const st = r.stop as MatchStop;
    expect(st.offer!.cards).toHaveLength(3);
    const n = r.deck.length;
    r = pickCard(r, 1);
    expect(r.deck).toHaveLength(n + 1);
    expect(r.stop).toBeNull();
    expect(r.path).toHaveLength(1);
    expect(reachable(r).length).toBeGreaterThan(0);
  });
  it('a card can be skipped', () => {
    let r = enter(run(), reachable(run())[0], ctx);
    r = pickCard(force(r, 1, 0), null);
    expect(r.deck).toHaveLength(12);
  });
  it('a loss ends the run and keeps what it earned', () => {
    let r = enter(run(), reachable(run())[0], ctx);
    r = pickCard(force(r, 2, 0), 0);
    r = enter(r, reachable(r).find((id) => r.map.nodes[id].kind === 'match') ?? reachable(r)[0], ctx);
    if (r.stop?.kind !== 'match' && r.stop?.kind !== 'elite') return;
    const coins = r.coins;
    r = force(r, 0, 1);
    expect(r.over).toBe('lost');
    expect(r.coins).toBe(coins);
    const s = summary(r);
    expect(s.result).toBe('lost');
    expect(s.stopsCleared).toBe(1);
  });
  it('fitness carries from the match into the run', () => {
    let r = enter(run(), reachable(run())[0], ctx);
    const st = r.stop as Extract<RunState['stop'], { match: MatchState }>;
    let m = st.match;
    m.intents[0].threat = 5;
    m = endSpell(m);
    r = updateMatch(r, m);
    expect(r.fitness).toBe(60);
    m.score = [1, 0]; m.phase = 'done';
    r = updateMatch(r, m);
    expect(r.fitness).toBe(m.fitness);
  });
  it('an elite win gives an heirloom after the card', () => {
    let r = walkTo(run(1, 9), 'elite');
    r = force(r, 2, 1);
    const st = r.stop as MatchStop;
    expect(st.offer!.heirloom).toBeDefined();
    r = pickCard(r, null);
    expect(r.stop).not.toBeNull();
    r = takeHeirloom(r);
    expect(r.heirlooms).toHaveLength(1);
    expect(r.stop).toBeNull();
  });
  it('the rest stop: recover 30% of fitness, or raise a card a level, or bin a hopeful punt', () => {
    let r = walkTo(run(1, 4), 'rest');
    r.fitness = 20; r.heirlooms = [];
    expect(restAmount(r)).toBe(18);
    expect(rest(r, 'rub').fitness).toBe(38);
    const c = r.deck.find((x) => x.level !== 'great')!;
    expect(rest(r, 'drills', c.id).deck.find((x) => x.id === c.id)!.level).toBe('great');
    expect(rest(r, 'clear')).toBe(r); // no punt to bin
    const p = { ...r, deck: [...r.deck, { id: 'pp', kind: 'punt', level: 'basic', axis: null } as Card] };
    expect(rest(p, 'clear').deck.some((x) => x.kind === 'punt')).toBe(false);
  });
  it('the stall: buy a card or an heirloom with coins, or pay to leave a card behind', () => {
    let r = walkTo(run(1, 6), 'market');
    const st = r.stop as Extract<RunState['stop'], { kind: 'market' }>;
    expect(st.stock.cards).toHaveLength(3);
    r.coins = 100;
    const n = r.deck.length;
    r = buy(r, { card: 0 });
    expect(r.deck).toHaveLength(n + 1);
    expect(r.coins).toBe(100 - st.stock.cards[0].price);
    expect(buy(r, { card: 0 })).toBe(r);
    r = buy(r, { remove: r.deck[0].id });
    expect(r.deck).toHaveLength(n);
    const h = r.heirlooms.length;
    r = buy(r, { heirloom: true });
    expect(r.heirlooms).toHaveLength(h + 1);
    r = leaveStop(r);
    expect(r.stop).toBeNull();
  });
  it('you cannot buy what you cannot pay for', () => {
    const r = walkTo(run(1, 6), 'market');
    r.coins = 0;
    expect(buy(r, { card: 0 })).toBe(r);
  });
  it('a story event: a choice applies what it says, and a choice you cannot pay for is refused', () => {
    let r = walkTo(run(1, 2), 'event');
    const st = r.stop as Extract<RunState['stop'], { kind: 'event' }>;
    const e = EVENTS.find((x) => x.id === st.event)!;
    const i = e.choices.findIndex((c) => (c.fx.coins ?? 0) >= 0);
    const before = r.coins;
    r.coins = 0;
    const pays = e.choices.findIndex((c) => (c.fx.coins ?? 0) < 0);
    if (pays >= 0) expect(choose(r, pays)).toBe(r);
    r.coins = before;
    r = choose(r, i);
    expect((r.stop as typeof st).chose).toBe(i);
    if (e.choices[i].fx.coins) expect(r.coins).toBe(before + e.choices[i].fx.coins!);
    r = leaveStop(r);
    expect(r.stop).toBeNull();
  });
  it('an event\'s gift reaches the next match', () => {
    const r = walkTo(run(1, 2), 'event');
    r.gift = { firstCover: 6 };
    const n = reachable(leaveStop(choose(r, 0)));
    void n;
    const m = enter({ ...r, stop: null, gift: { firstCover: 6 }, at: r.stop!.node }, r.map.nodes[r.stop!.node].next.find((x) => r.map.nodes[x].kind === 'match') ?? -1, ctx);
    if (m.stop && 'match' in m.stop) expect(m.stop.match.cover).toBeGreaterThanOrEqual(6);
  });
  it('winning the final wins the cup', () => {
    let r = run(1, 3);
    for (let i = 0; i < 40 && !r.over; i++) { r = enter(r, reachable(r)[0], ctx); r = clear(r); }
    expect(r.over).toBe('won');
    expect(summary(r)).toMatchObject({ result: 'won', reachedFinal: true });
    expect(summary(r).stopsCleared).toBe(r.map.rows);
  });
  it('a run can be abandoned and keeps what it had', () => {
    let r = enter(run(), reachable(run())[0], ctx);
    r = pickCard(force(r, 2, 0), null);
    const a = abandon(r);
    expect(a.over).toBe('abandoned');
    expect(a.coins).toBe(r.coins);
  });
  it('the same seed is the same run', () => {
    expect(enter(run(1, 8), reachable(run(1, 8))[0], ctx)).toEqual(enter(run(1, 8), reachable(run(1, 8))[0], ctx));
  });
});

describe('events', () => {
  it('thirty, each with two or three choices that say what they cost and give', () => {
    expect(EVENTS).toHaveLength(30);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(30);
    for (const e of EVENTS) {
      expect(e.choices.length).toBeGreaterThanOrEqual(2);
      expect(e.choices.length).toBeLessThanOrEqual(3);
      expect((e.voices ?? []).length).toBeLessThanOrEqual(2);
      for (const c of e.choices) expect(fxWords(c.fx).length).toBeGreaterThan(5);
    }
  });
  it('never mention betting, drink or anything religious', () => {
    const all = JSON.stringify(EVENTS).toLowerCase();
    for (const w of ['bet ', 'betting', 'odds', 'beer', 'pint', 'wine', 'drunk', 'pub', 'church', 'pray', 'god ', 'blessing', 'diet', 'skip a meal']) expect(all).not.toContain(w);
  });
  it('words for a choice come from what it does', () => {
    expect(fxWords({ coins: -10, firstCover: 4 })).toBe('Pay 10 coins. Next match: 4 cover in the first spell.');
  });
});

describe('the record book and the pay', () => {
  const sum = (o: Partial<ReturnType<typeof summary>> = {}) => ({ cup: 1, result: 'lost' as const, date: '2026-11-11', stopsCleared: 7, reachedFinal: false, stops: 14,
    stats: { played: 5, won: 4, goalsFor: 9, goalsAgainst: 3, combos: { 'One-two': 4 }, beaten: ['ant', 'ker'], biggest: { for: 4, against: 0, club: 'Antigoon FC' }, cards: 120 }, ...o });
  it('only the first run to end each day pays, and never as much as a good league day', () => {
    const p = payFor(emptyBook(), sum({ result: 'won', stopsCleared: 14, reachedFinal: true }), '2026-11-11');
    expect(p.research).toBe(GOOD_DAY - 1);
    expect(p.research).toBeLessThan(GOOD_DAY);
    expect(p.album).toBe(true);
    const { book } = record(emptyBook(), sum(), '2026-11-11', true);
    expect(payFor(book, sum(), '2026-11-11')).toMatchObject({ research: 0, album: false });
    expect(payFor(book, sum(), '2026-11-12').research).toBeGreaterThan(0);
  });
  it('a short run pays 1 for every two stops cleared', () => {
    expect(payFor(emptyBook(), sum({ stopsCleared: 3 }), '2026-11-11').research).toBe(1);
    expect(payFor(emptyBook(), sum({ stopsCleared: 1 }), '2026-11-11').research).toBe(0);
  });
  it('every run counts for the book: furthest stop, fastest win, biggest scoreline, clubs beaten, combinations', () => {
    let { book } = record(emptyBook(), sum(), '2026-11-11', true);
    ({ book } = record(book, sum({ result: 'won', stopsCleared: 14, stats: { ...sum().stats, cards: 90, beaten: ['laa'], biggest: { for: 5, against: 0, club: 'Laagwater SV' } } }), '2026-11-11', false));
    expect(book.cups[1]).toMatchObject({ furthest: 14, won: 1, runs: 2, fastest: 90 });
    expect(book.biggest).toMatchObject({ for: 5, against: 0 });
    expect(book.beaten.sort()).toEqual(['ant', 'ker', 'laa']);
    expect(book.combos['One-two']).toBe(8);
    expect(book.runs).toBe(2);
  });
  it('winning a cup opens the next', () => {
    expect(cupsOpen(emptyBook())).toBe(1);
    const { book } = record(emptyBook(), sum({ result: 'won', stopsCleared: 14 }), '2026-11-11', true);
    expect(cupsOpen(book)).toBe(2);
  });
});
