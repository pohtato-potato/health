// The world redrawn (ledger O38, LG-4; league spec §9 "Unlocks on placement", §11 "Moving the owner's save"). Pure:
// the store (store/redraw.ts) gathers the save, plays the old world up to yesterday, places Brabo, and writes what
// these return. Every piece is a function of what it is given, so the same save and logs give the same world.
//
// - The season in progress closes where it stands and is kept as season 0, "The founding weeks".
// - Everything keyed to that season's number moves to 0, so the new Season 1 starts fresh (track, boons, board,
//   breaks, packs, the landlords' lock-out).
// - Kept: players, cards, the tree and research, the desk, album, packs, contracts, money, kits, crest, cup records,
//   settings. Reset: fog and scouting (clubs met that still exist are kept, as met, with the basics), relations and the
//   loan market's listings (both read only the desk's log from the move on), rivals born against retired clubs, any
//   cup run in progress. The legend rival is Royal Antwerp from the move on.
// - Brabo is given what a club would really have earned by its stage: the tree's earlier eras complete and the
//   current one open, the crest step, the kit slots (they follow the stage), and the ground's buildings to that stage.
import type { DayKey } from '../../domain/dates';
import { addDays } from '../../domain/dates';
import { TECHS } from '../content/tree';
import { ERA_IDS, type EraId } from '../content/types';
import { BUNDLES } from '../ground';
import { crestStepFor } from '../kits';
import { standings, type Row } from '../table';
import type { Tier } from '../types';
import type { FbBundle, FbNews, FbSave, FbSeason, StoredMatch } from '../store/tables';
import type { Rate } from './level';
import { emptyUser } from '../tree/types';
import { carefulIncome } from '../content/money';
import { euros, KIT_SPONSOR_TECH, openOffers } from '../money';
import { hashSeed, rng } from '../rng';
import { SEASON_MONEY_2, shapeOf, stageOf } from './shape';

export const FOUNDING_SEASON = 0;
export const FOUNDING_NAME = 'The founding weeks';
/** A season's name in the record book: season 0 is the founding weeks. */
export const seasonName = (no: number) => (no === FOUNDING_SEASON ? FOUNDING_NAME : `Season ${no}`);

/** What the move recorded on the save: the screen reads it, and the arrival is shown once. */
export interface Redrawn {
  on: DayKey;
  division: number;
  /** The placing's simulated rate in that division, and the real nights it came from. */
  rate: Rate;
  nights: number;
  short: boolean;
  /** The clubs of Brabo's new division. */
  vs: string[];
  founding: FoundingRecord;
  gifts: Gifts;
  /** The arrival ("the club has arrived") has been seen. */
  seen?: boolean;
  /** Money on arrival (ledger O40, letter 3b): the starting budget given, in millions. Absent on a save placed before it. */
  budget?: number;
  /** The weekly trial of the move day has been held (a move on a Sunday skipped it before O40). */
  trials?: boolean;
}
export interface FoundingRecord { p: number; w: number; d: number; l: number; gf: number; ga: number }
export interface Gifts { eras: EraId[]; techs: string[]; buildings: string[]; crest?: 1 | 2 | 3 | 4 | 5 }

/** Played, won, drawn, lost and goals over the founding weeks' matches (friendlies left out). */
export function foundingRecord(matches: Pick<StoredMatch, 'comp' | 'result' | 'score'>[]): FoundingRecord {
  const ms = matches.filter((m) => m.comp !== 'friendly');
  return {
    p: ms.length, w: ms.filter((m) => m.result === 'W').length, d: ms.filter((m) => m.result === 'D').length, l: ms.filter((m) => m.result === 'L').length,
    gf: ms.reduce((t, m) => t + m.score[0], 0), ga: ms.reduce((t, m) => t + m.score[1], 0),
  };
}

/** The season in progress, closed where it stands as season 0: its tables as they are, nobody moved. */
export function closeAsFounding(season: FbSeason): FbSeason {
  const tables = {} as Record<Tier, Row[]>;
  for (const t of Object.keys(season.fixtures).map(Number) as Tier[]) {
    const ids = [...new Set(season.fixtures[t].flat().flat())];
    tables[t] = standings(season.results[t] ?? [], ids, season.deductions);
  }
  return { ...season, id: FOUNDING_SEASON, final: { tables, up: {}, down: {} } };
}

/** The era a stage has reached: stage 6 (the bottom) is Sunday league, stage 1 the last era. */
export const eraForStage = (stage: Tier): EraId => ERA_IDS[Math.max(0, Math.min(ERA_IDS.length - 1, 6 - stage))];
/** Every tech of the eras before the stage's era, in the tree's order. */
export function giftedTechs(stage: Tier, have: string[]): string[] {
  const upTo = ERA_IDS.indexOf(eraForStage(stage));
  return TECHS.filter((t) => ERA_IDS.indexOf(t.era) < upTo && !have.includes(t.id)).map((t) => t.id);
}
/**
 * The ground's buildings a club at this stage would have: every building that opens at an earlier stage (or at the
 * start), with what it is built after, never one that needs the move to Kaai 42 (the move stays the owner's), and
 * never the Kaai Stand or the roof, which come with the move.
 */
export function giftedBuildings(stage: Tier, done: string[]): string[] {
  const have = new Set(done);
  const out: string[] = [];
  const ok = (b: (typeof BUNDLES)[number]) => !b.moved && b.id !== 'kaai-stand' && b.id !== 'roof' && (b.tier === undefined || b.tier > stage);
  for (let changed = true; changed;) {
    changed = false;
    for (const b of BUNDLES) {
      if (have.has(b.id) || !ok(b) || !(b.after ?? []).every((a) => have.has(a))) continue;
      have.add(b.id); out.push(b.id); changed = true;
    }
  }
  return out;
}
/** Gifted buildings as rows: finished long enough ago that none is shut for building work. */
export const giftedBundles = (ids: string[], on: DayKey): FbBundle[] =>
  ids.map((id) => ({ id, progress: {}, done: addDays(on, -1 - (BUNDLES.find((b) => b.id === id)!.downtime ?? 0)) }));

/**
 * Money on arrival (ledger O40, letter 3b): a club placed in a division arrives with one careful season's income at
 * that division's stage (mid-table TV, gate and prize money and one stable shirt deal, `carefulIncome`), scaled as
 * world 2 scales a season's money. What a club of that standing would have in the bank; wages stay due as normal.
 */
export const startingBudget = (division: number) => Math.round(carefulIncome(stageOf(division)) * SEASON_MONEY_2 * 1000) / 1000;
/** Sponsor offers on arrival for the slots open at the stage, the kit maker's only with the tree's Kit sponsor. */
export function arrivalOffers(save: Pick<FbSave, 'sponsors' | 'treeUser'>, division: number, on: DayKey) {
  const kit = (save.treeUser?.researched ?? []).some((r) => r.id === KIT_SPONSOR_TECH);
  return openOffers(save.sponsors ?? [], stageOf(division), kit, rng(hashSeed('arrival-offers', on)));
}

/** Everything stored against season `from` moved to `to`, so the next season of that number starts fresh. */
export function rekeySeason(save: FbSave, from: number, to: number): FbSave {
  const s = structuredClone(save);
  const k = (n: number) => (n === from ? to : n);
  if (s.tree) {
    const t = s.tree;
    if (t.track.season === from) t.track = { season: to, steps: t.track.steps, catchups: t.track.catchups };
    t.trackPaid = t.trackPaid.map((x) => (x.startsWith(`${from}:`) ? `${to}:${x.slice(String(from).length + 1)}` : x));
    t.board = t.board.map((b) => ({ ...b, season: k(b.season) }));
    t.packs = t.packs.map((p) => ({ ...p, season: k(p.season) }));
    if (t.boonExtra?.[from] !== undefined) { t.boonExtra[to] = t.boonExtra[from]; delete t.boonExtra[from]; }
  }
  if (s.treeUser) s.treeUser.boons = s.treeUser.boons.map((b) => ({ ...b, season: k(b.season) }));
  if (s.globe) {
    s.globe.breaks = s.globe.breaks.map((b) => ({ ...b, season: k(b.season) }));
    s.globe.duty = s.globe.duty.map((d) => ({ ...d, season: k(d.season) }));
  }
  if (s.lockedOut) s.lockedOut = s.lockedOut.map(k);
  return s;
}

export interface RedrawInput {
  on: DayKey;
  /** The new season's number (1 when the founding weeks were season 1). */
  season: number;
  stage: Tier;
  /** Club ids that exist in the new world (met clubs and rivals are kept only if they do). */
  exists: (id: string) => boolean;
  rival: string;
  done: string[];
  record: Omit<Redrawn, 'on' | 'gifts' | 'seen'>;
}
/** The save in the new world. `save` is the old world's save after its season was rekeyed. */
export function redrawSave(save: FbSave, o: RedrawInput): { save: FbSave; gifts: Gifts } {
  const techs = giftedTechs(o.stage, (save.treeUser?.researched ?? []).map((r) => r.id));
  const era = eraForStage(o.stage);
  const eras = ERA_IDS.slice(0, ERA_IDS.indexOf(era) + 1);
  const buildings = giftedBuildings(o.stage, o.done);
  const step = crestStepFor(o.stage);
  const crest = step > save.crest.step ? step : undefined;
  const gifts: Gifts = { eras, techs, buildings, ...(crest ? { crest } : {}) };
  const keep = (id: string) => o.exists(id) && !/^os\d$/.test(id);
  const earned = save.rivals.filter((r) => r.how !== 'legend' && keep(r.clubId));
  const user = save.treeUser ?? (techs.length || eras.length > 1 ? emptyUser() : undefined);
  const out: FbSave = {
    ...save,
    world: 2, season: o.season, phase: 'season', day: 1, event: undefined, lastPlayed: o.on, paused: undefined, pace: undefined,
    rivals: [{ clubId: o.rival, how: 'legend', since: o.on }, ...earned],
    rivalMoments: (save.rivalMoments ?? []).filter(keep),
    met: save.met.filter(keep),
    scouted: [],
    fog: { since: o.on, old: [] },
    ...(crest ? { crestPending: crest } : {}),
    ...(user ? { treeUser: { ...user, researched: [...user.researched, ...techs.map((id) => ({ id, on: o.on, cost: 0 }))], seenEras: [...new Set([...user.seenEras, ...eras])] } } : {}),
    redrawn: { ...o.record, on: o.on, gifts },
  };
  // Money on arrival, and sponsor offers to see and sign straight away (owner, 16 Nov).
  const budget = startingBudget(o.record.division);
  out.budget = Math.round(((save.budget ?? 0) + budget) * 1000) / 1000;
  out.redrawn = { ...out.redrawn!, budget };
  if (!(save.offers ?? []).length) out.offers = arrivalOffers(out, o.record.division, o.on);
  return { save: out, gifts };
}
/** The desk's log and cup ties as relations and the loan market read them: from the move on, in world 2. */
export const sinceRedrawn = <T extends { day?: DayKey; date?: DayKey }>(xs: T[], save: { redrawn?: { on: DayKey } }): T[] => {
  const on = save.redrawn?.on;
  return on ? xs.filter((x) => (x.day ?? x.date ?? '') >= on) : xs;
};

/** The arrival's money, as news on the day of the move (the back page's second line that day). */
export const arrivalMoneyNews = (on: DayKey, budget: number, division: number): FbNews => ({
  id: `${on}:arrival-money`, date: on, kind: 'club',
  text: `Money on arrival: ${euros(budget)} in the bank for ${shapeOf({ world: 2 }).name(division)}. Wages are paid at the season’s end as usual. Sponsors have made offers: see Money.`,
});
