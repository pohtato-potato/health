// The run-level simulation (ledger O28, spec §15): bots play whole cup runs, choosing paths, rests, purchases, events
// and cards, with basic, good and great decks in every cup. It reports the share of runs that reach the final and win
// it, to keep whole runs fair. Skipped in the normal run:
//   CUP_SIM=1 TZ=UTC npx vitest run tests/football/cup/run-sim.test.ts
// CUP_SIM_OUT=<file> writes the report; CUP_SIM_N sets runs per cell. Decks are invented, never anyone's data.
import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { roleOf } from '../../../src/football/cup/cards';
import { CLUB_TUNE } from '../../../src/football/cup/clubs';
import { SLOTS } from '../../../src/football/cup/deck';
import { eventById } from '../../../src/football/cup/events';
import { CUPS } from '../../../src/football/cup/ladder';
import { TUNE, type MatchState } from '../../../src/football/cup/match';
import {
  buy, canAfford, canUpgrade, choose, enter, leaveStop, pickCard, reachable, rest, restAmount, RUN_TUNE, startRun, summary, takeHeirloom, updateMatch,
  type RunCtx, type RunState,
} from '../../../src/football/cup/run';
import type { Card, Level } from '../../../src/football/cup/types';
import { ABROAD } from '../../../src/football/data/continental';
import { CLUBS } from '../../../src/football/data/load';
import { rng } from '../../../src/football/rng';
import { AXES } from '../../../src/football/types';
import { sensible } from './bots';

const N = Number(process.env.CUP_SIM_N ?? 100);
if (process.env.CUP_TUNE) {
  const t = JSON.parse(process.env.CUP_TUNE) as { TUNE?: object; CLUB?: object; RUN?: object; BANDS?: [number, number][] };
  Object.assign(TUNE, t.TUNE); Object.assign(CLUB_TUNE, t.CLUB); Object.assign(RUN_TUNE, t.RUN);
  t.BANDS?.forEach((b, i) => { CUPS[i].band = b; });
}
const deckOf = (level: Level): Card[] => AXES.flatMap((a) => SLOTS[a].map((kind, k): Card => ({ id: `${a}${k}`, kind, level, axis: a })));
const ctx: RunCtx = {
  clubs: [...CLUBS.map((c) => ({ ...c, rating: c.rating ?? 40 })), ...ABROAD.map((c) => ({ ...c, rating: c.rating ?? 70, abroad: true }))],
  scouted: [], ownTier: 6,
};
const LV = { basic: 0, good: 1, great: 2 } as const;
const ROLE_WANT: Record<string, number> = { finish: 3, pass: 2.5, cover: 2, system: 1.5, stamina: 1, carry: 1, recycle: 0.5 };
const cardValue = (c: Card) => (ROLE_WANT[roleOf(c.kind)] ?? 0) + LV[c.level] * 1.5;

/** One whole run with simple, sensible choices. */
function playRun(cup: number, level: Level, seed: number): RunState {
  const r0 = rng(seed * 31 + cup);
  let r = startRun({ cup, seed, date: '2026-11-11', now: 0, deck: deckOf(level) });
  for (let guard = 0; guard < 80 && !r.over; guard++) {
    if (!r.stop) {
      const opts = reachable(r);
      const score = (id: number) => {
        const k = r.map.nodes[id].kind;
        const low = r.fitness < 30;
        return (k === 'rest' ? (low ? 4 : 1) : k === 'market' ? (r.coins >= 25 ? 3 : 0) : k === 'event' ? 1.5 : k === 'elite' ? (low ? -2 : 0.5) : 0) + r0() * 0.5;
      };
      r = enter(r, opts.sort((a, b) => score(b) - score(a))[0], ctx);
      continue;
    }
    const st = r.stop;
    if (st.kind === 'match' || st.kind === 'elite' || st.kind === 'final') {
      if (!st.offer) {
        let m: MatchState = st.match;
        for (let k = 0; k < 200 && m.phase !== 'done'; k++) m = sensible(m, r0);
        r = updateMatch(r, m);
        continue;
      }
      if (!st.offer.picked) {
        const best = st.offer.cards.map((c, i) => ({ i, v: cardValue(c) })).sort((a, b) => b.v - a.v)[0];
        r = pickCard(r, best && best.v >= 2.5 ? best.i : null);
        continue;
      }
      r = takeHeirloom(r);
      continue;
    }
    if (st.kind === 'rest') {
      const up = r.deck.filter(canUpgrade).sort((a, b) => cardValue(b) - cardValue(a))[0];
      r = r.fitness < 38 || !up ? rest(r, 'rub') : rest(r, 'drills', up.id);
      if (r.stop) r = rest(r, 'rub');
      continue;
    }
    if (st.kind === 'market') {
      const items = st.stock.cards.map((x, i) => ({ i, x })).filter(({ x }) => !x.sold && x.price <= r.coins).sort((a, b) => cardValue(b.x.card) - cardValue(a.x.card));
      const punt = r.deck.find((c) => c.kind === 'punt');
      if (punt && !st.stock.remove.used && r.coins >= st.stock.remove.price) { r = buy(r, { remove: punt.id }); continue; }
      if (st.stock.heirloom && !st.stock.heirloom.sold && r.coins >= st.stock.heirloom.price) { r = buy(r, { heirloom: true }); continue; }
      if (items[0]) { r = buy(r, { card: items[0].i }); continue; }
      r = leaveStop(r);
      continue;
    }
    if (st.kind === 'event') {
      if (st.chose != null) { r = leaveStop(r); continue; }
      const e = eventById(st.event)!;
      const val = (f: (typeof e.choices)[number]['fx']) => (f.coins ?? 0) * 0.3 + (f.fitness ?? 0) * (r.fitness < 30 ? 1.5 : 0.6) + (f.card || f.randomCard ? 4 : 0) + (f.heirloom ? 8 : 0) + (f.upgrade ? 4 : 0) + (f.firstShot ?? 0) + (f.firstCover ?? 0) * 0.5 + (f.see ? 2 : 0) + (f.removePunt ? 3 : 0);
      const best = e.choices.map((c, i) => ({ i, ok: canAfford(r, c.fx), v: val(c.fx) })).filter((x) => x.ok).sort((a, b) => b.v - a.v)[0];
      r = choose(r, best.i);
      continue;
    }
  }
  return r;
}

describe.skipIf(!process.env.CUP_SIM)('cup run simulation', () => {
  it('plays whole runs in every cup', () => {
    const lines = [`# Cup run simulation`, '', `${N} runs a cell, sensible bot. "Final" = reached the final; "Won" = won the cup. Stops = average stops cleared. Rest stops recover ${restAmount({ cup: 1, fitness: 0, heirlooms: [] } as unknown as RunState)} at first.`, ''];
    lines.push('| Cup | Band | Basic: final / won | Good: final / won | Great: final / won | Good: stops, goals for–against a match |', '|---|---|---|---|---|---|');
    for (const cup of CUPS) {
      const cells: string[] = [];
      let extra = '';
      for (const level of ['basic', 'good', 'great'] as Level[]) {
        let fin = 0, won = 0, stops = 0, gf = 0, ga = 0, played = 0;
        for (let i = 0; i < N; i++) {
          const r = playRun(cup.n, level, 1000 + i * 7);
          const s = summary(r);
          if (s.reachedFinal) fin++;
          if (s.result === 'won') won++;
          stops += s.stopsCleared; gf += s.stats.goalsFor; ga += s.stats.goalsAgainst; played += s.stats.played;
        }
        cells.push(`${Math.round((100 * fin) / N)}% / ${Math.round((100 * won) / N)}%`);
        if (level === 'good') extra = `${(stops / N).toFixed(1)}, ${(gf / Math.max(1, played)).toFixed(1)}–${(ga / Math.max(1, played)).toFixed(1)}`;
      }
      lines.push(`| ${cup.n}. ${cup.name} | ${cup.band[0]}–${cup.band[1]} | ${cells.join(' | ')} | ${extra} |`);
    }
    const out = lines.join('\n');
    console.log(out);
    if (process.env.CUP_SIM_OUT) writeFileSync(process.env.CUP_SIM_OUT, out);
  }, 1_800_000);
});
