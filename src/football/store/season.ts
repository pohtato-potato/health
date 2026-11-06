// Building a season: fixtures for every tier, the cup draws.
import type { DayKey } from '../../domain/dates';
import { leagueFixtures } from '../calendar';
import { drawBigCup, drawTierCup, TIER_CUP, type CupClub } from '../cups';
import { newContinental } from '../continental';
import { hashSeed, rng } from '../rng';
import { TIERS, type Tier } from '../types';
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
