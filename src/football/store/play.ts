import type { Targets } from '../../domain/types';
import { fuelSpread } from '../../domain/nightOut';
import { fuelScore } from '../axes';
// The only writer of Football's tables. Kick-off reads Health once, plays, and stores the events.
import { bedOrder, fromBedOrder } from '../../domain/rings';
import { db } from '../../db/db';
import { addDays, dayOfLogging, daysBetween, weekday, type DayKey } from '../../domain/dates';
import { daysOf, leagueMatchdays, seasonDays, seasonLength, type DayPlan } from '../calendar';
import { breakBeforeFor, LEAGUE_MATCHDAYS, matchdaysBefore, matchIdFor, PACE_PER_DAY, paceOn, slotKey, titleSafe } from '../pace';
import { advance, penalties, type Bracket } from '../cups';
import { clubById, LANDLORDS_2, rememberClubs } from '../data/load';
import { cards, physio, redCardMod, rotationShape, usesRotation } from '../discipline';
import { playMatch, typicalFor, type MatchCtx, type MatchInput, type MatchPlan } from '../engine';
import { deskFold, type ClubWorld } from '../desk/fold';
import { PROJECTS } from '../content/projects';
import { diceFrozen } from './desk';
import { isScouted, pausedInput, readFor, readScouted, scoutLevel } from './paused';
import { pickOffer } from '../matchday';
import { CONT_NAME, CWC_DAYS, CWC_NAME, contPrize, koFromTable, newClubWorld, phaseTable, reachOf } from '../continental';
import { worldChamps } from '../data/continental';
import { calledUp, EVENTS, NATIONS, nationBar, nextEvent, worldCupGroups, worldCupRun } from '../events';
import { rollOldSelves } from '../oldSelves';
import { opponentFor } from '../opponent';
import { simResult } from '../otherMatches';
import { applyMoves, doubleUp, formRating, playoffPairs, seasonEnd } from '../promotion';
import { afterMatch, legendId, howText, migrateRivals, rivalTwist, twistOf, weakestAxis, type Meeting } from '../rivals';
import { hashSeed, rng, pick } from '../rng';
import { contractDay, keptOn, intake, newContract } from '../contracts';
import { nationId, YOUTH_POOL } from '../data/load';
import { crestStepFor } from '../kits';
import { BUNDLES, bundleDay, capacityOf, dayCounts, groundAbilities, homeGround, isOpen, TENANT_CAPACITY } from '../ground';
import { dodgyCollapse, incomeFor, KIT_SPONSOR_TECH, openOffers } from '../money';
import { HABITS, habitById, armbandHarmony, averageOf, momentsOf, TRAIT } from '../squad';
import { abilityFor, braboAbilities } from '../data/abilities';
import { standings, type Played, type Row } from '../table';
import { applyChanges, worldTurn } from '../world';
import { applyMoves2, seasonEnd2 } from '../pyramid/movement';
import { settle2, tableDrift } from '../pyramid/drift';
import { redrawUp } from '../pyramid/cups';
import { LEVEL_DAYS, placeBrabo, typicalNight, winRate, type LevelNight, type Placing, type SimClub } from '../pyramid/level';
import { rollOldSelves2, seatOldSelves } from '../pyramid/oldSelves';
import { POOL, PYRAMID, lastDivision, seasonMoneyScale, shapeOf, stageIn, stageOf, worldOf } from '../pyramid/shape';
import { AXES, TIERS, type AxisValues, type CallPick, type Comp, type MatchEvents, type Mod, type Result, type Tier } from '../types';
import { axisInputFor, bestAxis, comebackOn, condCapFor, conditions, loadHealth, medItems, medsTaken, nightFor, type Health } from './gather';
import { backLine, cleanBill, dressingRoom, lowLogNight, lowLogOn, meetingDue, onInjuryList, typicalShape, type MedDay } from '../squadCare';
import { comebackLift } from '../comeback';
import { factsFor, matchLines, situationOf } from './lines';
import { newSeason, newSeason2, OWN } from './season';
import type { FbBundle, FbClub, FbNews, FbSave, FbSeason, FbSquadRow, PausedMatch, PausedPrep, StoredMatch } from './tables';
import { creditsFor } from '../players/credit';
import { linkedLogged } from '../players/youth';
import type { Ctx } from '../players/attributes';
import { formationFor } from '../tree/rotation';
import { creditArrival, engineOf, healNow, rotationOf, stageCapacity, treeAbilities, treeDay, treeLegends, treeMatch, treeSeasonEnd, type TreeCtx } from './tree';
import { LEAGUE, TIER_BANDS, tierName } from '../data/load';
import { braboVotes, motionById, seasonRules, sitCongress, solidarityMoney } from '../congress/congress';
import { CAST_IDS, bondDay, bondsOf, castById, closeResearch, emptyBonds, perkValue, perksHeld } from '../cast/bonds';
import { perksOfSave } from './cast';
import { lobbiesFor } from '../desk/jobs/lobby';
import { opinionOf } from '../market/relations';
import { relationSourceOf } from './market';
import { academyIds, creditMatch, nightOptsFor, playerCtx, playersDay, rebuildPlayers, squadNight, type Roster } from './players';
import { signFreeAgents } from '../rotation/freeAgents';
import { chemistryAfter, moraleAfter, type Tactic } from '../rotation/night';
import { traitAbilities } from '../rotation/traits';
import { breakStarts, globeAfterPlayers, globeDay, globeOf, globeMatch, globeNight, globeRules, globeSeasonEnd, isBreakDay, loanAbilities, restedForLeague, trialsOn } from './globe';
import { arrivalMoneyNews, arrivalOffers, startingBudget } from '../pyramid/redraw';

export const CATCH_UP_CAP = 42;
const resultOf = (s: [number, number], pens?: [number, number]): Result => (s[0] > s[1] || (pens && pens[0] > pens[1]) ? 'W' : s[0] < s[1] || (pens && pens[0] < pens[1]) ? 'L' : 'D');

interface World { /** League pace (O36): the match's place in its day; 0 is the one-a-day match. */ slot: number; /** The chance (O40): a dry run collects each Brabo match's engine input here, by date. */ probe?: { date: DayKey; input: MatchInput; comp?: Comp; oppId?: string; round?: string }[]; bundles: Map<string, FbBundle>; squad: FbSquadRow[]; save: FbSave; season: FbSeason; oldSeasons: FbSeason[]; clubs: Map<string, FbClub>; matches: StoredMatch[]; news: FbNews[]; h: Health; past: StoredMatch[]; used: { id: string; date: DayKey }[]; roster: Roster; ctx: Ctx }

/** Plays every unplayed day up to and including `date`, in order. Days before `date` count as auto-played. */
export async function kickOff(date: DayKey): Promise<StoredMatch[]> {
  return playThrough(date, date);
}
/** The 4 am rule: plays every day before today's logging day that was never played. */
export async function playDue(now = Date.now()): Promise<StoredMatch[]> {
  const yesterday = addDays(dayOfLogging(now), -1);
  return playThrough(yesterday, null);
}

const USER_KEYS = ['buzz', 'wcCountry', 'ownSponsor', 'captain', 'captains', 'captainWeek', 'slots', 'sponsorStyle', 'awakeSeen', 'seenSeasonEnd', 'sheet', 'tactics', 'bedtime', 'treeUser', 'globeUser', 'around', 'desk', 'pace', 'ballot', 'castSeen'] as const satisfies readonly (keyof FbSave)[];
/**
 * Engine 2 arrives: rebuilds the players from history once (spec §16), crediting the stored matches and keeping only
 * youngsters tied to a real habit. Everything else in the save stays. Safe to call any time; it runs once.
 */
export async function upgradeSave(): Promise<boolean> {
  const save = await db.fbSave.get('save');
  if (!save || save.engine === 2) return false;
  rememberClubs(await db.fbClubs.toArray());
  const until = save.lastPlayed ?? addDays(save.founded, -1);
  const r = rebuildPlayers(await loadHealth(), save, await db.fbSquad.toArray(), await db.fbMatches.orderBy('date').toArray(), until, (id) => clubById(id).name);
  return db.transaction('rw', [db.fbSave, db.fbMatches, db.fbNews, db.fbSquad, db.fbPlayers], async () => {
    const cur = await db.fbSave.get('save');
    if (!cur || cur.engine === 2) return false; // another tab upgraded first
    await db.fbSave.put({ ...cur, engine: 2, chem: r.chem, morale: r.morale });
    await db.fbPlayers.clear();
    if (r.players.length) await db.fbPlayers.bulkPut(r.players);
    if (r.matches.length) await db.fbMatches.bulkPut(r.matches);
    if (r.squad.length) await db.fbSquad.bulkPut(r.squad);
    if (r.news.length) await db.fbNews.bulkPut(r.news);
    return true;
  });
}

/** Old saves brought up to date on load, whether or not a match plays: the retired 4 am rival (decision C3). */
export async function migrateSave(): Promise<boolean> {
  return db.transaction('rw', db.fbSave, async () => {
    const cur = await db.fbSave.get('save');
    if (!cur) return false;
    const rivals = migrateRivals(cur.rivals);
    // The world in fog (desk spec §4, 12.8 a): stamped once; the clubs met so far keep what they had.
    const fog = cur.fog ?? { since: cur.lastPlayed ?? cur.founded ?? '', old: [...(cur.met ?? [])] };
    if (rivals === cur.rivals && fog === cur.fog) return false;
    await db.fbSave.put({ ...cur, rivals, fog });
    return true;
  });
}

/**
 * The chance (ledger O40, letter 1a): tonight's match exactly as the engine would set it up if the day closed now (the
 * night's values so far, the stack, captain, abilities, the plan, home or away, the opponent as it is), worked out by a
 * dry run of the days still to play. Nothing is written and no real dice are rolled: the dry run plays on copies, and
 * the input it returns is played out on its own fixed seeds (football/chance.ts). Undefined when there is no match.
 */
/** One Brabo match of tonight as the dry run set it up (a double-header night has two or more, in playing order). */
export interface TonightInput { input: MatchInput; comp?: Comp; oppId?: string; round?: string }
export async function tonightInput(date: DayKey): Promise<{ input: MatchInput; usual?: AxisValues; all: TonightInput[] } | undefined> {
  const save = await db.fbSave.get('save');
  if (!save || save.engine !== 2) return undefined;
  const from = save.lastPlayed ? addDays(save.lastPlayed, 1) : save.founded;
  // Today closed already (Close the day, before 4 am): Tonight shows the next match, so the chance is for that one.
  if (date < from && save.paused?.date !== date) date = from;
  const start = daysBetween(from, date) + 1 > CATCH_UP_CAP ? addDays(date, -(CATCH_UP_CAP - 1)) : from;
  const w = await loadWorld(save, start < date ? start : date);
  // A usual night (the placing's level night): the median of the real nights in the 28 days up to yesterday.
  const usual = levelNightIn(w, addDays(date, -1))?.values;
  if (save.paused?.date === date) {
    const p = save.paused, one = { input: pausedInput(p, save, { watch: false }), comp: p.prep.comp, oppId: p.prep.oppId, round: p.prep.round };
    return { input: one.input, all: [one], ...(usual ? { usual } : {}) };
  }
  w.probe = [];
  if (w.save.paused) finishPausedIn(w, false);
  // As "Close the day" plays it: the days before tonight as the 4 am rule would, tonight as a closed day.
  for (let d = start; d <= date; d = addDays(d, 1)) { clubDay(w, d); playDate(w, d, d !== date, d === date); }
  const all = w.probe.filter((x) => x.date === date).map(({ input, comp, oppId, round }) => ({ input, comp, oppId, round }));
  return all.length ? { input: all[0].input, all, ...(usual ? { usual } : {}) } : undefined;
}

/**
 * Ledger O40, once per save placed in world 2: money on arrival (the starting budget and sponsor offers) for a save
 * placed before it existed, and the weekly trial the move day skipped when the move was made on a trial day (its
 * trialists are only brought while they can still be tied). Marked on `redrawn`, so it never runs twice.
 */
export async function repairPlaced(): Promise<boolean> {
  const save = await db.fbSave.get('save');
  const r = save?.redrawn;
  if (!save || save.world !== 2 || !r || (r.budget !== undefined && r.trials)) return false;
  const w = await loadWorld(save, r.on);
  const fix: NonNullable<FbSave['redrawn']> = { ...r };
  if (r.budget === undefined) {
    const budget = startingBudget(r.division);
    w.save.budget = Math.round((w.save.budget + budget) * 1000) / 1000;
    if (!(w.save.offers ?? []).length) w.save.offers = arrivalOffers(w.save, r.division, r.on);
    fix.budget = budget;
    w.news.push(arrivalMoneyNews(r.on, budget, r.division));
  }
  if (!r.trials) {
    const hold = globeRules(w.save, w.bundles.values()).trials.hold;
    if (daysBetween(r.on, w.save.lastPlayed ?? r.on) < hold) w.save.globe = trialsOn(w, globeOf(w.save), r.on, w.save.season);
    fix.trials = true;
  }
  w.save.redrawn = fix;
  return db.transaction('rw', [db.fbSave, db.fbSquad, db.fbNews], async () => {
    const cur = await db.fbSave.get('save');
    if (!cur?.redrawn || cur.redrawn.budget !== r.budget || cur.redrawn.trials !== r.trials) return false; // another tab repaired first
    await db.fbSave.put({ ...cur, budget: w.save.budget, offers: w.save.offers, globe: w.save.globe, redrawn: fix });
    if (w.squad.length) await db.fbSquad.bulkPut(w.squad);
    if (w.news.length) await db.fbNews.bulkPut(w.news);
    return true;
  });
}

async function playThrough(until: DayKey, closed: DayKey | null): Promise<StoredMatch[]> {
  await upgradeSave();
  await migrateSave();
  await repairPlaced();
  const save = await db.fbSave.get('save');
  if (!save) return [];
  const from = save.lastPlayed ? addDays(save.lastPlayed, 1) : save.founded;
  if (until < from) return [];
  let start = from;
  if (daysBetween(from, until) + 1 > CATCH_UP_CAP) start = addDays(until, -(CATCH_UP_CAP - 1));
  const w = await loadWorld(save, start);
  // Matchday (decision 9.1 a): a match still waiting at the next 4 am is finished by the assistant first.
  if (w.save.paused) finishPausedIn(w, false);
  creditArrivalIn(w);
  for (let d = start; d <= until; d = addDays(d, 1)) { clubDay(w, d); playDate(w, d, d !== closed, d === until); }
  w.save.lastPlayed = until;
  await saveWorld(w, save, (cur) => !(cur?.lastPlayed && cur.lastPlayed >= until)); // another tab played first
  return w.matches;
}

async function loadWorld(save: FbSave, start: DayKey): Promise<World> {
  const stored = await db.fbClubs.toArray();
  rememberClubs(stored);
  const h = await loadHealth();
  const squad = await db.fbSquad.toArray();
  const roster: Roster = new Map((await db.fbPlayers.toArray()).map((p) => [p.id, p]));
  return {
    slot: 0, squad, roster, ctx: playerCtx(h, save, squad),
    bundles: new Map((await db.fbBundles.toArray()).map((b) => [b.id, b])),
    save: { ...save, rivals: migrateRivals(save.rivals) }, season: (await db.fbSeasons.get(save.season))!, oldSeasons: [], clubs: new Map(stored.map((c) => [c.id, c])),
    matches: [], news: [], h, past: await db.fbMatches.orderBy('date').toArray(),
    used: (await db.fbNews.where('date').aboveOrEqual(addDays(start, -31)).toArray()).filter((n) => n.lineId).map((n) => ({ id: n.lineId!, date: n.date })),
  };
}

/** Writes the world back, unless `ok` says another tab got there first. */
async function saveWorld(w: World, save: FbSave, ok: (cur: FbSave | undefined) => boolean): Promise<boolean> {
  return db.transaction('rw', [db.fbSave, db.fbSeasons, db.fbClubs, db.fbMatches, db.fbNews, db.fbSquad, db.fbBundles, db.fbPlayers], async () => {
    const cur = await db.fbSave.get('save');
    if (!ok(cur)) return false;
    // Settings the player changed while the days were playing win over the copy read at the start.
    if (cur) for (const k of USER_KEYS) if (JSON.stringify(cur[k]) !== JSON.stringify(save[k])) (w.save as unknown as Record<string, unknown>)[k] = cur[k];
    await db.fbSave.put(w.save);
    await db.fbSeasons.bulkPut([...w.oldSeasons, w.season]);
    await db.fbClubs.bulkPut([...w.clubs.values()]);
    rememberClubs([...w.clubs.values()]);
    if (w.matches.length) await db.fbMatches.bulkPut(w.matches);
    if (w.roster.size) await db.fbPlayers.bulkPut([...w.roster.values()]);
    if (w.news.length) await db.fbNews.bulkPut(w.news);
    if (w.squad.length) {
      // A trialist tied (or let go) by a tap while the days played keeps the tap.
      const now = new Map((await db.fbSquad.toArray()).map((y) => [y.id, y]));
      await db.fbSquad.bulkPut(w.squad.map((y) => { const c = now.get(y.id); return y.status === 'trial' && c && c.status !== 'trial' ? c : y; }));
    }
    if (w.bundles.size) await db.fbBundles.bulkPut([...w.bundles.values()]);
    return true;
  });
}

// ---- Matchday depth (spec 2026-11-12 §2.1): the league match that waits for you ----
/** The league match waiting to be watched or skipped (Fork B's result tile reads this). */
export async function pausedMatch(): Promise<PausedMatch | undefined> {
  return (await db.fbSave.get('save'))?.paused;
}
/**
 * Finishes the waiting match and stores it like any other: with the owner's calls made so far (a watched match ends
 * with all of them made) and the assistant taking the best odds on any call left. Skip in the live screen and
 * the morning parcel's Skip both mark it seen (`finishWithAssistant`).
 */
export async function finishPaused(o: { watched: boolean }): Promise<StoredMatch | undefined> {
  await upgradeSave();
  const save = await db.fbSave.get('save');
  const p = save?.paused;
  if (!save || !p) return undefined;
  const w = await loadWorld(save, p.date);
  const m = finishPausedIn(w, o.watched);
  const ok = await saveWorld(w, save, (cur) => cur?.paused?.id === p.id);
  return ok ? m : (await db.fbMatches.get(p.id));
}
/** Skip: the assistant makes every call left and the match is stored, marked seen (it never returns in the catch-up reel). */
export const finishWithAssistant = () => finishPaused({ watched: true });

/** Stores a call or the half-time plan as the owner makes it, so leaving mid-match resumes at the same point. */
export async function recordLive(change: { pick?: CallPick; half2?: Tactic | null; halfSeen?: boolean }): Promise<void> {
  await db.transaction('rw', db.fbSave, async () => {
    const save = await db.fbSave.get('save');
    if (!save?.paused) return;
    const p = { ...save.paused };
    if (change.pick) p.picks = [...p.picks, change.pick];
    if (change.half2 !== undefined) { if (change.half2) p.half2 = change.half2; else delete p.half2; }
    if (change.halfSeen) p.halfSeen = true;
    await db.fbSave.put({ ...save, paused: p });
  });
}

function finishPausedIn(w: World, watched: boolean): StoredMatch | undefined {
  const p = w.save.paused;
  if (!p) return undefined;
  delete w.save.paused;
  const input = pausedInput(p, w.save, { watch: false });
  const events = playMatch(input);
  const m = braboTail(w, p.date, p.prep, events, input.plan, p.half2, readFor(p, w.save).line);
  if (watched) w.matches[w.matches.length - 1].watched = true;
  // The table counts the match only now ("to be played" until then).
  const tier = w.season.id === p.season ? w.season : w.oldSeasons.find((x) => x.id === p.season);
  tier?.results[p.prep.braboTier].push({ home: p.prep.home, away: p.prep.away, score: m.score }); // braboTail returns the score home first
  const stored = w.matches[w.matches.length - 1];
  // League pace: the waiting match may be the one that makes the title safe; the season then ends on its day.
  if (w.season.id === p.season && paceOn(w.save, p.date) && titleSafeNow(w)) { w.slot = (p.prep.slot ?? 0) + 1; endLeague(w, p.date, p.prep.auto); w.slot = 0; }
  return stored;
}

const rating = (w: World, id: string) => w.clubs.get(id)?.rating ?? clubById(id).rating ?? 50;
function otherResult(w: World, home: string, away: string, seed: string, neutral = false): [number, number] {
  return simResult({ rating: rating(w, home) }, { rating: rating(w, away) }, rng(hashSeed(seed, home, away, ...slotKey(w.slot))), neutral ? 0 : 3);
}
/** A seed's day part: the date itself for the one-a-day match, the date and its slot for the extra matchdays. */
const sd = (w: World, date: DayKey) => (w.slot ? `${date}#${w.slot}` : date);

// ---- League pace (O36): three league matchdays a day for the rest of one season ----
/**
 * One sealed day. At one a day it plays the next season day. With the pace on it plays season days in calendar order
 * (cup days on the way included) until three league matchdays are in, each as its own slot with its own dice. It
 * stops early before an international break, and ends the season the moment the title is safe.
 */
function playDate(w: World, date: DayKey, auto: boolean, last: boolean) {
  if (!paceOn(w.save, date)) { w.slot = 0; return playDay(w, date, auto, last); }
  let leagues = 0;
  for (let k = 0; w.save.phase === 'season' && leagues < PACE_PER_DAY; k++) {
    if (k > 0 && breakNext(w)) break;
    w.slot = k;
    const isLeague = seasonDays()[w.save.day - 1]?.kind === 'league' && !isBreakDay(w.save, date);
    if (isLeague) leagues++;
    playDay(w, date, auto, last && leagues === PACE_PER_DAY);
    if (isBreakDay(w.save, date)) break;
    if (isLeague && !w.save.paused && titleSafeNow(w)) { w.slot = k + 1; endLeague(w, date, auto); break; }
  }
  w.slot = 0;
}
/** The next season day starts an international break that has not been played yet: the night stops before it. */
const breakNext = (w: World): boolean => breakBeforeFor(w.save)(w.save.day);
/** Brabo's title cannot be lost on the league played so far. */
function titleSafeNow(w: World): boolean {
  const tier = w.season.tierOf[OWN];
  return titleSafe(tablesNow(w)[tier], OWN, LEAGUE_MATCHDAYS - matchdaysBefore(w.save.day));
}
/**
 * The title is safe: the league stops for every division on the matchday just played (so every table has the same
 * games), and the rest of the calendar's cup rounds, continental nights and playoffs are played out that same day,
 * each in its own slot. Then the existing season end runs: promotion, the double-promotion rule, the money.
 */
function endLeague(w: World, date: DayKey, auto: boolean) {
  const md = matchdaysBefore(w.save.day);
  w.season.leagueEnded = { matchday: md, date };
  const tier = w.season.tierOf[OWN];
  w.news.push({ id: `${date}:title-safe`, date, kind: 'club', text: `The title is safe. Nobody in ${tierName(tier)} can catch Brabo United now, with ${LEAGUE_MATCHDAYS - md} matchdays left. The league stops here for every division; the cups and the playoffs are played out tonight, and promotion comes with them. Next season is one match a day again.` });
  while (w.save.phase === 'season') {
    playDay(w, date, auto, false, true);
    w.slot++;
  }
}

function playDay(w: World, date: DayKey, auto: boolean, last = false, leagueOver = false) {
  const { save } = w;
  if (save.phase === 'event') return playEventDay(w, date, auto);
  if (isBreakDay(save, date) && !leagueOver) return; // an international break: no matches, the season day waits
  const wv = worldOf(w.season);
  const plan = daysOf(wv)[save.day - 1];
  w.season.dates[save.day] = date;
  const braboTier = w.season.tierOf[OWN];
  if (leagueOver && plan.kind === 'league') {
    // League pace: the league has stopped; a continental night on this day is still played.
    if (plan.cont) continentalNight(w, date, plan, auto, 0);
    save.day++;
    if (save.day > seasonLength(wv)) endSeason(w, date);
    return;
  }
  const mine: { comp: Comp; round?: string; home: string; away: string; neutral?: boolean; onWin?: (s: [number, number], p?: [number, number]) => void }[] = [];
  if (plan.kind === 'league') {
    for (const t of shapeOf(w.season).divisions) for (const [h, a] of w.season.fixtures[t][plan.matchday! - 1]) {
      if (h === OWN || a === OWN) mine.push({ comp: 'league', round: `Matchday ${plan.matchday}`, home: h, away: a });
      else w.season.results[t].push({ home: h, away: a, score: otherResult(w, h, a, date) }); // the slot is in otherResult's seed
    }
    // Matchday (spec §2.1): the last day played waits to be watched, unless the season or a continental night
    // needs its result straight away.
    const wait = last && !plan.cont && !plan.cup && save.day < seasonLength(wv);
    for (const m of mine) {
      const s = braboMaybe(w, date, plan, m.comp, m.home, m.away, auto, m.round, undefined, false, wait);
      if (s) w.season.results[braboTier].push({ home: m.home, away: m.away, score: s.score });
    }
    if (plan.cont) continentalNight(w, date, plan, auto, mine.length);
    // World 2: a Big Cup round on a league night is the double-header's second match.
    if (plan.cup) cupRounds(w, date, plan, auto, [[w.season.bigcup, (b) => (w.season.bigcup = b), 'bigcup']], mine.length);
  } else if (plan.kind === 'bigcup' || plan.kind === 'tiercup' || plan.kind === 'finals1' || plan.kind === 'finals2') {
    const brackets: [Bracket, (b: Bracket) => void, Comp][] = [];
    if (plan.kind === 'bigcup' || plan.kind === 'finals1') brackets.push([w.season.bigcup, (b) => (w.season.bigcup = b), 'bigcup']);
    if (plan.kind === 'tiercup' || plan.kind === 'finals2') for (const id of Object.keys(w.season.tiercups)) brackets.push([w.season.tiercups[id], (b) => (w.season.tiercups[id] = b), 'tiercup']);
    let played = cupRounds(w, date, plan, auto, brackets, 0);
    if (plan.kind === 'finals1') played += playoffSemis(w, date, plan, auto, played);
    if (plan.kind === 'finals2') played += playoffFinals(w, date, plan, auto, played);
    if (!played && !leagueOver) friendly(w, date, plan, auto);
  }
  save.day++;
  if (save.day > seasonLength(wv)) endSeason(w, date);
}

/** The rounds of these brackets that fall on tonight's season day, in order. Returns Brabo's matches played. */
function cupRounds(w: World, date: DayKey, plan: DayPlan, auto: boolean, brackets: [Bracket, (b: Bracket) => void, Comp][], before: number): number {
  let played = before;
  {
    for (const [b0, set, comp] of brackets) {
      let b = b0;
      for (let ri = 0; ri < b.rounds.length; ri++) {
        if (b.rounds[ri].day !== plan.day) continue;
        const res: Record<string, { score: [number, number]; pens?: [number, number] }> = {};
        for (const t of b.rounds[ri].ties) {
          if (!t.away || t.winner) continue;
          const neutral = b.rounds[ri].name === 'Final';
          let score: [number, number], pens: [number, number] | undefined;
          if (t.home === OWN || t.away === OWN) {
            const m = brabo(w, date, plan, comp, t.home, t.away, auto, `${b.name}, ${b.rounds[ri].name}`, ++played as 1 | 2, neutral);
            score = m.score; pens = m.pens;
          } else {
            score = otherResult(w, t.home, t.away, `${date}:${b.id}:${ri}`, neutral);
            if (score[0] === score[1]) pens = penalties(rating(w, t.home), rating(w, t.away), rng(hashSeed(sd(w, date), 'pens', t.home, t.away)));
          }
          res[`${t.home}-${t.away}`] = { score, pens };
        }
        b = advance(b, ri, res);
        // World 2 (league spec §6): each Big Cup round is drawn "up" once the one before it is complete.
        if (worldOf(w.season) === 2 && b.id === 'bigcup') b = redrawUp(b, ri + 1, (id) => w.season.tierOf[id] ?? POOL, rng(hashSeed('bigcup-draw', String(w.season.id), String(ri + 1))), OWN);
      }
      set(b);
    }
  }
  return played - before;
}

function tablesNow(w: World): Record<Tier, Row[]> {
  const out = {} as Record<Tier, Row[]>;
  for (const t of shapeOf(w.season).divisions) out[t] = standings(w.season.results[t], Object.keys(w.season.tierOf).filter((id) => w.season.tierOf[id] === t), w.season.deductions, rulesOf(w).awayWin);
  return out;
}
function playoffSemis(w: World, date: DayKey, plan: DayPlan, auto: boolean, before: number): number {
  const tables = tablesNow(w);
  let n = 0;
  for (const t of shapeOf(w.season).divisions.filter((x) => x > 1)) {
    const semis = playoffPairs(tables[t], rulesOf(w).upDown);
    const winners: string[] = [];
    for (const [h, a] of semis) {
      let score: [number, number], pens: [number, number] | undefined;
      if (h === OWN || a === OWN) { const m = brabo(w, date, plan, 'playoff', h, a, auto, 'Playoff semi-final', (before + ++n) as 1 | 2); score = m.score; pens = m.pens; }
      else { score = otherResult(w, h, a, `${date}:po`); if (score[0] === score[1]) pens = penalties(rating(w, h), rating(w, a), rng(hashSeed(sd(w, date), 'popens', h))); }
      winners.push(resultOf(score, pens) === 'L' ? a : h);
    }
    w.season.playoffs[t] = { semis, semiWinners: winners, final: [winners[0], winners[1]] };
  }
  return n;
}
function playoffFinals(w: World, date: DayKey, plan: DayPlan, auto: boolean, before: number): number {
  let n = 0;
  for (const t of shapeOf(w.season).divisions.filter((x) => x > 1)) {
    const po = w.season.playoffs[t];
    if (!po?.final) continue;
    const [h, a] = po.final;
    let score: [number, number], pens: [number, number] | undefined;
    if (h === OWN || a === OWN) { const m = brabo(w, date, plan, 'playoff', h, a, auto, 'Playoff final', (before + ++n) as 1 | 2, true); score = m.score; pens = m.pens; }
    else { score = otherResult(w, h, a, `${date}:pof`, true); if (score[0] === score[1]) pens = penalties(rating(w, h), rating(w, a), rng(hashSeed(sd(w, date), 'pofpens', h))); }
    po.winner = resultOf(score, pens) === 'L' ? a : h;
  }
  return n;
}
/** Out of every competition on a cup day: the reserves play a friendly that counts for nothing. */
function friendly(w: World, date: DayKey, plan: DayPlan, auto: boolean) {
  const tier = w.season.tierOf[OWN];
  const pool = [...w.clubs.values()].filter((c) => c.id !== OWN && !c.folded && Math.abs(c.tier - tier) <= 1);
  const opp = pick(rng(hashSeed(sd(w, date), 'friendly')), pool).id;
  brabo(w, date, plan, 'friendly', OWN, opp, auto, 'Friendly');
}

function endSeason(w: World, date: DayKey) {
  if (worldOf(w.season) === 2) return endSeason2(w, date);
  const tables = tablesNow(w);
  const winners: Partial<Record<Tier, string>> = {};
  for (const t of TIERS) if (w.season.playoffs[t]?.winner) winners[t] = w.season.playoffs[t]!.winner;
  // Brabo's form over the last 28 days: the parity rating of its average real night (one per date).
  const form = new Map<DayKey, AxisValues>();
  for (const x of [...w.past, ...w.matches]) if (!x.rotation && x.date > addDays(date, -28) && x.date <= date && !form.has(x.date)) form.set(x.date, x.values);
  const double = doubleUp(tables, OWN, w.season.tierOf[OWN], formRating([...form.values()]), form.size, TIER_BANDS);
  const moves = seasonEnd(tables, winners, double, rulesOf(w).upDown);
  w.season.final = { tables, up: moves.up, down: moves.down, ...(double ? { double } : {}) };
  if (double) w.news.push({ id: `${date}:double`, date, kind: 'club', text: `Double promotion. Champions of ${tierName(double.from)}, and playing like a side rated ${double.rating} over the last four weeks, above anything in ${tierName((double.from - 1) as Tier)}: Brabo go straight up to ${tierName((double.from - 2) as Tier)}. ${clubById(double.swap).name} finished fourth from bottom there and go down with the bottom three to make room.` });
  const tierOf = applyMoves(w.season.tierOf, moves);
  const r = rng(hashSeed('world', String(w.save.season)));
  const turn = worldTurn([...w.clubs.values()].map((c) => {
    const def = clubById(c.id);
    return { id: c.id, name: def.name, rating: c.rating, tier: tierOf[c.id] ?? c.tier, kind: def.kind, abilities: def.known.map((a) => a.name) };
  }), r, { trouble: rulesOf(w).trouble, bands: TIER_BANDS });
  const moved = applyChanges([...w.clubs.values()], turn.changes);
  for (const c of moved) w.clubs.set(c.id, { ...c, tier: tierOf[c.id] ?? c.tier, style: turn.styles[c.id] ?? c.style });
  turn.headlines.forEach((x, i) => w.news.push({ id: `${date}:world:${i}`, date, kind: 'world', text: x.text, clubId: x.clubId }));
  refreshOldSelves(w, date);
  const promoted = Boolean(moves.up[w.season.tierOf[OWN]]?.includes(OWN));
  const base = seasonMoney(w, date, tables, moves.up, (promoted ? w.season.tierOf[OWN] - 1 : w.season.tierOf[OWN]) as Tier);
  treeSeasonEnd(treeCtx(w), date, tables, Boolean(moves.up[w.season.tierOf[OWN]]?.includes(OWN)), base);
  tenancyAtSeasonEnd(w, date, tables);
  const nowTier = tierOf[OWN];
  if (moves.up[w.season.tierOf[OWN]]?.includes(OWN) && crestStepFor(nowTier) > w.save.crest.step) w.save.crestPending = crestStepFor(nowTier);
  globeSeasonEnd(w, date, w.save.season);
  const ev = nextEvent(w.save.season, w.save.eventState, rng(hashSeed('event', String(w.save.season))));
  w.save.eventState = ev.state;
  w.save.phase = 'event';
  w.save.event = { id: ev.id, days: ev.days };
  w.save.day = 1;
  w.season.nextDeductions = turn.deductions;
}

/**
 * World 2's season end (ledger O38, league spec §7, §8): the table moves every club (top two and the playoff winner up,
 * the bottom three down, Brabo included), Brabo's level check may add one step, Division Eight's bottom three swap
 * with the pool. Clubs drift by finish and the lore events, clipped to their division's band. Old Selves of real
 * months join and retire. Then the same money, tree, ground and event as the old world, keyed to stages.
 */
function endSeason2(w: World, date: DayKey) {
  const tables = tablesNow(w);
  const shape = shapeOf(w.season);
  const winners: Partial<Record<Tier, string>> = {};
  for (const t of shape.divisions) if (w.season.playoffs[t]?.winner) winners[t] = w.season.playoffs[t]!.winner;
  const live = [...w.clubs.values()].filter((c) => !c.folded);
  const pool = live.filter((c) => c.pool).map((c) => ({ id: c.id, rating: c.rating }));
  // The level check's rate: Brabo's level night against a division's clubs, worked out only when it is needed.
  let lv: LevelNight | undefined | null = null;
  const rateIn = (d: number) => {
    if (lv === null) lv = levelNightIn(w, date);
    if (!lv) return 0.4; // no real nights: the check cannot move Brabo either way
    return winRate(lv, live.filter((c) => !c.pool && c.tier === d && c.id !== OWN).map((c) => ({ id: c.id, rating: c.rating, style: c.style }))).w;
  };
  const moves = seasonEnd2(tables, winners, { own: OWN, pool, rateIn, upDown: rulesOf(w).upDown });
  w.season.final = { tables, up: moves.up, down: moves.down, ...(moves.level ? { level: moves.level } : {}), pool: moves.pool };
  const from = w.season.tierOf[OWN];
  if (moves.level) {
    const l = moves.level, pct = Math.round(l.rate * 100);
    w.news.push({ id: `${date}:level`, date, kind: 'club', text: l.dir === 'up'
      ? `Up two. Champions of ${shape.name(from)}, and the last four weeks would still win ${pct}% of matches in ${shape.name(l.to + 1)}: Brabo go straight past it to ${shape.name(l.to)}. ${clubById(l.swap).name} finished just above the drop there and go down a division to make room.`
      : `Down two. Relegated from ${shape.name(from)}, and the last four weeks would win only ${pct}% of matches in ${shape.name(l.to - 1)}: Brabo go down to ${shape.name(l.to)}. ${clubById(l.swap).name} go up a division in their place.` });
  }
  const divOf = applyMoves2(w.season.tierOf, moves);
  const old = (id: string) => Boolean(w.clubs.get(id)?.old);
  const skip = (id: string) => id === OWN || old(id);
  const r = rng(hashSeed('world', String(w.save.season)));
  const turn = worldTurn(live.map((c) => {
    const def = clubById(c.id);
    return { id: c.id, name: def.name, rating: c.rating, tier: (divOf[c.id] ?? POOL) as Tier, kind: c.old ? 'old' : c.id === OWN ? 'own' : def.kind, abilities: def.known.map((a) => a.name) };
  }), r, { form: false, trouble: rulesOf(w).trouble, bands: Object.fromEntries(PYRAMID.map((p) => [String(p.no), p.band])) });
  const settled = settle2(live, [...turn.changes, ...tableDrift(tables, skip)], (id) => divOf[id], skip);
  for (const c of settled) {
    const d = divOf[c.id];
    w.clubs.set(c.id, { ...c, tier: (d ?? POOL) as Tier, pool: d === undefined ? true : undefined, style: turn.styles[c.id] ?? c.style });
  }
  turn.headlines.forEach((x, i) => w.news.push({ id: `${date}:world:${i}`, date, kind: 'world', text: x.text, clubId: x.clubId }));
  if (moves.pool.out.length) w.news.push({ id: `${date}:pool`, date, kind: 'world', text: `Out of the league: ${moves.pool.out.map((id) => clubById(id).name).join(', ')}. In from abroad: ${moves.pool.in.map((id) => clubById(id).name).join(', ')}.` });
  refreshOldSelves2(w, date);
  const to = w.clubs.get(OWN)!.tier;
  const up = to < from;
  const base = seasonMoney(w, date, tables, moves.up, stageOf(to));
  treeSeasonEnd(treeCtx(w), date, tables, up, base);
  tenancyAtSeasonEnd(w, date, tables, up);
  if (up && crestStepFor(stageOf(to)) > w.save.crest.step) w.save.crestPending = crestStepFor(stageOf(to));
  globeSeasonEnd(w, date, w.save.season);
  const ev = nextEvent(w.save.season, w.save.eventState, rng(hashSeed('event', String(w.save.season))));
  w.save.eventState = ev.state;
  w.save.phase = 'event';
  w.save.event = { id: ev.id, days: ev.days };
  w.save.day = 1;
  w.season.nextDeductions = turn.deductions;
}
/** World 2: months with real data join as Old Selves (at most seven), each in the division its rating falls in. */
function refreshOldSelves2(w: World, date: DayKey) {
  const current = [...w.clubs.values()].filter((c) => c.old && !c.folded).map((c) => ({ ...c.old!, id: c.id }));
  const seen = [...(w.save.retired ?? []).map((o) => o.month ?? ''), ...current.map((o) => o.month ?? '')];
  const turn = rollOldSelves2(current, monthsFromHealth2(w.h, date), seen);
  if (!turn.joined.length && !turn.retired.length) return;
  const seated = seatOldSelves([...w.clubs.values()], turn, (c) => c.id !== OWN && !c.old && !c.id.startsWith('os'), POOL);
  for (const c of seated) w.clubs.set(c.id, c as FbClub);
  if (turn.retired.length) w.save.retired = [...(w.save.retired ?? []), ...turn.retired.map((o) => ({ ...o, id: `retired:${o.month ?? o.name}` }))];
  for (const o of turn.joined) w.news.push({ id: `${date}:old:${o.month}`, date, kind: 'club', clubId: o.id, text: `${o.name} join the league in ${shapeOf(w.season).name(o.tier)}: a month of your own nights, rated ${o.rating}.` });
}
/** Finished months before `before`'s month, each with its real nights (rotation nights and unlogged nights left out). */
export function monthsFromHealth2(h: Health, before: DayKey) {
  const cur = before.slice(0, 7);
  const by = new Map<string, AxisValues[]>();
  for (const [d, day] of h.days) {
    const m = d.slice(0, 7);
    if (m >= cur || usesRotation(day?.status)) continue;
    const v = nightFor(h, d);
    if (Object.values(v.flags).filter(Boolean).length >= 4) continue;
    by.set(m, [...(by.get(m) ?? []), v.values]);
  }
  return [...by].map(([month, values]) => ({ month, values }));
}
/**
 * Brabo's level (league spec §7): the median of the real nights in the last 28 days (rotation and unlogged nights
 * left out) with what it would carry tonight: the armband, the week's stack, its abilities, the ground's, the tree's
 * and its loans'. Undefined with no real night. Reads the world without changing it.
 */
export function levelNightIn(w: Pick<World, 'h' | 'save' | 'bundles'>, date: DayKey): LevelNight | undefined {
  const nights: AxisValues[] = [];
  for (let d = addDays(date, -(LEVEL_DAYS - 1)); d <= date; d = addDays(d, 1)) {
    const day = w.h.days.get(d);
    if (!day || usesRotation(day.status)) continue;
    const v = nightFor(w.h, d);
    if (Object.values(v.flags).filter(Boolean).length >= 4) continue;
    nights.push(v.values);
  }
  const values = typicalNight(nights);
  if (!values) return undefined;
  const save = structuredClone(w.save); // tree boosts are spent by a real match, never by a probe
  const slots = new Set(save.slots);
  const ctx: MatchCtx = { comp: 'league', derby: false, auto: false, firstMeeting: false };
  const done = [...w.bundles.values()].filter((b) => b.done).map((b) => b.id);
  const loans = globeOf(save).loans.map((l) => l.key);
  return {
    values, nights: nights.length,
    captain: slots.has('armband') ? save.captain : undefined,
    stack: slots.has('stack') ? save.earned.filter((e) => e.date > addDays(date, -7)).length : 0,
    abilities: [...braboAbilities(save.slots), ...groundAbilities(done), ...treeAbilities({ save, bundles: w.bundles }, ctx, true).abilities, ...loanAbilities(save, loans, date, globeRules(save, w.bundles.values()).loan)],
  };
}

/**
 * Brabo's level and placing now (league spec §7, decision 3a): gathers the last 28 days' real nights and tonight's
 * bonuses from the save, then simulates them against each division given. LG-4 calls this to start the new world,
 * and after any absence of 28 days or more. Reads only.
 */
export async function braboPlacing(date: DayKey, divisions: Record<number, SimClub[]>): Promise<Placing & { night?: LevelNight }> {
  const save = await db.fbSave.get('save');
  if (!save) return { ...placeBrabo(undefined, divisions) };
  const h = await loadHealth();
  const bundles = new Map((await db.fbBundles.toArray()).map((b) => [b.id, b]));
  const night = levelNightIn({ h, save, bundles }, date);
  return { ...placeBrabo(night, divisions), ...(night ? { night } : {}) };
}

/** The newest finished month joins the Old Selves; the weakest retires. */
function refreshOldSelves(w: World, date: DayKey) {
  const olds = [...w.clubs.values()].filter((c) => c.old);
  const { filled, retired } = rollOldSelves(olds.map((c) => c.old!), monthsBefore(w, date), olds.map((c) => ({ id: c.id, tier: c.tier })));
  for (const o of filled) { const c = w.clubs.get(o.id)!; w.clubs.set(o.id, { ...c, rating: o.rating, old: o }); }
  if (retired.length) w.save.retired = [...(w.save.retired ?? []), ...retired.map((o) => ({ ...o, id: `retired:${o.month ?? o.name}` }))];
}
export function monthsFromHealth(h: Health, before: DayKey) {
  const cur = before.slice(0, 7);
  const by = new Map<string, AxisValues[]>();
  for (const [d] of h.days) {
    const m = d.slice(0, 7);
    if (m >= cur) continue;
    const v = nightFor(h, d);
    if (Object.values(v.flags).filter(Boolean).length >= 4) continue;
    by.set(m, [...(by.get(m) ?? []), v.values]);
  }
  return [...by].map(([month, values]) => ({ month, values }));
}
const monthsBefore = (w: World, date: DayKey) => monthsFromHealth(w.h, date);

function playEventDay(w: World, date: DayKey, auto: boolean) {
  const ev = w.save.event!;
  // Engine 2, layer 4: youngsters now come to the Sunday trials (spec §9.2), not a season intake.
  const plan: DayPlan = { day: w.save.day, kind: 'event', event: ev.id, round: `${EVENTS[ev.id].name}, day ${w.save.day} of ${ev.days}` };
  if (ev.id === 'worldcup') worldCupDay(w, date, plan, auto);
  else if (ev.id === 'clubworld') clubWorldDay(w, date, plan, auto);
  else {
    const pool = [...w.clubs.values()].filter((c) => c.id !== OWN && !c.folded && (ev.id !== 'oldselves' || c.old));
    const opp = pick(rng(hashSeed(date, 'event', ev.id)), pool.length ? pool : [...w.clubs.values()].filter((c) => c.id !== OWN)).id;
    brabo(w, date, plan, 'event', OWN, opp, auto, plan.round);
  }
  w.save.day++;
  if (w.save.day > ev.days) {
    const next = w.save.season + 1;
    const ded = w.season.nextDeductions ?? {};
    w.oldSeasons.push(w.season);
    const top4 = w.season.final?.tables[1].slice(0, 4).map((r) => r.id);
    w.season = worldOf(w.season) === 2 ? newSeason2(next, addDays(date, 1), [...w.clubs.values()], ded, top4) : newSeason(next, addDays(date, 1), [...w.clubs.values()], ded, top4);
    congressSits(w, next, addDays(date, 1));
    w.save.season = next;
    w.save.phase = 'season';
    w.save.event = undefined;
    w.save.day = 1;
  }
}

/** Each awakened axis plays with its trait: +1 on its own chance type. */
const awakenedTraits = (save: FbSave) => (Object.keys(save.awakenings) as (keyof typeof save.awakenings)[])
  .filter((a) => save.awakenings[a]?.length)
  .map((a) => ({ id: `trait:${a}`, name: TRAIT[a], axis: a, d: 1, when: 'own-type' as const }));

/** Release 1 (C2, R3 q-meds3): the physio storyline opens on an injury and closes when you're cleared; a full week earns a clean bill. */
function physioNews(w: World, meds: MedDay[], date: DayKey, state: 'fit' | 'knock' | 'injury', heal: number) {
  const before = physio(meds, addDays(date, -1), w.save.physioRoom, heal).state;
  const say = (id: string, text: string) => { if (!w.news.some((n) => n.id === id)) w.news.push({ id, date, kind: 'club', text }); };
  if (state === 'injury' && before !== 'injury') {
    const week = meds.filter((d) => !d.allTaken && d.date >= addDays(date, -7)).length >= 3;
    say(`${date}:physio`, `Physio room: ${week ? 'three missed medicine days this week' : 'two missed medicine days in a row'}. Rest drops by 4 for two matches while the physio works on it.`);
  } else if (state === 'fit' && before === 'injury') {
    say(`${date}:cleared`, 'Cleared by the physio. Back in full training.');
  }
  if (weekday(date) === 6 && medItems(w.h.settings.checklist ?? []).length && cleanBill(meds, date)) say(`${date}:cleanbill`, 'A clean bill of health: every medicine kept this week. The physio has nothing to do.');
}

/** One Brabo match: build the input from Health, play it, store it. */
/** Brabo's match, played whole. */
const brabo = (w: World, date: DayKey, plan: DayPlan, comp: Comp, home: string, away: string, auto: boolean, round?: string, leg?: 1 | 2, neutral = false): StoredMatch =>
  braboMaybe(w, date, plan, comp, home, away, auto, round, leg, neutral, false)!;
/** Brabo's match; with `wait`, a league match is set up and left waiting for the owner (null). */
function braboMaybe(w: World, date: DayKey, plan: DayPlan, comp: Comp, home: string, away: string, auto: boolean, round?: string, leg?: 1 | 2, neutral = false, wait = false): StoredMatch | null {
  const oppId = home === OWN ? away : home;
  const night = nightFor(w.h, date);
  const day = w.h.days.get(date);
  const rotation = usesRotation(day?.status);
  const sick = day?.status === 'sick';
  const recent = [...w.past, ...w.matches].filter((m) => !m.rotation && m.date > addDays(date, -28) && m.date < date);
  const raw = rotation ? rotationShape(recent.map((m) => m.values)) : night.values;
  // Engine 2: tonight = 70% today + 30% squad. A sick day plays the rotation squad (the bench) at 100% squad value.
  // An axis with no data tonight keeps its no-data value: the squad does not paper over a blank.
  const tonight = nightOptsFor(w.save, w.roster, w.h, date, oppId, raw, rotationOf(w.save, w.bundles.values()));
  // Layer 4: tonight's loans (they play only if their unit was logged), False nine and Two fronts.
  const lastLeague = comp === 'continental' ? [...w.matches].reverse().find((x) => x.date === date && x.comp === 'league') : undefined;
  const world = globeNight(w.save, w.bundles.values(), date, rotation ? {} : night.flags, sick || rotation, restedForLeague(w.roster, lastLeague));
  const team = squadNight(w.roster, raw, sick, { ...tonight.opts, ...world });
  const blended = rotation && !sick ? raw : team.values;
  const flags = rotation ? {} : { ...night.flags };
  const values = { ...blended };
  for (const a of AXES) if (flags[a]) values[a] = raw[a];
  for (const c of w.save.contracts ?? []) { const a = habitById(c.habit).axis; if (!flags[a]) values[a] = Math.min(20, Math.round(values[a] * c.weight)); }
  for (const hb of w.save.sold ?? []) { const a = habitById(hb).axis; values[a] = 10; flags[a] = 'no-data'; }
  // Release 1 (R3 b-lowlog): on a low-log week, with the chosen habit logged, the rest plays at your typical level.
  if (!rotation && lowLogOn(w.save.lowLog, date)) {
    const ll = lowLogNight(values, flags, typicalShape(recent.map((x) => x.values)), w.save.lowLog.axis);
    if (ll.applied) { Object.assign(values, ll.values); for (const a of AXES) if (!ll.flags[a]) delete flags[a]; }
  }
  const pre: Mod[] = [];
  const meds = Array.from({ length: 9 }, (_, i) => addDays(date, -(i + 1))).map((d) => ({ date: d, allTaken: medsTaken(w.h, d) }));
  const heal = healNow(w.save, w.bundles);
  const doc = physio(meds, date, w.save.physioRoom, heal);
  pre.push(...doc.mods);
  physioNews(w, meds, date, doc.state, heal);
  const nightOuts = [...w.h.days.values()].filter((d) => d.nightOut).map((d) => d.date);
  if (cards(nightOuts, date).red) pre.push(redCardMod(values.Rest));
  // Release 1 (R3 b-morale): after a defeat the dressing room responds, +1 on the axis that let you down (never on a rotation night).
  const prevMatch = [...w.past, ...w.matches].filter((x) => x.date < date).pop();
  if (!rotation) { const dr = dressingRoom(prevMatch); if (dr) pre.push(dr); }
  // The comeback lift: +1, at most, on the first fully logged day after a gap (never on a rotation night).
  if (!rotation && comebackOn(w.h, date)) { const lift = comebackLift(values, flags); if (lift) pre.push(lift); }
  if (armbandHarmony(w.save.captains) && w.save.harmonyAt !== w.save.captains.length) {
    for (const a of AXES) pre.push({ axis: a, d: 1, why: 'Harmony', kind: 'ability' });
    w.save.harmonyAt = w.save.captains.length;
  }
  const club = w.clubs.get(oppId);
  const def = clubById(oppId);
  const rival = w.save.rivals.find((r) => r.clubId === oppId);
  const derby = Boolean(rival) || oppId === 'zur' || oppId === legendId();
  const opp = opponentFor(def, { rating: club?.rating, derby });
  const firstMeeting = !w.save.met.includes(oppId);
  const lastMine = [...w.past, ...w.matches].filter((m) => m.date < date).pop();
  const braboTier = w.season.tierOf[OWN];
  const ctx: MatchCtx = {
    comp, derby, auto, firstMeeting, matchday: plan.matchday,
    last5: (plan.matchday ?? 0) >= leagueMatchdays(worldOf(w.season)) - 4, vsHigher: (club?.tier ?? 6) > braboTier,
    familiarAxis: club?.old?.best, prevBest: lastMine ? bestAxis(lastMine.values) : undefined,
    final: /(^|, )Final$|Playoff final/.test(round ?? ''),
  };
  const conds = conditions(w.h, date, night.input, auto);
  if ((plan.matchday ?? 0) % 7 === 0 && plan.matchday) conds.push('every-7th');
  if ([...w.past, ...w.matches].some((m) => m.opp === oppId && m.result === 'L')) conds.push('beat-them-before');
  let braboHome = neutral ? home === OWN : oppId === 'zur' && !w.save.moved ? false : home === OWN;
  if (braboHome && lockedOutTonight(w, plan, date)) braboHome = false;
  const seed = hashSeed(date, home, away, comp, String(leg ?? 0), ...slotKey(w.slot));
  const tree = treeAbilities(w, ctx, braboHome);
  const slots = new Set(w.save.slots);
  // Chances are sized against your typical shape: the median of the real nights in the last 28 days (one per date).
  const nights = new Map<DayKey, AxisValues>();
  for (const x of recent) if (!nights.has(x.date)) nights.set(x.date, x.values);
  const input: MatchInput = {
    seed, values, opp, home: braboHome, neutral,
    typical: typicalFor([...nights.values()]),
    // The rating rules this match is set up under: stamped so a paused match finishes by the rules it began with.
    parity: 2,
    fog: AXES.filter((a) => flags[a] === 'not-logged'),
    fuelSpread: rotation || flags.Fuel ? 0 : nightOutSpread(w.h, date, night.input.targets),
    captain: slots.has('armband') ? w.save.captain : undefined,
    stack: slots.has('stack') ? w.save.earned.filter((e) => e.date > addDays(date, -7)).length : 0,
    // Engine 2: a player's traits play while it starts (an Awakening's trait became its player's first limit break).
    abilities: [...braboAbilities(w.save.slots), ...(w.save.engine === 2 ? traitAbilities(team.xi, w.roster) : awakenedTraits(w.save)), ...groundAbilities(doneBundles(w)), ...tree.abilities, ...loanAbilities(w.save, team.loansPlayed, date, globeRules(w.save, w.bundles.values()).loan)],
    bench: benchFor(w, date), pre, conds, ctx,
    condCap: rotation ? undefined : condCapFor(w.h, date),
    rival: rival ? twistOf(rival) : oppId === legendId() ? rivalTwist(legendId(), 'legend') : undefined,
  };
  const prep: PausedPrep = {
    day: plan.day, matchday: plan.matchday, comp, round, home, away, oppId, braboHome, values, flags, xi: team.xi,
    setPiece: tonight.setPiece, tactic: tonight.tactic, nudges: team.nudges.length ? team.nudges : undefined, loansPlayed: team.loansPlayed,
    rotation, sick, auto, derby, vsHigher: Boolean(ctx.vsHigher), rival: Boolean(rival) || oppId === legendId(), oldSelf: Boolean(club?.old), braboTier,
    ...(w.slot ? { slot: w.slot } : {}),
  };
  if (comp === 'league') {
    // Matchday (spec §2.3–2.5): a league night has calls, and plays the plan (tempo, the read, a card) set for it.
    const p: PausedMatch = {
      id: matchIdFor(date, leg, w.slot), date, season: w.save.season, input: { ...input, rival: undefined } as PausedMatch['input'],
      rivalTwist: rival ? 'rival' : oppId === legendId() ? 'antigoon' : undefined,
      style: club?.style ?? def.style, scouted: readScouted(scoutLevel(w.save, oppId, date)), prep, picks: [],
    };
    w.probe?.push({ date, input: pausedInput(p, w.save, { watch: false }), comp, oppId, round });
    if (wait) {
      // Set up and stopped: the owner watches or skips it; the next 4 am finishes it with the assistant.
      w.save.paused = p;
      return null;
    }
    const full = pausedInput(p, w.save, { watch: false });
    return braboTail(w, date, prep, playMatch(full), full.plan, undefined, readFor(p, w.save).line, leg);
  }
  w.probe?.push({ date, input, comp, oppId, round });
  const events = playMatch(input);
  let pens: [number, number] | undefined;
  if (events.score[0] === events.score[1] && comp !== 'friendly' && comp !== 'event' && !(comp === 'worldcup' && leg) && !(comp === 'continental' && round?.includes('league phase'))) pens = penalties(values.Routine * 5, opp.rating, rng(hashSeed(String(seed), 'pens')));
  return braboTail(w, date, prep, events, undefined, undefined, undefined, leg, pens);
}

/** After the whistle: store the match and everything it moves (morale, rivals, players, the tree, the news). */
function braboTail(w: World, date: DayKey, prep: PausedPrep, events: MatchEvents, played?: MatchPlan, half2?: Tactic, read?: string, leg?: 1 | 2, pens?: [number, number]): StoredMatch {
  const { comp, round, home, away, oppId, braboHome, values, flags, rotation, sick, auto, derby } = prep;
  const def = clubById(oppId);
  const club = w.clubs.get(oppId);
  const braboTier = prep.braboTier;
  const ctx = { vsHigher: prep.vsHigher };
  const team = { xi: prep.xi, nudges: prep.nudges ?? [], loansPlayed: prep.loansPlayed };
  const tonight = { setPiece: prep.setPiece, tactic: prep.tactic };
  const plan = { day: prep.day, matchday: prep.matchday };
  const rival = prep.rival;
  const score: [number, number] = home === OWN ? events.score : [events.score[1], events.score[0]];
  const mineScore = events.score;
  const m: StoredMatch = {
    id: matchIdFor(date, leg, prep.slot ?? 0), date, season: w.save.season, day: plan.day, comp, round, home, away, opp: oppId, braboHome,
    values, flags, events, score: mineScore, pens, result: resultOf(mineScore, pens),
    xi: team.xi, credits: creditsFor(events, team.xi, def.name, undefined, tonight.setPiece),
    tactic: tonight.tactic, nudges: team.nudges.length ? team.nudges : undefined,
    watched: false, rotation, auto, leg, derby, big: derby || comp !== 'league' || plan.matchday === leagueMatchdays(worldOf(w.season)),
  };
  if (comp === 'league' && played) {
    // Matchday (spec §2.4–2.6): the plan it played, a card used up, and after a win the pick of three.
    const pl = w.save.plans?.[date];
    const card = pl?.card && (w.save.tacticCards ?? []).includes(pl.card) ? pl.card : undefined;
    m.plan = { tactic: prep.tactic.pick, tempo: played.tempo ?? 'normal', width: pl?.width ?? 'middle', ...(card ? { card } : {}), ...(half2 ? { half2 } : {}), ...(read ? { read } : {}) };
    if (card) { const k = w.save.tacticCards!.indexOf(card); w.save.tacticCards = w.save.tacticCards!.filter((_, i) => i !== k); }
    if (m.result === 'W') {
      const unscouted = Object.entries(w.season.tierOf).filter(([id, t]) => t === braboTier && id !== OWN && id !== oppId && !isScouted(w.save, id, date)).map(([id]) => id).sort();
      m.pick = { tiles: pickOffer(m.id, unscouted, (w.save.tacticCards ?? []).length, CAST_IDS) };
    }
  }
  if (!w.save.met.includes(oppId)) w.save.met = [...w.save.met, oppId];
  const last4 = [...w.past, ...w.matches].filter((x) => x.date < date).slice(-4).map((x) => x.result);
  const finalWon = m.result === 'W' && round === 'Final';
  for (const mo of momentsOf({ events, result: m.result, home: braboHome, derby, vsHigher: Boolean(ctx.vsHigher), finalWon, last4, auto })) {
    const ab = abilityFor(mo);
    if (ab && !w.save.earned.some((e) => e.id === ab.id)) w.save.earned = [...w.save.earned, { id: ab.id, date }];
  }
  const meeting = (x: StoredMatch): Meeting => ({ clubId: x.opp, result: x.result, comp: x.comp, final: /Final$|Playoff final/.test(x.round ?? ''), derby: x.derby, lastDay: x.comp === 'league' && plan.matchday === leagueMatchdays(worldOf(w.season)) && x.id === m.id, margin: Math.abs(x.score[0] - x.score[1]) });
  // Rivals are clubs you keep meeting: never friendlies, event nights or World Cup nations.
  if (comp !== 'friendly' && comp !== 'event' && comp !== 'worldcup') {
    const hist = [...w.past, ...w.matches].filter((x) => x.comp !== 'friendly' && x.date < date).map(meeting);
    const r = afterMatch(w.save.rivals, hist, meeting(m), date, bestAxis(m.values), weakestAxis(m.values));
    if (r.rivals !== w.save.rivals) w.save.rivals = r.rivals;
    if (r.born) {
      w.save.rivalMoments = [...(w.save.rivalMoments ?? []), r.born.clubId];
      w.news.push({ id: `${date}:rival:${r.born.clubId}`, date, kind: 'back', clubId: r.born.clubId, text: `A rival is born. ${clubById(r.born.clubId).name}: ${howText(r.born).toLowerCase()}` });
    }
    if (r.faded) w.news.push({ id: `${date}:fade:${r.faded}`, date, kind: 'club', clubId: r.faded, text: `Five wins in a row: the rivalry with ${clubById(r.faded).name} fades.` });
  }
  // Release 1 (C6): the first match back after Rotation XI nights reports how they did while you were away.
  if (!rotation) {
    const before = [...w.past, ...w.matches].filter((x) => x.date < date);
    const away: StoredMatch[] = [];
    for (let k = before.length - 1; k >= 0 && before[k].rotation; k--) away.unshift(before[k]);
    const line = backLine(away);
    if (line && !w.news.some((n) => n.id === `${date}:back`)) w.news.push({ id: `${date}:back`, date, kind: 'club', text: line });
  }
  // League pace: research from league matches comes once a day, from the day's first league match.
  const lessonDue = comp !== 'league' || ![...w.past, ...w.matches].some((x) => x.date === date && x.comp === 'league');
  // Engine 2 has no new Awakenings: a player's limit breaks take their place (layer 2).
  w.matches.push(m);
  w.roster = creditMatch(w.roster, m);
  globeMatch(w.save, m, team.loansPlayed);
  if (lessonDue) treeMatch(w, m);
  afterNight(w, m, sick, def.name);
  const run = [...w.past, ...w.matches].filter((x) => !x.rotation);
  let streak = 0;
  for (let k = run.length - 1; k >= 0 && run[k].result === m.result; k--) streak++;
  const situation = situationOf(m, { rival: Boolean(rival) || oppId === legendId(), oldSelf: Boolean(club?.old), streak });
  const lines = matchLines(m, factsFor(m, braboTier, streak, situation), w.used);
  w.news.push(...lines);
  w.used.push(...lines.map((n) => ({ id: n.lineId!, date: m.date })));
  return { ...m, score: score, pens: pens && home !== OWN ? [pens[1], pens[0]] : pens };
}

// ---- The club between matches (Part 4) ----
/** A youngster's day counts only through the real habit it is linked to (spec §9.2): never a day nothing was done. */
const youthDone = (w: World, y: FbSquadRow, date: DayKey) => linkedLogged(w.h, y.link, date);
/** Promoted youngsters whose habit was done that day come off the bench at 60'. */
function benchFor(w: World, date: DayKey) {
  return w.squad.filter((y) => y.status === 'promoted' && youthDone(w, y, date)).slice(0, 2).map((y) => ({ axis: y.axis, plus: 2 }));
}
/** Every day: contracts count kept days; youngsters count logged days and may reach the bench. */
function clubDay(w: World, date: DayKey) {
  const input = axisInputFor(w.h, date);
  // A save from before contracts existed starts them now, for every habit still at the club.
  if (!w.save.contracts) w.save.contracts = contractsFor(date).filter((c) => !(w.save.sold ?? []).includes(c.habit));
  // Release 1 (C6): days on the injury list (sick, injured, a break) freeze contracts, as they already freeze form.
  if (w.save.contracts && !onInjuryList(w.h.days.get(date)?.status)) w.save.contracts = w.save.contracts.map((c) => {
    const next = contractDay(c, date, keptOn(c.habit, input));
    if (next.state !== c.state) w.news.push({ id: `${date}:contract:${c.habit}`, date, kind: 'club', text: next.state === 'due' ? `${habitById(c.habit).label} has earned a new contract. Renew it on the Deals page.` : `${habitById(c.habit).label} missed its contract line and is transfer-listed. No penalty in matches.` });
    return next;
  });
  // Layer 4: an international break day pauses the season (no matches); the tree and the world still run.
  breakStarts(w, date);
  // The desk (step 4): the day's spends and its unspent dice, before the ground and the tree count the day.
  deskDay(w, date);
  groundDay(w, date, input);
  treeDay(treeCtx(w), date, w.squad.filter((y) => (y.status === 'growing' || y.status === 'promoted') && youthDone(w, y, date)).length);
  // The cast (step 4): bond points from the day's habits, asks met, and research from perks at Close the day.
  castDay(w, date);
  // Layer 4: loans come and go, trials, youngsters grow (sessions from the linked habit, growth from kept bedtimes).
  globeDay(w, date, w.save.season);
  w.ctx = playerCtx(w.h, w.save, w.squad);
  const before = w.roster;
  w.roster = playersDay(w.roster, w.h, w.ctx, date, academyIds(w.squad), false, rotationOf(w.save, w.bundles.values()).rules);
  const legends = [...w.roster.values()].filter((p) => p.clubLegend && !before.get(p.id)?.clubLegend).map((p) => ({ id: p.id, name: p.name, why: p.clubLegend!.why }));
  if (legends.length) treeLegends(treeCtx(w), date, legends);
  // Departed players sign for a club in our division (spec §6).
  const tier = w.season.tierOf[OWN];
  const seats = Object.entries(w.season.tierOf).filter(([id, t]) => t === tier && id !== OWN && !w.clubs.get(id)?.folded).map(([id]) => ({ id, name: clubById(id).name, rating: rating(w, id) }));
  const fa = signFreeAgents(w.roster, date, seats);
  w.roster = fa.roster;
  w.news.push(...fa.news);
  // Layer 4: nations for new players, duty on break days.
  globeAfterPlayers(w, date);
}

/** After a match: morale moves with the result; chemistry counts the night (not a sick night); a former player may score. */
function afterNight(w: World, m: StoredMatch, sick: boolean, oppName: string) {
  w.save.morale = moraleAfter(w.save.morale, m.result);
  // Release 1 (R3 b-morale): two defeats in a row bring a dressing-room meeting. A scene, never a penalty.
  if (meetingDue([...w.past, ...w.matches].filter((x) => x.date <= m.date).map((x) => x.result)) && !w.news.some((n) => n.id === `${m.date}:meeting`))
    w.news.push({ id: `${m.date}:meeting`, date: m.date, kind: 'club', text: 'Dressing-room meeting after two defeats. The captain speaks first: no blame, one job each for the next match. Nothing is taken off anyone.' });
  if (!sick && !m.rotation && w.save.chemOn !== m.date && m.xi?.length) {
    const rot = rotationOf(w.save, w.bundles.values());
    w.save.chem = chemistryAfter(w.save.chem ?? {}, m.xi, rot.rules, formationFor(w.save.sheet, rot));
    w.save.chemOn = m.date;
  }
  const theirs = m.events.chances.filter((c) => c.side === 'def' && !c.ok);
  const agents = [...w.roster.values()].filter((p) => p.freeAgent?.club === m.opp);
  if (theirs.length && agents.length) {
    const p = agents[hashSeed(String(m.events.seed), 'agent') % agents.length];
    w.news.push({ id: `${m.id}:agent-goal`, date: m.date, kind: 'club', clubId: m.opp, matchId: m.id, text: `${p.name} scores against us for ${oppName}, ${theirs[0].minute}′. The buy-back clause is still open.` });
  }
}
/** Three youngsters for a season, at most one exercise, plus one per youth slot won in a trade. */
export function youthIntake(season: number, date: DayKey, extra = 0, academy = false): FbSquadRow[] {
  const r = rng(hashSeed('youth', String(season)));
  const picked = intake(YOUTH_POOL, r, true);
  const more = extra ? intake(YOUTH_POOL.filter((y) => !picked.includes(y) && y.kind === 'habit'), r, false).slice(0, extra) : [];
  return [...picked, ...more].map((y, i) => ({ id: `s${season}:y${i}`, kind: 'youth' as const, name: y.name, axis: y.axis, potential: (academy ? Math.min(5, y.potential + 1) : y.potential) as 3 | 4 | 5, what: y.what, exercise: y.kind === 'exercise', season, logged: [], status: 'growing' as const })).map((y) => ({ ...y, id: `${y.id}:${date}` }));
}
/** Season end: income in, dodgy sponsors may fold, offers arrive for open slots. */
function seasonMoney(w: World, date: DayKey, tables: Record<Tier, Row[]>, up: Partial<Record<Tier, string[]>>, nextTier: Tier) {
  const div = w.season.tierOf[OWN];
  // Income, prizes, sponsors and offers keep their six-step tables: a world-2 division reads its stage (spec §9).
  const tier = stageIn(w.season, div);
  const pos = tables[div].findIndex((r) => r.id === OWN) + 1;
  const promoted = Boolean(up[div]?.includes(OWN));
  const r = rng(hashSeed('money', String(w.save.season)));
  const live = (w.save.sponsors ?? []).filter((s) => w.save.season - s.since < s.seasons);
  const folded = live.filter((s) => s.risk === 'dodgy' && dodgyCollapse(r));
  folded.forEach((s) => w.news.push({ id: `${date}:fold:${s.slot}`, date, kind: 'club', text: `${s.brand} have folded. The ${s.slot} slot is open again.` }));
  w.save.sponsors = live.filter((s) => !folded.includes(s));
  const sponsorMoney = w.save.sponsors.reduce((t, s) => t + s.perSeason, 0);
  const done = doneBundles(w);
  const shop = (done.includes('shop-2') ? 0.1 : 0) + (done.includes('shop-3') ? 0.1 : 0);
  const capShare = w.save.moved ? (capacityOf(true, done) + stageCapacity(done)) / TENANT_CAPACITY : 1;
  // World 2: every season's money by two thirds, so the pace per real day is unchanged (owner, 15 Nov).
  const k = seasonMoneyScale(w.season);
  const m3 = (x: number) => Math.round(x * k * 1000) / 1000;
  // The congress's `solidarity`: a share of Crown League TV money passed down to every league club below, Brabo included.
  const solidarity = m3(solidarityMoney(div, rulesOf(w).solidarity, w.season.tierOf, lastDivision(w.season), (LEAGUE.income as unknown as Record<string, { tv: number }>)['1'].tv));
  // A quarter of a deal's first season came on signing (O41 letter A): the season's end pays the rest.
  const advance = Math.round(w.save.sponsors.reduce((t, s) => t + (s.advance?.season === w.save.season ? s.advance.amount : 0), 0) * 1000) / 1000;
  const total = m3(incomeFor(tier, pos, promoted, sponsorMoney, capShare * (1 + shop))) + solidarity - advance;
  const sponsorPaid = Math.round((m3(sponsorMoney) - advance) * 1000) / 1000;
  const prizeMoney = Math.round((total - sponsorPaid - solidarity) * 1000) / 1000;
  const reach = reachOf(w.season.continental, OWN);
  const cont = reach ? m3(contPrize(reach)) : 0;
  w.save.income = { season: w.save.season, lines: [{ name: 'TV, gate and prize money', amount: prizeMoney }, ...(solidarity ? [{ name: solidarity > 0 ? 'Solidarity money' : 'Solidarity money passed down', amount: solidarity }] : []), { name: advance ? 'Sponsors (the rest; a quarter came on signing)' : 'Sponsors', amount: sponsorPaid }, ...(cont ? [{ name: 'The Continental Cup', amount: cont }] : [])] };
  w.save.budget = Math.round((w.save.budget + total + cont) * 1000) / 1000;
  // The kit maker's slot waits for the Kit sponsor tech in world 2 (O40); world 1 plays exactly as it always did.
  w.save.offers = openOffers(w.save.sponsors, nextTier, worldOf(w.save) !== 2 || (w.save.treeUser?.researched ?? []).some((x) => x.id === KIT_SPONSOR_TECH), r);
  const row = (LEAGUE.income as unknown as Record<string, { tv: number; gate: number }>)[String(tier)];
  return { gate: row.gate * capShare * k, tv: row.tv * k, sponsors: sponsorPaid, shop: row.gate * capShare * shop * k, continental: cont };
}
/** The desk's day folded into the world: research, growth, project days and tomorrow's column (desk/fold.ts). */
function deskDay(w: World, date: DayKey) {
  const eng = structuredClone(engineOf(w.save));
  const g = globeOf(w.save);
  const club: ClubWorld = { budget: w.save.budget, loans: g.loans, offers: w.save.offers ?? [], sponsors: w.save.sponsors ?? [], season: w.save.season, phase: w.save.phase };
  deskFold(w.save.desk, date, diceFrozen(w.save, w.h, date), { unspentBonus: perkValue(perksOfSave(w.save), 'unspent-research'), eng, squad: w.squad, bundles: w.bundles, needs: (id) => PROJECTS.find((p) => p.id === id)?.needs, news: w.news, club });
  w.save.tree = eng;
  // Fork 3: deals struck in talks (the market loan's own slot, sponsors signed on the terms reached).
  w.save.budget = club.budget;
  if (club.loans !== g.loans) w.save.globe = { ...g, loans: club.loans };
  if (club.offers !== (w.save.offers ?? [])) w.save.offers = club.offers;
  if (club.sponsors !== (w.save.sponsors ?? [])) w.save.sponsors = club.sponsors;
}
/** The season's rules: the usual, or the twists the congress passed before it (congress/congress.ts). */
const rulesOf = (w: World) => seasonRules(w.save.congress, w.season.id);
/** The congress sits as a new season begins: Brabo's ballot and the votes won by lobbying, counted (spec §6). */
function congressSits(w: World, season: number, on: DayKey) {
  if ((w.save.congress ?? []).some((c) => c.season === season)) return;
  const clubs = [...w.clubs.values()].filter((c) => !c.folded && !c.pool).map((c) => c.id);
  const rel = relationSourceOf(w.save, [...w.past, ...w.matches]);
  const opinion = (club: string) => opinionOf(rel, club);
  const rec = sitCongress(season, on, clubs, opinion, w.save.ballot?.[season] ?? {}, lobbiesFor(w.save.desk?.spends ?? [], season), braboVotes());
  w.save.congress = [...(w.save.congress ?? []), rec];
  const said = rec.motions.map((m) => { const def = motionById(m.id)!; return `${m.passed ? def.passed : def.fell} (${m.for}–${m.against}).`; }).join(' ');
  w.news.push({ id: `${on}:congress`, date: on, kind: 'club', text: `The federation congress: ${said}` });
}
/** The cast's day: habit points, asks met, and research from `research-close` perks. Days before bonds began never count. */
function castDay(w: World, date: DayKey) {
  const eng = engineOf(w.save);
  const m = eng.days.find((d) => d.date === date)?.m ?? {};
  const before = w.save.bonds ?? emptyBonds(date);
  const held = perksHeld(bondsOf(w.save.desk, before));
  const { bonds, met } = bondDay(before, w.save.desk, date, m, eng.days);
  w.save.bonds = bonds;
  for (const a of met) {
    const who = castById(a.member)!;
    w.news.push({ id: `${date}:ask:${a.spend}`, date, kind: 'club', text: `${who.name}: ${who.asks[a.ask]?.thanks ?? 'Thank you.'}` });
  }
  const research = closeResearch(held, m);
  if (research) {
    const e = structuredClone(eng);
    e.earned += research;
    e.gains = [...e.gains, { on: date, n: research, why: 'desk' as const, note: 'The cast' }].slice(-60);
    w.save.tree = e;
  }
}
/** The world as the tree's hooks see it (store/tree.ts). */
const treeCtx = (w: World): TreeCtx => ({ h: w.h, save: w.save, season: w.season, bundles: w.bundles, news: w.news, clubs: w.clubs, matches: () => [...w.past, ...w.matches] });
export const contractsFor = (date: DayKey) => HABITS.map((h) => newContract(h.id, date));

// ---- The ground (Task 4.4) ----
const doneBundles = (w: World) => [...w.bundles.values()].filter((b) => b.done).map((b) => b.id);
function usualBedtime(w: World, date: DayKey): number | undefined {
  const xs: number[] = [];
  for (let d = addDays(date, -28); d < date; d = addDays(d, 1)) { const a = w.h.days.get(d)?.sleep?.asleep; if (a !== undefined) xs.push(bedOrder(a)); }
  if (xs.length < 7) return undefined;
  xs.sort((a, b) => a - b);
  return fromBedOrder(xs[Math.floor(xs.length / 2)]);
}
/** The 28 days before arrival, once, for the ground's bundles and the tree's projects open then (O42 finding 12). */
function creditArrivalIn(w: World) {
  const r = w.save.redrawn;
  if (!r?.on || w.save.arrivalCredit) return;
  const g = { tier: stageIn(w.season, w.season.tierOf[OWN]), moved: Boolean(w.save.moved), done: doneBundles(w), budget: w.save.budget };
  const open = BUNDLES.filter((b) => isOpen(b, g) && !w.bundles.get(b.id)?.done);
  creditArrival(treeCtx(w), {
    add: (d) => {
      const counts = dayCounts({ input: axisInputFor(w.h, d), medsKept: medsTaken(w.h, d), youthDays: 0, usualBedtime: usualBedtime(w, d) });
      for (const b of open) {
        const cur = w.bundles.get(b.id) ?? { id: b.id, progress: {} };
        w.bundles.set(b.id, { ...bundleDay(b, cur, counts, -1, d).state, credit: r.on });
      }
    },
  });
}
/** Every day: open bundles take the day's totals; a finished one is paid for and opens from the next match. */
function groundDay(w: World, date: DayKey, input: ReturnType<typeof axisInputFor>) {
  const done = doneBundles(w);
  const g = { tier: stageIn(w.season, w.season.tierOf[OWN]), moved: Boolean(w.save.moved), done, budget: w.save.budget };
  const youthDays = w.squad.filter((y) => (y.status === 'growing' || y.status === 'promoted') && youthDone(w, y, date)).length;
  const counts = dayCounts({ input, medsKept: medsTaken(w.h, date), youthDays, usualBedtime: usualBedtime(w, date) });
  for (const b of BUNDLES) {
    if (!isOpen(b, g)) continue;
    const cur = w.bundles.get(b.id) ?? { id: b.id, progress: {} };
    const { state, spent } = bundleDay(b, cur, counts, w.save.budget, date);
    w.bundles.set(b.id, state);
    if (!state.done) continue;
    w.save.budget = Math.round((w.save.budget - spent) * 1000) / 1000;
    g.done = [...g.done, b.id];
    if (b.id === 'physio') w.save.physioRoom = true;
    w.save.openings = [...(w.save.openings ?? []), b.id];
    w.news.push({ id: `${date}:built:${b.id}`, date, kind: 'club', text: `${b.name} is built. ${b.effect}` });
  }
}
/** Once a season, while tenants, the first home league match of one week is played as if away. */
function lockedOutTonight(w: World, plan: DayPlan, date: DayKey): boolean {
  if (w.save.moved || plan.kind !== 'league' || (w.save.lockedOut ?? []).includes(w.save.season)) return false;
  // A week in the season's first five of six (world 2: the four weeks of 28 days).
  const week = 1 + (hashSeed('locked', String(w.save.season)) % (worldOf(w.season) === 2 ? 4 : 5));
  if (Math.ceil(plan.day / 7) !== week) return false;
  w.save.lockedOut = [...(w.save.lockedOut ?? []), w.save.season];
  w.news.push({ id: `${date}:locked`, date, kind: 'back', text: 'Locked out! The landlords say the good dressing room is “unavailable”. Brabo change in the corridor and play tonight as if away.' });
  return true;
}
/**
 * The rent rise, and moving day at the break. World 1: the first season Brabo finish above the landlords. World 2: the
 * landlords (Berchem Sport) play outside the league, so it comes the first season Brabo go up a division.
 */
function tenancyAtSeasonEnd(w: World, date: DayKey, tables: Record<Tier, Row[]>, wentUp = false) {
  if (!w.save.moved && !w.save.rentRaised) {
    let above = false;
    if (worldOf(w.season) === 2) above = wentUp;
    else {
      const t = w.season.tierOf[OWN], zt = w.season.tierOf['zur'];
      const pos = (id: string, tier: Tier) => tables[tier].findIndex((r) => r.id === id);
      above = zt === undefined ? false : t < zt || (t === zt && pos(OWN, t) < pos('zur', zt));
    }
    if (above) {
      w.save.rentRaised = true;
      w.save.budget = Math.round((w.save.budget - 0.02) * 1000) / 1000;
      w.news.push({ id: `${date}:rent`, date, kind: 'back', text: worldOf(w.season) === 2
        ? `Rent rise! ${clubById(LANDLORDS_2).name} put the rent up the season their tenants go up a division. €20k a season, and a lot of muttering.`
        : 'Rent rise! Zurenborg Athletic put the rent up the season their tenants finish above them. €20k a season, and a lot of muttering.' });
    }
  }
  if (!w.save.moved && w.save.moveAtBreak && doneBundles(w).includes('kaai-stand')) {
    w.save.moved = true;
    w.save.moveAtBreak = false;
    w.save.openings = [...(w.save.openings ?? []), 'moving-day'];
    w.news.push({ id: `${date}:farewell`, date, kind: 'club', text: `Farewell, ${homeGround(false)}. Moving day: next season starts at Kaai 42.` });
  }
}

// ---- The World Cup (Task 5.3) ----
/** Called up: play for your country on group day 1 (a double-header) and day 2. Otherwise you follow it as news. */
function worldCupDay(w: World, date: DayKey, plan: DayPlan, auto: boolean) {
  const country = w.save.wcCountry ? NATIONS.find((n) => n.id === w.save.wcCountry) : undefined;
  const seed = `wc:${w.save.season}`;
  const wc = worldCupGroups(NATIONS, rng(hashSeed('wc', String(w.save.season))), country?.id);
  const dayNo = w.save.day;
  const day = wc.days[dayNo - 1];
  const label = `World Cup, ${day?.label ?? `day ${dayNo}`}`;
  const all = [...w.past, ...w.matches];
  // The player's own World Cup results, from Brabo's stored matches (Brabo stands in for the nation).
  const own = (d: number, opp: string) => all.find((m) => m.comp === 'worldcup' && m.season === w.save.season && m.opp === nationId(opp) && m.round === `World Cup, ${wc.days[d - 1].label}`)?.result;
  const ties = dayNo <= 2 ? day?.matches ?? [] : worldCupRun(wc, NATIONS, seed, dayNo - 1, country?.id, own).next;
  const avg = averageOf(all.filter((m) => !m.rotation && m.date > addDays(date, -28) && m.date < date).map((m) => m.values));
  const avg28 = AXES.reduce((t, a) => t + avg[a], 0) / AXES.length;
  const called = Boolean(country) && calledUp(avg28, country!.strength);
  const mine = country ? ties.filter(([a, b]) => a === country.id || b === country.id) : [];
  if (called) mine.slice(0, 2).forEach(([a, b], i) => brabo(w, date, { ...plan, round: label }, 'worldcup', OWN, nationId(a === country!.id ? b : a), auto, label, dayNo === 1 ? ((i + 1) as 1 | 2) : undefined, true));
  const name = (id: string) => NATIONS.find((n) => n.id === id)?.name ?? id;
  const after = worldCupRun(wc, NATIONS, seed, dayNo, country?.id, own);
  const lines: string[] = [];
  if (!country) lines.push('You follow it from the sofa. Pick a country in settings to be in with a shout.');
  else if (mine.length && !called) lines.push(`${name(country.id)} play without you: ${avg28.toFixed(1)} of the ${nationBar(country.strength).toFixed(1)} a call-up needs.`);
  else if (!mine.length) {
    // Not in today's ties: day 2 is the group's other match; from day 3 it means they are out.
    lines.push(dayNo === 2 ? `${name(country.id)} rest today; their group finishes without them.` : `${name(country.id)} are out. You follow the rest from the sofa.`);
  }
  if (dayNo === 2) {
    const through = after.tables.some((t) => t.slice(0, 2).includes(country?.id ?? ''));
    if (country) lines.push(through ? `${name(country.id)} are through to the last 32.` : `${name(country.id)} go out in the group.`);
  }
  if (after.winner) lines.push(`${name(after.winner)} win the World Cup.`);
  const text = lines.filter(Boolean).join(' ');
  if (text) w.news.push({ id: `${date}:wc`, date, kind: 'world', text: `The World Cup, ${day?.label ?? `day ${dayNo}`}. ${text}` });
}

// ---- The Continental Cup and the Club World Cup ----
/** One continental night, the second match of a league night's double-header. */
function continentalNight(w: World, date: DayKey, plan: DayPlan, auto: boolean, before: number) {
  const c = w.season.continental;
  const night = plan.cont;
  if (!c || !night) return;
  const leg = (before + 1) as 1 | 2;
  const name = (id: string) => clubById(id).name;
  if (night.stage === 'phase') {
    const results: Played[] = [];
    for (const [h, a] of c.rounds[night.round - 1] ?? []) {
      const round = `${CONT_NAME}, league phase ${night.round} of 8`;
      const score = h === OWN || a === OWN ? brabo(w, date, plan, 'continental', h, a, auto, round, leg).score : otherResult(w, h, a, `${date}:ct`);
      results.push({ home: h, away: a, score });
    }
    c.results[night.round - 1] = results;
    if (night.round === 8) {
      c.ko = koFromTable(c);
      const table = phaseTable(c);
      const pos = table.findIndex((r) => r.id === OWN) + 1;
      if (pos) w.news.push({ id: `${date}:ct:phase`, date, kind: 'club', text: pos <= 8 ? `${ordinalOf(pos)} in the league phase: Brabo United are in the Continental Cup quarter-finals.` : `${ordinalOf(pos)} in the league phase. The Continental Cup ends there for Brabo United.` });
    }
    return;
  }
  if (!c.ko) return;
  const ri = night.stage === 'qf' ? 0 : night.stage === 'sf' ? 1 : 2;
  c.ko = koRound(w, date, plan, auto, c.ko, ri, 'continental', leg);
  if (c.ko.winner) {
    const won = c.ko.winner === OWN;
    if (won) w.save.eventState = { ...w.save.eventState, clubWorldDue: true };
    w.news.push({ id: `${date}:ct:winner`, date, kind: won ? 'club' : 'world', clubId: c.ko.winner, text: won ? 'Brabo United win the Continental Cup! The Club World Cup is next.' : `${name(c.ko.winner)} win the Continental Cup.` });
  }
}
const ordinalOf = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;
/** Play one knockout round of a bracket: Brabo's tie for real, the rest simulated, drawn ties on penalties. */
function koRound(w: World, date: DayKey, plan: DayPlan, auto: boolean, b: Bracket, ri: number, comp: Comp, leg?: 1 | 2): Bracket {
  const r = b.rounds[ri];
  const neutral = r.name === 'Final' || comp === 'clubworld';
  const res: Record<string, { score: [number, number]; pens?: [number, number] }> = {};
  for (const t of r.ties) {
    if (!t.away || t.winner) continue;
    let score: [number, number], pens: [number, number] | undefined;
    if (t.home === OWN || t.away === OWN) {
      const m = brabo(w, date, plan, comp, t.home, t.away, auto, `${b.name}, ${r.name}`, leg, neutral);
      score = m.score; pens = m.pens;
    } else {
      score = otherResult(w, t.home, t.away, `${date}:${b.id}:${ri}`, neutral);
      if (score[0] === score[1]) pens = penalties(rating(w, t.home), rating(w, t.away), rng(hashSeed(date, 'pens', t.home, t.away)));
    }
    res[`${t.home}-${t.away}`] = { score, pens };
  }
  return advance(b, ri, res);
}
/** The Club World Cup over four event days: quarter-final, semi-final, a third night, the final. Brabo play every night. */
function clubWorldDay(w: World, date: DayKey, plan: DayPlan, auto: boolean) {
  const day = w.save.day;
  if (!w.season.clubworld) w.season.clubworld = newClubWorld(w.save.season, worldOf(w.season));
  let b = w.season.clubworld;
  const label = (x: string) => `${CWC_NAME}, ${x}`;
  const inRound = (ri: number) => b.rounds[ri]?.ties.some((t) => t.home === OWN || t.away === OWN);
  const champs = worldChamps(worldOf(w.season)).map((c) => c.id);
  const friendly = (why: string) => {
    const met = new Set([...w.matches, ...w.past].filter((m) => m.comp === 'clubworld' || m.round?.startsWith(CWC_NAME)).map((m) => m.opp));
    const opp = pick(rng(hashSeed(date, 'cwc-friendly')), champs.filter((id) => !met.has(id)).length ? champs.filter((id) => !met.has(id)) : champs);
    brabo(w, date, plan, 'friendly', OWN, opp, auto, label(why));
  };
  if (day === CWC_DAYS.qf) b = koRound(w, date, plan, auto, b, 0, 'clubworld');
  else if (day === CWC_DAYS.sf) {
    const out = !inRound(1);
    b = koRound(w, date, plan, auto, b, 1, 'clubworld');
    if (out) friendly('a friendly');
  } else if (day === CWC_DAYS.third) {
    const semis = b.rounds[1].ties;
    const lostSemi = semis.find((t) => (t.home === OWN || t.away === OWN) && t.winner !== OWN);
    if (lostSemi) brabo(w, date, plan, 'clubworld', OWN, semis.map((t) => (t.winner === t.home ? t.away! : t.home)).find((id) => id !== OWN)!, auto, label('third-place match'), undefined, true);
    else friendly(inRound(2) ? 'a warm-up before the final' : 'a friendly');
  } else if (day === CWC_DAYS.final) {
    const out = !inRound(2);
    b = koRound(w, date, plan, auto, b, 2, 'clubworld');
    if (out) friendly('a friendly');
    if (b.winner) w.news.push({ id: `${date}:cwc:winner`, date, kind: b.winner === OWN ? 'club' : 'world', clubId: b.winner, text: b.winner === OWN ? 'Brabo United are champions of the world.' : `${clubById(b.winner).name} win the Club World Cup.` });
  }
  w.season.clubworld = b;
}

/** A night out logged as ranges plays Fuel on slightly wider dice (l-away); 0 on an exact day. */
export function nightOutSpread(h: Pick<Health, 'ranges'>, date: DayKey, targets: Targets): number {
  const r = h.ranges?.get(date);
  return r ? fuelSpread(r, targets, fuelScore) : 0;
}
