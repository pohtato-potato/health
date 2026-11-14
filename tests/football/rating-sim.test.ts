// The rating fix simulation (14 Nov, ledger O38, league spec §4): win/draw/loss before and after the fix, for a usual,
// a weaker and a best night against the eight rating bands of spec §5, for nights that play like 55, 70 and 80, and for
// the best night measured against the usual one as its typical shape ("better than usual counts twice"). Skipped in
// the normal run:
//   RATING_SIM=1 TZ=UTC npx vitest run tests/football/rating-sim.test.ts
// The nights here are round, invented values. To run it on real nights, put them in a JSON file OUTSIDE the repo,
// {"usual": {...}, "weaker": {...}, "best": {...}}, each six axes, and set RATING_SIM_NIGHTS=<path>. Never commit it.
// RATING_SIM_N sets matches per night and band; RATING_SIM_OUT=<file> also writes the report.
// Bonuses as the save carried on 14 Nov: the weekly stack at 4, the captain on Pace, Second Wind equipped. No tree,
// traits, loans, bench, squad condition or club abilities. Clubs: 12 per band, evenly spread, styles in turn.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { parityRating, playMatch, type MatchInput, type ParityRules } from '../../src/football/engine';
import { braboAbilities } from '../../src/football/data/abilities';
import { STYLES } from '../../src/football/data/load';
import { levelForRating } from '../../src/football/matchup';
import { modsFromStyle, reachFor, type Opponent } from '../../src/football/opponent';
import { allAxes, type AxisValues } from '../../src/football/types';

const N = Number(process.env.RATING_SIM_N ?? 2400);
const BANDS: [string, number, number][] = [
  ['Crown', 99, 104], ['Div 2', 94, 99], ['Div 3', 88, 93], ['Div 4', 83, 88],
  ['Div 5', 77, 82], ['Div 6', 72, 77], ['Div 7', 67, 72], ['Div 8', 62, 67],
];
const STYLE_IDS = Object.keys(STYLES).sort();
const clubsOf = (lo: number, hi: number): Opponent[] => Array.from({ length: 12 }, (_, i) => {
  const rating = lo + ((hi - lo) * i) / 11;
  return { id: `b${i}`, rating, reach: reachFor(rating), ...modsFromStyle(rating, STYLE_IDS[i % STYLE_IDS.length]), abilities: [] };
});
const V = (Pace: number, Power: number, Fuel: number, Rest: number, Routine: number, Shape: number): AxisValues => ({ Pace, Power, Fuel, Rest, Routine, Shape });
const INVENTED = { usual: V(16, 15, 17, 13, 16, 18), weaker: V(15, 5, 15, 11, 13, 14), best: V(18, 16, 19, 15, 18, 20) };

function wdl(values: AxisValues, clubs: Opponent[], rules: ParityRules, typical?: AxisValues): string {
  let w = 0, d = 0, l = 0;
  for (let i = 0; i < N; i++) {
    const input = {
      seed: 3001 + i * 7919, values, opp: clubs[i % clubs.length], home: i % 2 === 0, captain: 'Pace', stack: 4,
      abilities: braboAbilities(['second-wind']), bench: [], pre: [], conds: [], parity: rules, ...(typical ? { typical } : {}),
    } as MatchInput;
    const [a, b] = playMatch(input).score;
    if (a > b) w++; else if (a === b) d++; else l++;
  }
  const p = (x: number) => Math.round((100 * x) / N);
  return `${p(w)}/${p(d)}/${p(l)}`;
}
const pad = (s: string, n = 9) => s.padEnd(n);

describe.skipIf(!process.env.RATING_SIM)('rating fix simulation', () => {
  it('prints before and after', () => {
    const nights = process.env.RATING_SIM_NIGHTS ? JSON.parse(readFileSync(process.env.RATING_SIM_NIGHTS, 'utf8')) as typeof INVENTED : INVENTED;
    const even = (r: number) => allAxes(Math.round(levelForRating(r) * 100) / 100);
    const rows: [string, AxisValues, AxisValues?][] = [
      ['usual night', nights.usual], ['weaker night', nights.weaker], ['best night', nights.best],
      ['best v usual as typical', nights.best, nights.usual],
      ['a 55 night', even(55)], ['a 70 night', even(70)], ['a 80 night', even(80)],
    ];
    const clubs = BANDS.map(([, lo, hi]) => clubsOf(lo, hi));
    const out = [`Rating fix simulation: ${N} matches per night and band, W/D/L %. ${process.env.RATING_SIM_NIGHTS ? 'Nights from a file outside the repo.' : 'Invented nights.'}`,
      `${pad('', 34)}${BANDS.map(([n, lo, hi]) => pad(`${n} ${lo}-${hi}`, 13)).join('')}`];
    for (const [name, values, typical] of rows) {
      out.push(`${name}: ${Object.values(values).map((x) => x.toFixed(2).replace(/\.?0+$/, '')).join(' ')}  rated ${parityRating(values, 1).toFixed(1)} before, ${parityRating(values).toFixed(1)} after`);
      for (const rules of [1, 2] as ParityRules[]) out.push(`  ${pad(rules === 1 ? 'before' : 'after', 32)}${clubs.map((c) => pad(wdl(values, c, rules, typical), 13)).join('')}`);
    }
    const text = out.join('\n');
    console.log(text);
    if (process.env.RATING_SIM_OUT) writeFileSync(process.env.RATING_SIM_OUT, `${text}\n`);
  }, 900_000);
});
