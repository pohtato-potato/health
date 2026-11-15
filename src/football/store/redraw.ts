// The world redrawn (ledger O38, LG-4; league spec §11): moving a world-1 save into the new world. Started only by
// the owner, from the "The world redrawn" screen; never on load. The rules are pure (pyramid/redraw.ts); this file
// reads the save, plays the old world up to yesterday, places Brabo, seeds the real clubs and writes it all at once.
// A backup from before the change restores as a world-1 save and is moved the same way, by the same screen.
import { db } from '../../db/db';
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { clubById, LANDLORDS_2, rememberClubs, RIVAL_2, setClubWorld } from '../data/load';
import { WORLD_CLUBS } from '../data/world';
import type { OldSelf } from '../oldSelves';
import { type LevelNight, type Rate } from '../pyramid/level';
import { rollOldSelves2 } from '../pyramid/oldSelves';
import { closeAsFounding, FOUNDING_SEASON, foundingRecord, giftedBundles, rekeySeason, redrawSave, type FoundingRecord, type Gifts } from '../pyramid/redraw';
import { POOL, PYRAMID, shapeOf, stageOf } from '../pyramid/shape';
import { realSeeds, seedWorld2 } from '../pyramid/world';
import type { Tier } from '../types';
import { loadHealth } from './gather';
import { braboPlacing, finishPaused, monthsFromHealth2, playDue } from './play';
import { newSeason2, OWN } from './season';
import type { FbClub, FbNews, FbSave } from './tables';

/** Brabo's open place in LG-2's draft: placing simulates every division with Brabo out of it. */
const DRAFT_DIVISION = 3;
const exists = new Set([...WORLD_CLUBS.filter((c) => c.place !== 'neighbour').map((c) => c.id), OWN]);

export interface RedrawPlan {
  /** The logging day the move is made on; Season 1 starts the next morning. */
  on: DayKey;
  division: number;
  divisionName: string;
  rate: Rate;
  nights: number;
  short: boolean;
  night?: LevelNight;
  /** Every division's simulated rate, for the "why". */
  rates: Partial<Record<number, Rate>>;
  /** The 11 clubs Brabo meets in its division (and any Old Self among them). */
  vs: string[];
  /** Names of the division's clubs and the rival, read in the new world (the screen shows them before the move). */
  names: Record<string, string>;
  olds: OldSelf[];
  founding: FoundingRecord & { season: number };
  gifts: Gifts;
  clubs: FbClub[];
  save: FbSave;
}

/**
 * Everything the move would do, without writing it. `on` is the logging day; the level night reads the 28 days up to
 * yesterday, so a day still being logged never changes where Brabo goes.
 */
export async function planRedraw(on: DayKey, opts: RedrawOpts = {}): Promise<RedrawPlan | undefined> {
  const save = await db.fbSave.get('save');
  if (!save || save.world === 2) return undefined;
  // Planning reads the new world's clubs; a preview must leave the old world's registry (and Old Self names) as it was.
  try {
    return await plan(save, on, opts);
  } finally {
    const old = await db.fbClubs.toArray();
    if (old.length) rememberClubs(old); else setClubWorld(1);
  }
}

/** Dev and tests only (store/dev.ts): put the save in a chosen division instead of where the placing puts it. */
export interface RedrawOpts { division?: number }

async function plan(save: FbSave, on: DayKey, opts: RedrawOpts): Promise<RedrawPlan> {
  const h = await loadHealth();
  const own = (await db.fbClubs.get(OWN))!;
  const matches = (await db.fbMatches.where('season').equals(save.season).toArray());
  const done = (await db.fbBundles.toArray()).filter((b) => b.done).map((b) => b.id);

  setClubWorld(2);
  const seeds = realSeeds(WORLD_CLUBS);
  const olds = rollOldSelves2([], monthsFromHealth2(h, on), []).joined;
  const ownSeed = { id: OWN, style: own.style, rating: own.rating };
  // Placing: every division of the draft, Brabo left out.
  const draft = seedWorld2(seeds, ownSeed, DRAFT_DIVISION, olds).filter((c) => !c.pool && !c.folded && c.id !== OWN);
  const divisions = Object.fromEntries(PYRAMID.map((p) => [p.no, draft.filter((c) => c.tier === p.no).map((c) => ({ id: c.id, rating: c.rating, style: c.style }))]));
  const placing = await braboPlacing(addDays(on, -1), divisions);
  const division = opts.division && opts.division >= 1 && opts.division <= PYRAMID.length ? opts.division : placing.division;
  const clubs = seedWorld2(seeds, ownSeed, division, olds) as FbClub[];
  const vs = clubs.filter((c) => c.tier === division && !c.pool && !c.folded && c.id !== OWN).map((c) => c.id);

  const founding = save.season === 1 ? FOUNDING_SEASON : save.season;
  const next = founding + 1;
  const record = { ...foundingRecord(matches), season: founding };
  const stage = stageOf(division);
  const rate = placing.rates[division] ?? { w: 0, d: 0, l: 0, n: 0 };
  const moved = redrawSave(founding === save.season ? save : rekeySeason(save, save.season, founding), {
    on, season: next, stage, exists: (id) => exists.has(id), rival: RIVAL_2, done,
    record: { division, rate, nights: placing.nights, short: placing.short, vs, founding: record },
  });
  rememberClubs(clubs);
  const names = Object.fromEntries([...vs, RIVAL_2, LANDLORDS_2].map((id) => [id, clubById(id).name]));
  return {
    on, division, divisionName: shapeOf({ world: 2 }).name(division), rate, nights: placing.nights, short: placing.short, night: placing.night,
    rates: placing.rates, vs, names, olds, founding: record, gifts: moved.gifts, clubs, save: moved.save,
  };
}

/** Plays the old world up to yesterday and finishes a waiting match (kept unwatched), so the founding weeks are whole. */
export async function settleOldWorld(now: number) {
  await playDue(now);
  await finishPaused({ watched: false });
}

/**
 * The move, written in one go: the founding weeks as season 0 (its matches with it), the real clubs seeded, Brabo
 * placed, Season 1 drawn to start tomorrow, the gifts for the stage, the resets, and `save.world = 2`.
 */
export async function redrawWorld(now = Date.now(), opts: RedrawOpts = {}): Promise<RedrawPlan | undefined> {
  const save0 = await db.fbSave.get('save');
  if (!save0 || save0.world === 2) return undefined;
  await settleOldWorld(now);
  const on = dayOfLogging(now);
  const plan = await planRedraw(on, opts);
  if (!plan) return undefined;
  await writeRedraw(plan);
  return plan;
}

export async function writeRedraw(plan: RedrawPlan) {
  const { on, clubs } = plan;
  rememberClubs(clubs);
  const founding = plan.founding.season;
  await db.transaction('rw', [db.fbSave, db.fbSeasons, db.fbClubs, db.fbMatches, db.fbNews, db.fbBundles, db.cupRuns], async () => {
    const cur = await db.fbSave.get('save');
    if (!cur || cur.world === 2) return; // another tab moved first
    const old = (await db.fbSeasons.get(cur.season))!;
    if (founding !== cur.season) {
      await db.fbSeasons.delete(cur.season);
      await db.fbMatches.where('season').equals(cur.season).modify({ season: founding });
    }
    await db.fbSeasons.put(old.final ? { ...old, id: founding } : closeAsFounding({ ...old, id: founding }));
    await db.fbSeasons.put(newSeason2(founding + 1, addDays(on, 1), clubs));
    await db.fbClubs.clear();
    await db.fbClubs.bulkPut(clubs);
    const done = new Set((await db.fbBundles.toArray()).filter((b) => b.done).map((b) => b.id));
    await db.fbBundles.bulkPut(giftedBundles(plan.gifts.buildings.filter((id) => !done.has(id)), on));
    await db.cupRuns.delete('current');
    const news: FbNews = {
      id: `${on}:redrawn`, date: on, kind: 'club',
      text: `The world redrawn. Ninety-six real clubs in eight divisions of twelve. Brabo start Season ${founding + 1} in ${plan.divisionName}, renting ${clubById('bra').ground.split(' (')[0]} from ${clubById(LANDLORDS_2).name}.`,
    };
    await db.fbNews.put(news);
    await db.fbSave.put(plan.save);
  });
  rememberClubs(clubs);
}

/** The pool's tier, for screens that read where a club sits. */
export const isPool = (c: Pick<FbClub, 'tier' | 'pool'>) => Boolean(c.pool) || c.tier === (POOL as Tier);
