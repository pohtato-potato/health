// The only writer of Football's tables. Kick-off reads Health once, plays, and stores the events.
import { db } from '../../db/db';
import { addDays, dayOfLogging, daysBetween, type DayKey } from '../../domain/dates';
import { seasonDays, SEASON_DAYS, type DayPlan } from '../calendar';
import { advance, penalties, type Bracket } from '../cups';
import { clubById, rememberClubs } from '../data/load';
import { cards, physio, redCardMod, rotationShape, usesRotation } from '../discipline';
import { playMatch, type MatchCtx } from '../engine';
import { EVENTS, nextEvent } from '../events';
import { rollOldSelves } from '../oldSelves';
import { opponentFor } from '../opponent';
import { simResult } from '../otherMatches';
import { applyMoves, playoffPairs, seasonEnd } from '../promotion';
import { ANTIGOON, rivalTwist } from '../rivals';
import { hashSeed, rng, pick } from '../rng';
import { armbandHarmony, momentsOf } from '../squad';
import { abilityFor, braboAbilities } from '../data/abilities';
import { standings, type Row } from '../table';
import { applyChanges, worldTurn } from '../world';
import { AXES, TIERS, type AxisValues, type Comp, type Mod, type Result, type Tier } from '../types';
import { bestAxis, conditions, loadHealth, medsTaken, nightFor, type Health } from './gather';
import { factsFor, matchLines, situationOf } from './lines';
import { newSeason, OWN } from './season';
import type { FbClub, FbNews, FbSave, FbSeason, StoredMatch } from './tables';

export const CATCH_UP_CAP = 42;
const resultOf = (s: [number, number], pens?: [number, number]): Result => (s[0] > s[1] || (pens && pens[0] > pens[1]) ? 'W' : s[0] < s[1] || (pens && pens[0] < pens[1]) ? 'L' : 'D');

interface World { save: FbSave; season: FbSeason; oldSeasons: FbSeason[]; clubs: Map<string, FbClub>; matches: StoredMatch[]; news: FbNews[]; h: Health; past: StoredMatch[]; used: { id: string; date: DayKey }[] }

/** Plays every unplayed day up to and including `date`, in order. Days before `date` count as auto-played. */
export async function kickOff(date: DayKey): Promise<StoredMatch[]> {
  return playThrough(date, date);
}
/** The 4 am rule: plays every day before today's logging day that was never played. */
export async function playDue(now = Date.now()): Promise<StoredMatch[]> {
  const yesterday = addDays(dayOfLogging(now), -1);
  return playThrough(yesterday, null);
}

async function playThrough(until: DayKey, closed: DayKey | null): Promise<StoredMatch[]> {
  const save = await db.fbSave.get('save');
  if (!save) return [];
  const stored = await db.fbClubs.toArray();
  rememberClubs(stored);
  const from = save.lastPlayed ? addDays(save.lastPlayed, 1) : save.founded;
  if (until < from) return [];
  let start = from;
  if (daysBetween(from, until) + 1 > CATCH_UP_CAP) start = addDays(until, -(CATCH_UP_CAP - 1));
  const w: World = {
    save: { ...save }, season: (await db.fbSeasons.get(save.season))!, oldSeasons: [], clubs: new Map(stored.map((c) => [c.id, c])),
    matches: [], news: [], h: await loadHealth(), past: await db.fbMatches.orderBy('date').toArray(),
    used: (await db.fbNews.where('date').aboveOrEqual(addDays(start, -31)).toArray()).filter((n) => n.lineId).map((n) => ({ id: n.lineId!, date: n.date })),
  };
  for (let d = start; d <= until; d = addDays(d, 1)) playDay(w, d, d !== closed);
  w.save.lastPlayed = until;
  await db.transaction('rw', [db.fbSave, db.fbSeasons, db.fbClubs, db.fbMatches, db.fbNews], async () => {
    const cur = await db.fbSave.get('save');
    if (cur?.lastPlayed && cur.lastPlayed >= until) return; // another tab played first
    await db.fbSave.put(w.save);
    await db.fbSeasons.bulkPut([...w.oldSeasons, w.season]);
    await db.fbClubs.bulkPut([...w.clubs.values()]);
    rememberClubs([...w.clubs.values()]);
    if (w.matches.length) await db.fbMatches.bulkPut(w.matches);
    if (w.news.length) await db.fbNews.bulkPut(w.news);
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
    if (plan.kind === 'finals2') played += playoffFinals(w, date, plan, auto);
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
function playoffFinals(w: World, date: DayKey, plan: DayPlan, auto: boolean): number {
  let n = 0;
  for (const t of TIERS.filter((x) => x > 1)) {
    const po = w.season.playoffs[t];
    if (!po?.final) continue;
    const [h, a] = po.final;
    let score: [number, number], pens: [number, number] | undefined;
    if (h === OWN || a === OWN) { const m = brabo(w, date, plan, 'playoff', h, a, auto, 'Playoff final', (++n) as 1 | 2, true); score = m.score; pens = m.pens; }
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
  const plan: DayPlan = { day: w.save.day, kind: 'event', event: ev.id, round: `${EVENTS[ev.id].name}, day ${w.save.day} of ${ev.days}` };
  const pool = [...w.clubs.values()].filter((c) => c.id !== OWN && !c.folded && (ev.id !== 'oldselves' || c.old));
  const opp = pick(rng(hashSeed(date, 'event', ev.id)), pool.length ? pool : [...w.clubs.values()].filter((c) => c.id !== OWN)).id;
  brabo(w, date, plan, ev.id === 'worldcup' ? 'friendly' : 'event', OWN, opp, auto, plan.round);
  w.save.day++;
  if (w.save.day > ev.days) {
    const next = w.save.season + 1;
    const ded = w.season.nextDeductions ?? {};
    w.oldSeasons.push(w.season);
    w.season = newSeason(next, addDays(date, 1), [...w.clubs.values()], ded);
    w.save.season = next;
    w.save.phase = 'season';
    w.save.event = undefined;
    w.save.day = 1;
  }
}

/** One Brabo match: build the input from Health, play it, store it. */
function brabo(w: World, date: DayKey, plan: DayPlan, comp: Comp, home: string, away: string, auto: boolean, round?: string, leg?: 1 | 2, neutral = false): StoredMatch {
  const oppId = home === OWN ? away : home;
  const night = nightFor(w.h, date);
  const day = w.h.days.get(date);
  const rotation = usesRotation(day?.status);
  const recent = [...w.past, ...w.matches].filter((m) => !m.rotation && m.date > addDays(date, -28) && m.date < date);
  const values = rotation ? rotationShape(recent.map((m) => m.values)) : night.values;
  const pre: Mod[] = [];
  const meds = Array.from({ length: 5 }, (_, i) => addDays(date, -(i + 1))).map((d) => ({ date: d, allTaken: medsTaken(w.h, d) }));
  pre.push(...physio(meds, date, w.save.physioRoom).mods);
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
  };
  const conds = conditions(w.h, date, night.input, auto);
  if ((plan.matchday ?? 0) % 7 === 0 && plan.matchday) conds.push('every-7th');
  if ([...w.past, ...w.matches].some((m) => m.opp === oppId && m.result === 'L')) conds.push('beat-them-before');
  const braboHome = neutral ? home === OWN : oppId === 'zur' ? false : home === OWN;
  const seed = hashSeed(date, home, away, comp, String(leg ?? 0));
  const slots = new Set(w.save.slots);
  const events = playMatch({
    seed, values, opp, home: braboHome,
    captain: slots.has('armband') ? w.save.captain : undefined,
    stack: slots.has('stack') ? w.save.earned.filter((e) => e.date > addDays(date, -7)).length : 0,
    abilities: braboAbilities(w.save.slots),
    bench: [], pre, conds, ctx,
    rival: rival ? rivalTwist(oppId, rival.how, rival.best) : oppId === ANTIGOON ? rivalTwist(ANTIGOON, 'legend') : undefined,
  });
  const score: [number, number] = home === OWN ? events.score : [events.score[1], events.score[0]];
  const mineScore = events.score;
  let pens: [number, number] | undefined;
  if (mineScore[0] === mineScore[1] && comp !== 'league' && comp !== 'friendly' && comp !== 'event') pens = penalties(values.Routine * 5, opp.rating, rng(hashSeed(String(seed), 'pens')));
  const m: StoredMatch = {
    id: `${date}:${leg ?? 1}`, date, season: w.save.season, day: plan.day, comp, round, home, away, opp: oppId, braboHome,
    values, flags: rotation ? {} : night.flags, events, score: mineScore, pens, result: resultOf(mineScore, pens),
    watched: false, rotation, auto, leg, derby, big: derby || comp !== 'league' || plan.matchday === 34,
  };
  if (!w.save.met.includes(oppId)) w.save.met = [...w.save.met, oppId];
  const last4 = [...w.past, ...w.matches].filter((x) => x.date < date).slice(-4).map((x) => x.result);
  const finalWon = m.result === 'W' && round === 'Final';
  for (const mo of momentsOf({ events, result: m.result, home: braboHome, derby, vsHigher: Boolean(ctx.vsHigher), finalWon, last4, auto })) {
    const ab = abilityFor(mo);
    if (ab && !w.save.earned.some((e) => e.id === ab.id)) w.save.earned = [...w.save.earned, { id: ab.id, date }];
  }
  w.matches.push(m);
  const run = [...w.past, ...w.matches].filter((x) => !x.rotation);
  let streak = 0;
  for (let k = run.length - 1; k >= 0 && run[k].result === m.result; k--) streak++;
  const situation = situationOf(m, { rival: Boolean(rival) || oppId === ANTIGOON, oldSelf: Boolean(club?.old), streak });
  const lines = matchLines(m, factsFor(m, braboTier, streak, situation), w.used);
  w.news.push(...lines);
  w.used.push(...lines.map((n) => ({ id: n.lineId!, date: m.date })));
  return { ...m, score: score, pens: pens && home !== OWN ? [pens[1], pens[0]] : pens };
}
