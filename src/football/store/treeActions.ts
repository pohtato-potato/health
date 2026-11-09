// Taps on the tree. Each writes save.treeUser only, inside one transaction, so a match playing at the same time
// never loses a tap (play.ts keeps treeUser as a user key). Also the read the tree's screens use.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { dayOfLogging, weekStart, type DayKey } from '../../domain/dates';
import { BOON_CHOICES, BOUNTIES_PICKED } from '../content/season';
import { PACK_ITEMS } from '../content/packs';
import type { EraId } from '../content/types';
import { rememberClubs } from '../data/load';
import { openPack, recordOpen, runningLowNow, poolCounts, type PoolId } from '../tree/packs';
import { activeFor, builtOf, engineOf, seasonFacts, userOf } from './tree';
import { standings } from '../table';
import type { SeasonFacts } from '../tree/season';
import { research, ruleValue, settle } from '../tree/research';
import { boonOffer, boonPickOpen, bountiesPicked, bountyOffer } from '../tree/season';
import { emptyUser, type TreeUser } from '../tree/types';
import { OWN } from './season';
import type { FbBundle, FbSave, FbSeason } from './tables';
import type { Tier } from '../types';

async function editUser(f: (u: TreeUser, s: FbSave, bundles: FbBundle[]) => TreeUser | undefined) {
  await db.transaction('rw', db.fbSave, db.fbBundles, async () => {
    const s = await db.fbSave.get('save');
    if (!s) return;
    const next = f(s.treeUser ?? emptyUser(), s, await db.fbBundles.toArray());
    if (next) await db.fbSave.put({ ...s, treeUser: next });
  });
}
const today = () => dayOfLogging(Date.now());

/** Research a tech now if the bank covers it, else save for it (it completes by itself once it can). */
export const researchTech = (id: string, on: DayKey = today()) => editUser((u, s) => research(engineOf(s), u, id, on).user);
/** Stop saving for a tech. */
export const clearTarget = () => editUser((u) => ({ ...u, target: undefined }));

/** Pick a boon at an open pick. */
export const pickBoon = (id: string) => editUser((u, s, b) => {
  const pick = boonPickOpen(u, s.season, s.day, engineOf(s).boonExtra?.[s.season] ?? 0);
  if (!pick || s.phase !== 'season') return undefined;
  const offer = boonOffer(u, s.season, pick, ruleValue(activeFor(s, b), 'boon-choices', BOON_CHOICES));
  if (!offer.some((x) => x.id === id)) return undefined;
  return { ...u, boons: [...u.boons, { season: s.season, pick, id }] };
});

/** Pick up to three of this week's six bounties. Picks are kept; they can't be swapped out. */
export const pickBounty = (id: string, on: DayKey = today()) => editUser((u) => {
  const week = weekStart(on);
  const have = bountiesPicked(u, week);
  if (have.includes(id) || have.length >= BOUNTIES_PICKED || !bountyOffer(week).some((b) => b.id === id)) return undefined;
  return { ...u, bounties: [...u.bounties.filter((b) => b.week !== week), { week, ids: [...have, id] }] };
});

/** Open a pack: five items (six with the Bigger packs boon). Duplicates become research, and the bank settles. */
export const openPackNow = (packId: string, on: DayKey = today()) => editUser((u, s, b) => {
  const eng = engineOf(s);
  const pack = eng.packs.find((p) => p.id === packId);
  if (!pack || u.opened.some((o) => o.id === packId)) return undefined;
  const n = ruleValue(activeFor(s, b), 'packs-items', PACK_ITEMS);
  return settle(eng, recordOpen(pack, u, openPack(pack, u, n), on), on).user;
});

export const seeEra = (e: EraId) => editUser((u) => (u.seenEras.includes(e) ? undefined : { ...u, seenEras: [...u.seenEras, e] }));
export const seeEureka = (id: string) => editUser((u) => (u.seenEurekas.includes(id) ? undefined : { ...u, seenEurekas: [...u.seenEurekas, id] }));
/** The running-low notice was shown: not again until the pool grows. */
export const seeRunningLow = (pool: PoolId) => editUser((u, s) => {
  const size = poolCounts(u, engineOf(s).bountiesDone)[pool].size;
  return { ...u, lowShown: { ...u.lowShown, [pool]: size } };
});

export interface TreeView {
  save: FbSave;
  season: FbSeason | undefined;
  tier: Tier;
  bundles: FbBundle[];
  built: string[];
  today: DayKey;
  low: PoolId[];
  /** The season so far, as the board reads it. */
  facts?: SeasonFacts;
}
export async function loadTree(now = Date.now()): Promise<TreeView | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  rememberClubs(await db.fbClubs.toArray());
  const season = await db.fbSeasons.get(save.season);
  const bundles = await db.fbBundles.toArray();
  const u = userOf(save);
  const tier = (season?.tierOf[OWN] ?? 6) as Tier;
  let facts: SeasonFacts | undefined;
  if (season) {
    const rows = standings(season.results[tier] ?? [], Object.keys(season.tierOf).filter((id) => season.tierOf[id] === tier), season.deductions);
    facts = seasonFacts({ season, save, matches: await db.fbMatches.where('season').equals(save.season).sortBy('date') }, { [tier]: rows } as Record<Tier, typeof rows>, false);
  }
  return { save, season, tier, bundles, built: builtOf(bundles), today: dayOfLogging(now), low: runningLowNow(u, engineOf(save).bountiesDone), facts };
}
export const useTree = () => useLiveQuery(() => loadTree(), []);
