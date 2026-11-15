// Building a season: fixtures for every tier, the cup draws.
import type { DayKey } from '../../domain/dates';
import { leagueFixtures } from '../calendar';
import { drawBigCup, drawTierCup, TIER_CUP, type CupClub } from '../cups';
import { newContinental } from '../continental';
import { hashSeed, rng } from '../rng';
import { TIERS, type Tier } from '../types';
import { drawBigCup2, drawPairCup, PAIRCUP_ID } from '../pyramid/cups';
import { POOL, shapeOf } from '../pyramid/shape';
import type { FbClub, FbSeason } from './tables';

export const OWN = 'bra';
/** `top4` is last season's Crown League top four, for the Continental Cup; season 1 takes the four best-rated. */
export function newSeason(no: number, start: DayKey, clubs: FbClub[], deductions: Record<string, number> = {}, top4?: string[]): FbSeason {
  const live = clubs.filter((c) => !c.folded);
  const fixtures = {} as FbSeason['fixtures'];
  const results = {} as FbSeason['results'];
  const tierOf: Record<string, Tier> = {};
  for (const c of live) tierOf[c.id] = c.tier;
  for (const t of TIERS) {
    fixtures[t] = leagueFixtures(live.filter((c) => c.tier === t).map((c) => c.id).sort(), hashSeed('fixtures', String(no), String(t)));
    results[t] = [];
  }
  const cc: CupClub[] = live.map((c) => ({ id: c.id, tier: c.tier, rating: c.rating }));
  const r = rng(hashSeed('cups', String(no)));
  const tiercups: FbSeason['tiercups'] = {};
  for (const t of [2, 4, 6] as Tier[]) tiercups[TIER_CUP[t].id] = drawTierCup(t, cc, OWN, r);
  return { id: no, start, fixtures, results, tierOf, deductions, bigcup: drawBigCup(cc, r), tiercups, playoffs: {}, dates: {},
    continental: newContinental(no, top4 ?? live.filter((c) => c.tier === 1).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).map((c) => c.id).slice(0, 4)) };
}

// ---- World 2 (ledger O38, league spec §6) ----
/**
 * A world-2 season: fixtures for each division of 12 (22 rounds), the Big Cup drawn up from the 96 and the outside
 * pool, Brabo's pair cup, and the continental cup for last season's Crown League top four and clubs from the pool.
 * Pool clubs play no league; folded seats play nothing.
 */
export function newSeason2(no: number, start: DayKey, clubs: FbClub[], deductions: Record<string, number> = {}, top4?: string[]): FbSeason {
  const league = clubs.filter((c) => !c.folded && !c.pool);
  const pool = clubs.filter((c) => !c.folded && c.pool);
  const fixtures = {} as FbSeason['fixtures'];
  const results = {} as FbSeason['results'];
  const tierOf: Record<string, Tier> = {};
  for (const c of league) tierOf[c.id] = c.tier;
  for (const d of shapeOf({ world: 2 }).divisions) {
    fixtures[d] = leagueFixtures(league.filter((c) => c.tier === d).map((c) => c.id).sort(), hashSeed('fixtures', String(no), String(d)));
    results[d] = [];
  }
  const cc: CupClub[] = league.map((c) => ({ id: c.id, tier: c.tier, rating: c.rating }));
  const r = rng(hashSeed('cups', String(no)));
  const bigcup = drawBigCup2(cc, pool.map((c) => ({ id: c.id, tier: POOL as Tier, rating: c.rating })), OWN, r);
  const tiercups: FbSeason['tiercups'] = { [PAIRCUP_ID]: drawPairCup(tierOf[OWN] ?? 8, cc, r) };
  const crown = top4 ?? league.filter((c) => c.tier === 1).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).map((c) => c.id).slice(0, 4);
  return { id: no, world: 2, start, fixtures, results, tierOf, deductions, bigcup, tiercups, playoffs: {}, dates: {}, continental: newContinental(no, crown, pool.map((c) => c.id)) };
}
