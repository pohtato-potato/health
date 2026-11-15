// The 200-season simulation (ledger O38, league spec 2026-11-14 §13 step 3; LG-3 item 12). For a night that plays
// like a 55, a 70 and an 80: place Brabo by the level rule (pyramid/level.ts), then play 200 double round robins in
// that division and check three things.
//   1. A usual night (the level night itself) wins 35 to 45% of its league matches there.
//   2. A night 10 rating points higher, in the same division, wins the title in most seasons.
//   3. A night 10 points lower, in the same division, finishes in the bottom three in most seasons.
// Skipped in the normal run:
//   LEAGUE_SIM=1 TZ=UTC npx vitest run tests/football/league-sim.test.ts
// LEAGUE_SIM_SEASONS sets the seasons (default 200); LEAGUE_SIM_OUT=<file> also writes the report.
// Nights are round, invented even values (levelForRating), nobody's real data. Bonuses as the save carried on 14 Nov:
// the weekly stack at 4, the captain on Pace, Second Wind equipped. Brabo's matches use the match engine with the night
// as its own typical shape; the other clubs' matches use the same result model the league uses (otherMatches.simResult).
// Clubs: 11 per division, evenly spread across its band, styles in turn; each season reseeds the matches, not the clubs.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { braboAbilities } from '../../src/football/data/abilities';
import { STYLES } from '../../src/football/data/load';
import { playMatch, type MatchInput } from '../../src/football/engine';
import { levelForRating } from '../../src/football/matchup';
import { modsFromStyle, reachFor } from '../../src/football/opponent';
import { simResult } from '../../src/football/otherMatches';
import { placeBrabo, type LevelNight, type SimClub } from '../../src/football/pyramid/level';
import { DIVISION_SIZE, PYRAMID } from '../../src/football/pyramid/shape';
import { hashSeed, rng } from '../../src/football/rng';
import { position, standings, type Played } from '../../src/football/table';
import { allAxes } from '../../src/football/types';

const SEASONS = Number(process.env.LEAGUE_SIM_SEASONS ?? 200);
const OWN = 'bra';
const STYLE_IDS = Object.keys(STYLES).sort();

const divisions: Record<number, SimClub[]> = Object.fromEntries(PYRAMID.map((p) => {
  const [lo, hi] = p.band;
  const n = DIVISION_SIZE - 1;
  return [p.no, Array.from({ length: n }, (_, i) => ({ id: `d${p.no}c${i}`, rating: lo + ((hi - lo) * i) / (n - 1), style: STYLE_IDS[(p.no + i) % STYLE_IDS.length] }))];
}));

const nightAt = (rating: number): LevelNight => ({
  values: allAxes(Math.round(levelForRating(rating) * 100) / 100), nights: 28, captain: 'Pace', stack: 4, abilities: braboAbilities(['second-wind']),
});

interface SeasonsOut { wins: number; matches: number; titles: number; bottom3: number; avgPos: number }
/** 200 double round robins of Brabo (this night) and the division's 11 clubs. */
function seasons(night: LevelNight, clubs: SimClub[], tag: string): SeasonsOut {
  const ids = [OWN, ...clubs.map((c) => c.id)];
  const byId = new Map(clubs.map((c) => [c.id, c]));
  const opp = (c: SimClub) => ({ id: c.id, rating: c.rating, reach: reachFor(c.rating), ...modsFromStyle(c.rating, c.style), abilities: [] });
  let wins = 0, matches = 0, titles = 0, bottom3 = 0, posSum = 0;
  for (let s = 0; s < SEASONS; s++) {
    const results: Played[] = [];
    for (const h of ids) for (const a of ids) {
      if (h === a) continue;
      if (h === OWN || a === OWN) {
        const other = byId.get(h === OWN ? a : h)!;
        const input: MatchInput = {
          seed: hashSeed(tag, String(s), h, a), values: night.values, typical: night.values, opp: opp(other), home: h === OWN,
          captain: night.captain, stack: night.stack, abilities: night.abilities, bench: [], pre: [], conds: [], parity: 2,
        };
        const [us, them] = playMatch(input).score;
        results.push({ home: h, away: a, score: h === OWN ? [us, them] : [them, us] });
        matches++;
        if (us > them) wins++;
      } else {
        results.push({ home: h, away: a, score: simResult(byId.get(h)!, byId.get(a)!, rng(hashSeed(tag, String(s), h, a))) });
      }
    }
    const pos = position(standings(results, ids), OWN);
    posSum += pos;
    if (pos === 1) titles++;
    if (pos > ids.length - 3) bottom3++;
  }
  return { wins, matches, titles, bottom3, avgPos: posSum / SEASONS };
}

describe.skipIf(!process.env.LEAGUE_SIM)('200-season league simulation', () => {
  it('places, then plays usual, higher and lower nights', () => {
    const pct = (x: number) => `${Math.round(100 * x)}%`;
    const out = [`League simulation: ${SEASONS} seasons of 22 rounds per row. Invented even nights; 14 Nov bonuses.`,
      'level  placed in             win% usual  titles at +10  bottom 3 at -10  avg place usual/+10/-10'];
    const checks: { level: number; usual: boolean; up: boolean; down: boolean }[] = [];
    for (const level of [55, 70, 80]) {
      const placed = placeBrabo(nightAt(level), divisions);
      const d = placed.division;
      const usual = seasons(nightAt(level), divisions[d], `u${level}`);
      const up = seasons(nightAt(level + 10), divisions[d], `h${level}`);
      const down = seasons(nightAt(level - 10), divisions[d], `l${level}`);
      const rate = usual.wins / usual.matches;
      checks.push({ level, usual: rate >= 0.35 && rate <= 0.45, up: up.titles > SEASONS / 2, down: down.bottom3 > SEASONS / 2 });
      out.push(`${String(level).padEnd(7)}${`${d} ${PYRAMID[d - 1].name}`.padEnd(22)}${pct(rate).padEnd(12)}${pct(up.titles / SEASONS).padEnd(15)}${pct(down.bottom3 / SEASONS).padEnd(17)}${[usual, up, down].map((x) => x.avgPos.toFixed(1)).join(' / ')}`);
      out.push(`       placing win rates by division: ${Object.entries(placed.rates).map(([k, r]) => `${k}:${pct(r!.w)}`).join(' ')}`);
    }
    const text = out.join('\n');
    console.log(text);
    if (process.env.LEAGUE_SIM_OUT) writeFileSync(process.env.LEAGUE_SIM_OUT, `${text}\n`);
    for (const c of checks) expect(c, `level ${c.level}`).toEqual({ level: c.level, usual: true, up: true, down: true });
  }, 1_800_000);
});
