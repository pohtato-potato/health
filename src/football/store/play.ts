// The only writer of Football's tables. Kick-off reads Health once, plays, and stores the events.
import { bedOrder, fromBedOrder } from '../../domain/rings';
import { db } from '../../db/db';
import { addDays, dayOfLogging, daysBetween, type DayKey } from '../../domain/dates';
import { seasonDays, SEASON_DAYS, type DayPlan } from '../calendar';
import { advance, penalties, type Bracket } from '../cups';
import { clubById, rememberClubs } from '../data/load';
import { cards, physio, redCardMod, rotationShape, usesRotation } from '../discipline';
import { playMatch, type MatchCtx } from '../engine';
import { CONT_NAME, CWC_DAYS, CWC_NAME, contPrize, koFromTable, newClubWorld, phaseTable, reachOf } from '../continental';
import { WORLD_CHAMPS } from '../data/continental';
import { calledUp, EVENTS, NATIONS, nationBar, nextEvent, worldCupGroups, worldCupRun } from '../events';
import { rollOldSelves } from '../oldSelves';
import { opponentFor } from '../opponent';
import { simResult } from '../otherMatches';
import { applyMoves, playoffPairs, seasonEnd } from '../promotion';
import { afterMatch, ANTIGOON, howText, migrateRivals, rivalTwist, twistOf, weakestAxis, type Meeting } from '../rivals';
import { hashSeed, rng, pick } from '../rng';
import { contractDay, keptOn, intake, newContract } from '../contracts';
import { nationId, YOUTH_POOL } from '../data/load';
import { crestStepFor } from '../kits';
import { BUNDLES, bundleDay, capacityOf, dayCounts, groundAbilities, isOpen, TENANT_CAPACITY } from '../ground';
import { dodgyCollapse, incomeFor, offers as offersFor, type Slot } from '../money';
import { HABITS, habitById, armbandHarmony, averageOf, momentsOf, TRAIT } from '../squad';
import { abilityFor, braboAbilities } from '../data/abilities';
import { standings, type Played, type Row } from '../table';
import { applyChanges, worldTurn } from '../world';
import { AXES, TIERS, type AxisValues, type Comp, type Mod, type Result, type Tier } from '../types';
import { axisInputFor, bestAxis, conditions, loadHealth, medsTaken, nightFor, type Health } from './gather';
import { factsFor, matchLines, situationOf } from './lines';
import { newSeason, OWN } from './season';
import type { FbBundle, FbClub, FbNews, FbSave, FbSeason, FbSquadRow, StoredMatch } from './tables';
import { creditsFor } from '../players/credit';
import { linkedLogged } from '../players/youth';
import type { Ctx } from '../players/attributes';
import { formationFor } from '../tree/rotation';
import { healNow, rotationOf, stageCapacity, treeAbilities, treeDay, treeMatch, treeSeasonEnd, type TreeCtx } from './tree';
import { LEAGUE } from '../data/load';
import { academyIds, creditMatch, nightOptsFor, playerCtx, playersDay, rebuildPlayers, squadNight, type Roster } from './players';
import { signFreeAgents } from '../rotation/freeAgents';
import { chemistryAfter, moraleAfter } from '../rotation/night';
import { traitAbilities } from '../rotation/traits';
import { breakStarts, globeAfterPlayers, globeDay, globeMatch, globeNight, globeRules, globeSeasonEnd, isBreakDay, loanAbilities, restedForLeague } from './globe';

export const CATCH_UP_CAP = 42;
const resultOf = (s: [number, number], pens?: [number, number]): Result => (s[0] > s[1] || (pens && pens[0] > pens[1]) ? 'W' : s[0] < s[1] || (pens && pens[0] < pens[1]) ? 'L' : 'D');

interface World { bundles: Map<string, FbBundle>; squad: FbSquadRow[]; save: FbSave; season: FbSeason; oldSeasons: FbSeason[]; clubs: Map<string, FbClub>; matches: StoredMatch[]; news: FbNews[]; h: Health; past: StoredMatch[]; used: { id: string; date: DayKey }[]; roster: Roster; ctx: Ctx }

/** Plays every unplayed day up to and including `date`, in order. Days before `date` count as auto-played. */
export async function kickOff(date: DayKey): Promise<StoredMatch[]> {
  return playThrough(date, date);
}
/** The 4 am rule: plays every day before today's logging day that was never played. */
export async function playDue(now = Date.now()): Promise<StoredMatch[]> {
  const yesterday = addDays(dayOfLogging(now), -1);
  return playThrough(yesterday, null);
}

const USER_KEYS = ['buzz', 'wcCountry', 'ownSponsor', 'captain', 'captains', 'captainWeek', 'slots', 'sponsorStyle', 'awakeSeen', 'seenSeasonEnd', 'sheet', 'tactics', 'bedtime', 'treeUser', 'globeUser'] as const satisfies readonly (keyof FbSave)[];
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

async function playThrough(until: DayKey, closed: DayKey | null): Promise<StoredMatch[]> {
  await upgradeSave();
  const save = await db.fbSave.get('save');
  if (!save) return [];
  const stored = await db.fbClubs.toArray();
  rememberClubs(stored);
  const from = save.lastPlayed ? addDays(save.lastPlayed, 1) : save.founded;
  if (until < from) return [];
  let start = from;
  if (daysBetween(from, until) + 1 > CATCH_UP_CAP) start = addDays(until, -(CATCH_UP_CAP - 1));
  const h = await loadHealth();
  const squad = await db.fbSquad.toArray();
  const roster: Roster = new Map((await db.fbPlayers.toArray()).map((p) => [p.id, p]));
  const w: World = {
    squad, roster, ctx: playerCtx(h, save, squad),
    bundles: new Map((await db.fbBundles.toArray()).map((b) => [b.id, b])),
    save: { ...save, rivals: migrateRivals(save.rivals) }, season: (await db.fbSeasons.get(save.season))!, oldSeasons: [], clubs: new Map(stored.map((c) => [c.id, c])),
    matches: [], news: [], h, past: await db.fbMatches.orderBy('date').toArray(),
    used: (await db.fbNews.where('date').aboveOrEqual(addDays(start, -31)).toArray()).filter((n) => n.lineId).map((n) => ({ id: n.lineId!, date: n.date })),
  };
  for (let d = start; d <= until; d = addDays(d, 1)) { clubDay(w, d); playDay(w, d, d !== closed); }
  w.save.lastPlayed = until;
  await db.transaction('rw', [db.fbSave, db.fbSeasons, db.fbClubs, db.fbMatches, db.fbNews, db.fbSquad, db.fbBundles, db.fbPlayers], async () => {
    const cur = await db.fbSave.get('save');
    if (cur?.lastPlayed && cur.lastPlayed >= until) return; // another tab played first
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
  });
  return w.matches;
}

const rating = (w: World, id: string) => w.clubs.get(id)?.rating ?? clubById(id).rating ?? 50;
function otherResult(w: World, home: string, away: string, seed: string, neutral = false): [number, number] {
  return simResult({ rating: rating(w, home) }, { rating: rating(w, away) }, rng(hashSeed(seed, home, away)), neutral ? 0 : 3);
}

function playDay(w: World, date: DayKey, auto: boolean) {
  const { save } = w;
  if (save.phase === 'event') return playEventDay(w, date, auto);
  if (isBreakDay(save, date)) return; // an international break: no matches, the season day waits
  const plan = seasonDays()[save.day - 1];
  w.season.dates[save.day] = date;
  const braboTier = w.season.tierOf[OWN];
  const mine: { comp: Comp; round?: string; home: string; away: string; neutral?: boolean; onWin?: (s: [number, number], p?: [number, number]) => void }[] = [];
  if (plan.kind === 'league') {
    for (const t of TIERS) for (const [h, a] of w.season.fixtures[t][plan.matchday! - 1]) {
      if (h === OWN || a === OWN) mine.push({ comp: 'league', round: `Matchday ${plan.matchday}`, home: h, away: a });
      else w.season.results[t].push({ home: h, away: a, score: otherResult(w, h, a, date) });
    }
    for (const m of mine) {
      const s = brabo(w, date, plan, m.comp, m.home, m.away, auto, m.round);
      w.season.results[braboTier].push({ home: m.home, away: m.away, score: s.score });
    }
    if (plan.cont) continentalNight(w, date, plan, auto, mine.length);
  } else if (plan.kind === 'bigcup' || plan.kind === 'tiercup' || plan.kind === 'finals1' || plan.kind === 'finals2') {
    let played = 0;
    const brackets: [Bracket, (b: Bracket) => void, Comp][] = [];
    if (plan.kind === 'bigcup' || plan.kind === 'finals1') brackets.push([w.season.bigcup, (b) => (w.season.bigcup = b), 'bigcup']);
    if (plan.kind === 'tiercup' || plan.kind === 'finals2') for (const id of Object.keys(w.season.tiercups)) brackets.push([w.season.tiercups[id], (b) => (w.season.tiercups[id] = b), 'tiercup']);
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
            if (score[0] === score[1]) pens = penalties(rating(w, t.home), rating(w, t.away), rng(hashSeed(date, 'pens', t.home, t.away)));
          }
          res[`${t.home}-${t.away}`] = { score, pens };
        }
        b = advance(b, ri, res);
      }
      set(b);
    }
    if (plan.kind === 'finals1') played += playoffSemis(w, date, plan, auto, played);
    if (plan.kind === 'finals2') played += playoffFinals(w, date, plan, auto, played);
    if (!played) friendly(w, date, plan, auto);
  }
  save.day++;
  if (save.day > SEASON_DAYS) endSeason(w, date);
}

function tablesNow(w: World): Record<Tier, Row[]> {
  const out = {} as Record<Tier, Row[]>;
  for (const t of TIERS) out[t] = standings(w.season.results[t], Object.keys(w.season.tierOf).filter((id) => w.season.tierOf[id] === t), w.season.deductions);
  return out;
}
function playoffSemis(w: World, date: DayKey, plan: DayPlan, auto: boolean, before: number): number {
  const tables = tablesNow(w);
  let n = 0;
  for (const t of TIERS.filter((x) => x > 1)) {
    const semis = playoffPairs(tables[t]);
    const winners: string[] = [];
    for (const [h, a] of semis) {
      let score: [number, number], pens: [number, number] | undefined;
      if (h === OWN || a === OWN) { const m = brabo(w, date, plan, 'playoff', h, a, auto, 'Playoff semi-final', (before + ++n) as 1 | 2); score = m.score; pens = m.pens; }
      else { score = otherResult(w, h, a, `${date}:po`); if (score[0] === score[1]) pens = penalties(rating(w, h), rating(w, a), rng(hashSeed(date, 'popens', h))); }
      winners.push(resultOf(score, pens) === 'L' ? a : h);
    }
    w.season.playoffs[t] = { semis, semiWinners: winners, final: [winners[0], winners[1]] };
  }
  return n;
}
function playoffFinals(w: World, date: DayKey, plan: DayPlan, auto: boolean, before: number): number {
  let n = 0;
  for (const t of TIERS.filter((x) => x > 1)) {
    const po = w.season.playoffs[t];
    if (!po?.final) continue;
    const [h, a] = po.final;
    let score: [number, number], pens: [number, number] | undefined;
    if (h === OWN || a === OWN) { const m = brabo(w, date, plan, 'playoff', h, a, auto, 'Playoff final', (before + ++n) as 1 | 2, true); score = m.score; pens = m.pens; }
    else { score = otherResult(w, h, a, `${date}:pof`, true); if (score[0] === score[1]) pens = penalties(rating(w, h), rating(w, a), rng(hashSeed(date, 'pofpens', h))); }
    po.winner = resultOf(score, pens) === 'L' ? a : h;
  }
  return n;
}
/** Out of every competition on a cup day: the reserves play a friendly that counts for nothing. */
function friendly(w: World, date: DayKey, plan: DayPlan, auto: boolean) {
  const tier = w.season.tierOf[OWN];
  const pool = [...w.clubs.values()].filter((c) => c.id !== OWN && !c.folded && Math.abs(c.tier - tier) <= 1);
  const opp = pick(rng(hashSeed(date, 'friendly')), pool).id;
  brabo(w, date, plan, 'friendly', OWN, opp, auto, 'Friendly');
}

function endSeason(w: World, date: DayKey) {
  const tables = tablesNow(w);
  const winners: Partial<Record<Tier, string>> = {};
  for (const t of TIERS) if (w.season.playoffs[t]?.winner) winners[t] = w.season.playoffs[t]!.winner;
  const moves = seasonEnd(tables, winners);
  w.season.final = { tables, up: moves.up, down: moves.down };
  const tierOf = applyMoves(w.season.tierOf, moves);
  const r = rng(hashSeed('world', String(w.save.season)));
  const turn = worldTurn([...w.clubs.values()].map((c) => {
    const def = clubById(c.id);
    return { id: c.id, name: def.name, rating: c.rating, tier: tierOf[c.id] ?? c.tier, kind: def.kind, abilities: def.known.map((a) => a.name) };
  }), r);
  const moved = applyChanges([...w.clubs.values()], turn.changes);
  for (const c of moved) w.clubs.set(c.id, { ...c, tier: tierOf[c.id] ?? c.tier, style: turn.styles[c.id] ?? c.style });
  turn.headlines.forEach((x, i) => w.news.push({ id: `${date}:world:${i}`, date, kind: 'world', text: x.text, clubId: x.clubId }));
  refreshOldSelves(w, date);
  const base = seasonMoney(w, date, tables, moves.up);
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
    w.season = newSeason(next, addDays(date, 1), [...w.clubs.values()], ded, w.season.final?.tables[1].slice(0, 4).map((r) => r.id));
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

/** One Brabo match: build the input from Health, play it, store it. */
function brabo(w: World, date: DayKey, plan: DayPlan, comp: Comp, home: string, away: string, auto: boolean, round?: string, leg?: 1 | 2, neutral = false): StoredMatch {
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
  const pre: Mod[] = [];
  const meds = Array.from({ length: 5 }, (_, i) => addDays(date, -(i + 1))).map((d) => ({ date: d, allTaken: medsTaken(w.h, d) }));
  pre.push(...physio(meds, date, w.save.physioRoom, healNow(w.save, w.bundles)).mods);
  const nightOuts = [...w.h.days.values()].filter((d) => d.nightOut).map((d) => d.date);
  if (cards(nightOuts, date).red) pre.push(redCardMod(values.Rest));
  if (armbandHarmony(w.save.captains) && w.save.harmonyAt !== w.save.captains.length) {
    for (const a of AXES) pre.push({ axis: a, d: 1, why: 'Harmony', kind: 'ability' });
    w.save.harmonyAt = w.save.captains.length;
  }
  const club = w.clubs.get(oppId);
  const def = clubById(oppId);
  const rival = w.save.rivals.find((r) => r.clubId === oppId);
  const derby = Boolean(rival) || oppId === 'zur' || oppId === ANTIGOON;
  const opp = opponentFor(def, { rating: club?.rating, derby });
  const firstMeeting = !w.save.met.includes(oppId);
  const lastMine = [...w.past, ...w.matches].filter((m) => m.date < date).pop();
  const braboTier = w.season.tierOf[OWN];
  const ctx: MatchCtx = {
    comp, derby, auto, firstMeeting, matchday: plan.matchday,
    last5: (plan.matchday ?? 0) >= 30, vsHigher: (club?.tier ?? 6) > braboTier,
    familiarAxis: club?.old?.best, prevBest: lastMine ? bestAxis(lastMine.values) : undefined,
    final: /(^|, )Final$|Playoff final/.test(round ?? ''),
  };
  const conds = conditions(w.h, date, night.input, auto);
  if ((plan.matchday ?? 0) % 7 === 0 && plan.matchday) conds.push('every-7th');
  if ([...w.past, ...w.matches].some((m) => m.opp === oppId && m.result === 'L')) conds.push('beat-them-before');
  let braboHome = neutral ? home === OWN : oppId === 'zur' && !w.save.moved ? false : home === OWN;
  if (braboHome && lockedOutTonight(w, plan, date)) braboHome = false;
  const seed = hashSeed(date, home, away, comp, String(leg ?? 0));
  const tree = treeAbilities(w, ctx, braboHome);
  const slots = new Set(w.save.slots);
  const events = playMatch({
    seed, values, opp, home: braboHome,
    captain: slots.has('armband') ? w.save.captain : undefined,
    stack: slots.has('stack') ? w.save.earned.filter((e) => e.date > addDays(date, -7)).length : 0,
    // Engine 2: a player's traits play while it starts (an Awakening's trait became its player's first limit break).
    abilities: [...braboAbilities(w.save.slots), ...(w.save.engine === 2 ? traitAbilities(team.xi, w.roster) : awakenedTraits(w.save)), ...groundAbilities(doneBundles(w)), ...tree.abilities, ...loanAbilities(w.save, team.loansPlayed, date, globeRules(w.save, w.bundles.values()).loan)],
    bench: benchFor(w, date), pre, conds, ctx,
    rival: rival ? twistOf(rival) : oppId === ANTIGOON ? rivalTwist(ANTIGOON, 'legend') : undefined,
  });
  const score: [number, number] = home === OWN ? events.score : [events.score[1], events.score[0]];
  const mineScore = events.score;
  let pens: [number, number] | undefined;
  if (mineScore[0] === mineScore[1] && comp !== 'league' && comp !== 'friendly' && comp !== 'event' && !(comp === 'worldcup' && leg) && !(comp === 'continental' && round?.includes('league phase'))) pens = penalties(values.Routine * 5, opp.rating, rng(hashSeed(String(seed), 'pens')));
  const m: StoredMatch = {
    id: `${date}:${leg ?? 1}`, date, season: w.save.season, day: plan.day, comp, round, home, away, opp: oppId, braboHome,
    values, flags, events, score: mineScore, pens, result: resultOf(mineScore, pens),
    xi: team.xi, credits: creditsFor(events, team.xi, def.name, undefined, tonight.setPiece),
    tactic: tonight.tactic, nudges: team.nudges.length ? team.nudges : undefined,
    watched: false, rotation, auto, leg, derby, big: derby || comp !== 'league' || plan.matchday === 34,
  };
  if (!w.save.met.includes(oppId)) w.save.met = [...w.save.met, oppId];
  const last4 = [...w.past, ...w.matches].filter((x) => x.date < date).slice(-4).map((x) => x.result);
  const finalWon = m.result === 'W' && round === 'Final';
  for (const mo of momentsOf({ events, result: m.result, home: braboHome, derby, vsHigher: Boolean(ctx.vsHigher), finalWon, last4, auto })) {
    const ab = abilityFor(mo);
    if (ab && !w.save.earned.some((e) => e.id === ab.id)) w.save.earned = [...w.save.earned, { id: ab.id, date }];
  }
  const meeting = (x: StoredMatch): Meeting => ({ clubId: x.opp, result: x.result, comp: x.comp, final: /Final$|Playoff final/.test(x.round ?? ''), derby: x.derby, lastDay: x.comp === 'league' && plan.matchday === 34 && x.id === m.id, margin: Math.abs(x.score[0] - x.score[1]) });
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
  // Engine 2 has no new Awakenings: a player's limit breaks take their place (layer 2).
  w.matches.push(m);
  w.roster = creditMatch(w.roster, m);
  globeMatch(w.save, m, team.loansPlayed);
  treeMatch(w, m);
  afterNight(w, m, sick, def.name);
  const run = [...w.past, ...w.matches].filter((x) => !x.rotation);
  let streak = 0;
  for (let k = run.length - 1; k >= 0 && run[k].result === m.result; k--) streak++;
  const situation = situationOf(m, { rival: Boolean(rival) || oppId === ANTIGOON, oldSelf: Boolean(club?.old), streak });
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
  if (w.save.contracts) w.save.contracts = w.save.contracts.map((c) => {
    const next = contractDay(c, date, keptOn(c.habit, input));
    if (next.state !== c.state) w.news.push({ id: `${date}:contract:${c.habit}`, date, kind: 'club', text: next.state === 'due' ? `${habitById(c.habit).label} has earned a new contract. Renew it on the Deals page.` : `${habitById(c.habit).label} missed its contract line and is transfer-listed. No penalty in matches.` });
    return next;
  });
  // Layer 4: an international break day pauses the season (no matches); the tree and the world still run.
  breakStarts(w, date);
  groundDay(w, date, input);
  treeDay(treeCtx(w), date, w.squad.filter((y) => (y.status === 'growing' || y.status === 'promoted') && youthDone(w, y, date)).length);
  // Layer 4: loans come and go, trials, youngsters grow (sessions from the linked habit, growth from kept bedtimes).
  globeDay(w, date, w.save.season);
  w.ctx = playerCtx(w.h, w.save, w.squad);
  w.roster = playersDay(w.roster, w.h, w.ctx, date, academyIds(w.squad), false, rotationOf(w.save, w.bundles.values()).rules);
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
  if (!sick && !m.rotation && w.save.chemOn !== m.date && m.xi?.length) {
    const rot = rotationOf(w.save, w.bundles.values());
    w.save.chem = chemistryAfter(w.save.chem ?? {}, m.xi, rot.rules, formationFor(w.save.sheet, rot));
    w.save.chemOn = m.date;
  }
  const theirs = m.events.chances.filter((c) => c.side === 'def' && !c.ok);
  const agents = [...w.roster.values()].filter((p) => p.freeAgent?.club === m.opp);
  if (theirs.length && agents.length) {
    const p = agents[hashSeed(String(m.events.seed), 'agent') % agents.length];
    w.news.push({ id: `${m.date}:${m.leg ?? 1}:agent-goal`, date: m.date, kind: 'club', clubId: m.opp, matchId: m.id, text: `${p.name} scores against us for ${oppName}, ${theirs[0].minute}′. The buy-back clause is still open.` });
  }
}
/** Three youngsters for a season, at most one exercise, plus one per youth slot won in a trade. */
export function youthIntake(season: number, date: DayKey, extra = 0, academy = false): FbSquadRow[] {
  const r = rng(hashSeed('youth', String(season)));
  const picked = intake(YOUTH_POOL, r, true);
  const more = extra ? intake(YOUTH_POOL.filter((y) => !picked.includes(y) && y.kind === 'habit'), r, false).slice(0, extra) : [];
  return [...picked, ...more].map((y, i) => ({ id: `s${season}:y${i}`, kind: 'youth' as const, name: y.name, axis: y.axis, potential: (academy ? Math.min(5, y.potential + 1) : y.potential) as 3 | 4 | 5, what: y.what, exercise: y.kind === 'exercise', season, logged: [], status: 'growing' as const })).map((y) => ({ ...y, id: `${y.id}:${date}` }));
}
const OPEN: { slot: Slot; from?: Tier }[] = [{ slot: 'shirt' }, { slot: 'kit' }, { slot: 'sleeve', from: 4 }, { slot: 'partner' }];
/** Season end: income in, dodgy sponsors may fold, offers arrive for open slots. */
function seasonMoney(w: World, date: DayKey, tables: Record<Tier, Row[]>, up: Partial<Record<Tier, string[]>>) {
  const tier = w.season.tierOf[OWN];
  const pos = tables[tier].findIndex((r) => r.id === OWN) + 1;
  const promoted = Boolean(up[tier]?.includes(OWN));
  const r = rng(hashSeed('money', String(w.save.season)));
  const live = (w.save.sponsors ?? []).filter((s) => w.save.season - s.since < s.seasons);
  const folded = live.filter((s) => s.risk === 'dodgy' && dodgyCollapse(r));
  folded.forEach((s) => w.news.push({ id: `${date}:fold:${s.slot}`, date, kind: 'club', text: `${s.brand} have folded. The ${s.slot} slot is open again.` }));
  w.save.sponsors = live.filter((s) => !folded.includes(s));
  const sponsorMoney = w.save.sponsors.reduce((t, s) => t + s.perSeason, 0);
  const done = doneBundles(w);
  const shop = (done.includes('shop-2') ? 0.1 : 0) + (done.includes('shop-3') ? 0.1 : 0);
  const capShare = w.save.moved ? (capacityOf(true, done) + stageCapacity(done)) / TENANT_CAPACITY : 1;
  const total = incomeFor(tier, pos, promoted, sponsorMoney, capShare * (1 + shop));
  const prizeMoney = Math.round((total - sponsorMoney) * 1000) / 1000;
  const reach = reachOf(w.season.continental, OWN);
  const cont = reach ? contPrize(reach) : 0;
  w.save.income = { season: w.save.season, lines: [{ name: 'TV, gate and prize money', amount: prizeMoney }, { name: 'Sponsors', amount: Math.round(sponsorMoney * 1000) / 1000 }, ...(cont ? [{ name: 'The Continental Cup', amount: cont }] : [])] };
  w.save.budget = Math.round((w.save.budget + total + cont) * 1000) / 1000;
  const nextTier = (promoted ? tier - 1 : tier) as Tier;
  const taken = new Set(w.save.sponsors.map((s) => s.slot));
  const partners = w.save.sponsors.filter((s) => s.slot === 'partner').length;
  w.save.offers = OPEN.filter((o) => (o.from === undefined || nextTier <= o.from) && (o.slot === 'partner' ? partners < 3 : !taken.has(o.slot)))
    .flatMap((o) => offersFor(o.slot, nextTier, r));
  const row = (LEAGUE.income as unknown as Record<string, { tv: number; gate: number }>)[String(tier)];
  return { gate: row.gate * capShare, tv: row.tv, sponsors: sponsorMoney, shop: row.gate * capShare * shop, continental: cont };
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
/** Every day: open bundles take the day's totals; a finished one is paid for and opens from the next match. */
function groundDay(w: World, date: DayKey, input: ReturnType<typeof axisInputFor>) {
  const done = doneBundles(w);
  const g = { tier: w.season.tierOf[OWN], moved: Boolean(w.save.moved), done, budget: w.save.budget };
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
  const week = 1 + (hashSeed('locked', String(w.save.season)) % 5);
  if (Math.ceil(plan.day / 7) !== week) return false;
  w.save.lockedOut = [...(w.save.lockedOut ?? []), w.save.season];
  w.news.push({ id: `${date}:locked`, date, kind: 'back', text: 'Locked out! The landlords say the good dressing room is “unavailable”. Brabo change in the corridor and play tonight as if away.' });
  return true;
}
/** The rent rise the first season Brabo finish above the landlords, and moving day at the break. */
function tenancyAtSeasonEnd(w: World, date: DayKey, tables: Record<Tier, Row[]>) {
  if (!w.save.moved && !w.save.rentRaised) {
    const t = w.season.tierOf[OWN], zt = w.season.tierOf['zur'];
    const pos = (id: string, tier: Tier) => tables[tier].findIndex((r) => r.id === id);
    const above = zt === undefined ? false : t < zt || (t === zt && pos(OWN, t) < pos('zur', zt));
    if (above) {
      w.save.rentRaised = true;
      w.save.budget = Math.round((w.save.budget - 0.02) * 1000) / 1000;
      w.news.push({ id: `${date}:rent`, date, kind: 'back', text: 'Rent rise! Zurenborg Athletic put the rent up the season their tenants finish above them. €20k a season, and a lot of muttering.' });
    }
  }
  if (!w.save.moved && w.save.moveAtBreak && doneBundles(w).includes('kaai-stand')) {
    w.save.moved = true;
    w.save.moveAtBreak = false;
    w.save.openings = [...(w.save.openings ?? []), 'moving-day'];
    w.news.push({ id: `${date}:farewell`, date, kind: 'club', text: 'Farewell, Stadion aan de Stroom. Moving day: next season starts at Kaai 42.' });
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
  if (!w.season.clubworld) w.season.clubworld = newClubWorld(w.save.season);
  let b = w.season.clubworld;
  const label = (x: string) => `${CWC_NAME}, ${x}`;
  const inRound = (ri: number) => b.rounds[ri]?.ties.some((t) => t.home === OWN || t.away === OWN);
  const champs = WORLD_CHAMPS.map((c) => c.id);
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
