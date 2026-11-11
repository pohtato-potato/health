// The cup-match simulation (ledger O28, spec §15 layer 1): two simple bots play thousands of single matches with
// basic, good and great decks against the clubs of every division and the eight giants. It sets the numbers the spec
// marks (tune). Skipped in the normal run:
//   CUP_SIM=1 TZ=UTC npx vitest run tests/football/cup/cup-sim.test.ts
// CUP_SIM_OUT=<file> writes the report; CUP_SIM_N sets matches per cell. Decks are invented, never anyone's data.
import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { CARD } from '../../../src/football/cup/cards';
import { CLUB_TUNE, clubSpec } from '../../../src/football/cup/clubs';
import { SLOTS } from '../../../src/football/cup/deck';
import { newMatch, outcome, TUNE, type MatchState } from '../../../src/football/cup/match';
import type { Card, Level } from '../../../src/football/cup/types';
import { CLUBS } from '../../../src/football/data/load';
import { rng } from '../../../src/football/rng';
import { AXES, type Axis, type Tier } from '../../../src/football/types';
import { careless, playOut, sensible } from './bots';

const N = Number(process.env.CUP_SIM_N ?? 1000);
// Trying numbers without editing the source: CUP_TUNE='{"TUNE":{"reform":0.5},"CLUB":{"line0":14},"CARD":{"strike":{"basic":6,"good":7,"great":9}}}'
if (process.env.CUP_TUNE) {
  const t = JSON.parse(process.env.CUP_TUNE) as { TUNE?: object; CLUB?: object; CARD?: object };
  Object.assign(TUNE, t.TUNE); Object.assign(CLUB_TUNE, t.CLUB); Object.assign(CARD, t.CARD);
}
const deckOf = (level: Level, punts: Axis[] = [], extraPunts = 0): Card[] => [
  ...AXES.flatMap((a) => SLOTS[a].map((kind, k): Card => (punts.includes(a) ? { id: `${a}${k}`, kind: 'punt', level: 'basic', axis: null } : { id: `${a}${k}`, kind, level, axis: a }))),
  ...Array.from({ length: extraPunts }, (_, k): Card => ({ id: `p${k}`, kind: 'punt', level: 'basic', axis: null })),
];
const DECKS: Record<string, Card[]> = {
  basic: deckOf('basic'), good: deckOf('good'), great: deckOf('great'),
  'good, Rest and Routine unlogged, 2 empty days': deckOf('good', ['Rest', 'Routine'], 2),
};
const TIERS: Tier[] = [6, 5, 4, 3, 2, 1];
const GIANTS = ['atm', 'bar', 'liv', 'bay', 'lee', 'rma', 'mci', 'juv'];

interface Stat { w: number; l: number; pens: number; gf: number; ga: number; fit: number }
function run(deck: Card[], clubs: typeof CLUBS, bot: typeof sensible, seed: string): Stat {
  const st: Stat = { w: 0, l: 0, pens: 0, gf: 0, ga: 0, fit: 0 };
  const r = rng(seed.length * 7919 + 17);
  for (let i = 0; i < N; i++) {
    const c = clubs[i % clubs.length];
    let s: MatchState = newMatch({ seed: (i * 2654435761) >>> 0 ^ seed.length, deck, club: clubSpec(c, false) });
    s = playOut(s, bot, r);
    const o = outcome(s);
    if (o === 'W') st.w++; else st.l++;
    if (s.pens) st.pens++;
    st.gf += s.score[0]; st.ga += s.score[1]; st.fit += TUNE.fitness - s.fitness;
  }
  return st;
}
const pct = (x: number) => `${Math.round((100 * x) / N)}%`;
const avg = (x: number) => (x / N).toFixed(2);

describe.skipIf(!process.env.CUP_SIM)('cup match simulation', () => {
  it('plays the grid', () => {
    const lines: string[] = [`# Cup match simulation`, '', `${N} matches a cell. Win includes penalty wins. Goals are per match (you – them). Fitness lost is per match, from ${TUNE.fitness}.`, ''];
    for (const [botName, bot] of [['sensible', sensible], ['careless', careless]] as const) {
      lines.push(`## ${botName} bot`, '', `| Deck | ${TIERS.map((t) => `Div ${t === 1 ? 'Crown' : t}`).join(' | ')} | Giants |`, `|---|${TIERS.map(() => '---').join('|')}|---|`);
      const goals: string[] = [];
      for (const [name, deck] of Object.entries(DECKS)) {
        const row: string[] = [];
        const grow: string[] = [];
        for (const t of [...TIERS, 0]) {
          const clubs = t ? CLUBS.filter((c) => c.tier === t && c.kind !== 'own' && c.rating != null && !GIANTS.includes(c.id)) : CLUBS.filter((c) => GIANTS.includes(c.id));
          const s = run(deck, clubs, bot, `${botName}${name}${t}`);
          row.push(`${pct(s.w)} (pens ${pct(s.pens)})`);
          grow.push(`${avg(s.gf)}–${avg(s.ga)}, fit −${avg(s.fit)}`);
        }
        lines.push(`| ${name} | ${row.join(' | ')} |`);
        goals.push(`| ${name} | ${grow.join(' | ')} |`);
      }
      lines.push('', `Goals and fitness (${botName}):`, '', `| Deck | ${TIERS.map((t) => `Div ${t === 1 ? 'Crown' : t}`).join(' | ')} | Giants |`, `|---|${TIERS.map(() => '---').join('|')}|---|`, ...goals, '');
    }
    const out = lines.join('\n');
    console.log(out);
    if (process.env.CUP_SIM_OUT) writeFileSync(process.env.CUP_SIM_OUT, out);
  }, 600_000);
});
