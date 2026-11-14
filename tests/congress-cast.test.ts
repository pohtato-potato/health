// The congress and the cast (desk-and-world spec §6–7; Fork 4). Rules only; made-up days.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAST, MOTIONS, SEATS, type PerkKey } from '../src/football/content/desk';
import {
  annoyedBy, ballotFor, BALLOT_POOL, braboVotes, clubVote, LOBBY_ANNOY, lobbyKey, lobbyOpen, lobbyRisk, LOBBY_RISK, parseLobby, PULL_AT, seasonRules,
  seatLean, sitCongress, swingClubs, tally, twistsOf, USUAL_RULES, VOTE_MOVE, voteMoves, WIRED, type CongressRecord,
} from '../src/football/congress/congress';
import {
  ASK_POINTS, bondDay, bondsOf, CAST_IDS, closeResearch, DESK_POINTS, emptyBonds, HABIT_POINT, holds, parcelExtras, PERK_RULES, perksHeld, perkValue,
  pointsOf, RANK_AT, rankOf, restDieBonus, toneOf, toNext, type BondState,
} from '../src/football/cast/bonds';
import { cast } from '../src/football/desk/jobs/cast';
import { lobby, lobbiesFor } from '../src/football/desk/jobs/lobby';
import { spendDie, spendSeed } from '../src/football/desk/spend';
import { emptyDesk, type DeskState, type DeskView, type Die, type Spend } from '../src/football/desk/types';
import { movesOf, opinionOf } from '../src/football/market/relations';
import { rng } from '../src/football/rng';

const CLUBS = Object.keys(SEATS);
const die = (axis: Die['axis'], value: Die['value']): Die => ({ axis, value, score: value * 3, reason: 'x' });
const zero = () => 0;

describe('the congress: the ballot', () => {
  it('draws 2 or 3 motions a season, seeded, only from motions whose twist is wired', () => {
    for (let s = 1; s <= 40; s++) {
      const b = ballotFor(s);
      expect(b.length).toBeGreaterThanOrEqual(2);
      expect(b.length).toBeLessThanOrEqual(3);
      expect(new Set(b.map((m) => m.id)).size).toBe(b.length);
      for (const m of b) expect(WIRED).toContain(m.twist.key);
      expect(ballotFor(s).map((m) => m.id)).toEqual(b.map((m) => m.id));
    }
    expect(BALLOT_POOL.length).toBe(WIRED.length);
    for (const k of WIRED) expect(MOTIONS.some((m) => m.twist.key === k)).toBe(true);
  });

  it('opens lobbying in the last 14 days of a season and the event days after it', () => {
    expect(lobbyOpen('season', 28, 42)).toBe(false);
    expect(lobbyOpen('season', 29, 42)).toBe(true);
    expect(lobbyOpen('season', 42, 42)).toBe(true);
    expect(lobbyOpen('event', 1, 42)).toBe(true);
  });

  it('Brabo starts with 1 vote; the seam grows it with standing', () => {
    expect(braboVotes()).toBe(1);
    expect(braboVotes(2)).toBe(3);
  });
});

describe('the congress: how clubs lean', () => {
  const m = MOTIONS.find((x) => x.id === 'salary-cap')!;
  const fan = CLUBS.find((c) => SEATS[c].owner === 'fan-owned' && !m.regions?.[SEATS[c].region])!;
  const rich = CLUBS.find((c) => SEATS[c].owner === 'state-fund' && !m.regions?.[SEATS[c].region])!;

  it('leans by owner kind and region, held to −2…2; old selves sit neutral', () => {
    expect(seatLean(m, fan)).toBe(2);
    expect(seatLean(m, rich)).toBe(-2);
    const old = CLUBS.find((c) => SEATS[c].owner === 'old-self');
    if (old) for (const x of MOTIONS) expect(seatLean(x, old)).toBe(0);
    for (const x of MOTIONS) for (const c of CLUBS) expect(Math.abs(seatLean(x, c))).toBeLessThanOrEqual(2);
  });

  it('a friend is pulled toward Brabo’s vote and a foe away; with no vote from Brabo, no pull', () => {
    const neutral = CLUBS.find((c) => seatLean(m, c) === 0 && SEATS[c].owner !== 'old-self')!;
    expect(clubVote(m, neutral, PULL_AT, 'for').vote).toBe('for');
    expect(clubVote(m, neutral, -PULL_AT, 'for').vote).toBe('against');
    expect(clubVote(m, neutral, PULL_AT, 'abstain').vote).toBe('abstain');
    expect(clubVote(m, neutral, PULL_AT - 1, 'for').vote).toBe('abstain');
    // A strong lean is pulled one step, not turned.
    expect(clubVote(m, rich, 100, 'for').vote).toBe('against');
  });

  it('a lobbied club votes Brabo’s way whatever its seat', () => {
    expect(clubVote(m, rich, -100, 'for', { club: rich, motion: m.id, side: 'for' }).vote).toBe('for');
  });

  it('a motion passes on more seats for than against; Brabo’s vote counts its number of votes', () => {
    const t = tally(m, CLUBS, zero, 'abstain', []);
    expect(t.for + t.against + t.abstain).toBe(CLUBS.length);
    expect(t.passed).toBe(t.for > t.against);
    const withVotes = tally(m, CLUBS, zero, 'for', [], 3);
    expect(withVotes.for).toBe(t.for + 3);
  });

  it('every motion has clubs leaning both ways, so a congress can go either way', () => {
    for (const x of MOTIONS) {
      expect(CLUBS.some((c) => seatLean(x, c) > 0)).toBe(true);
      expect(CLUBS.some((c) => seatLean(x, c) < 0)).toBe(true);
    }
  });
});

describe('the congress sits', () => {
  it('stores each motion’s count, and moves opinions only of clubs that cared strongly', () => {
    const b = ballotFor(5);
    const rec = sitCongress(5, '2030-06-01', CLUBS, zero, { [b[0].id]: 'for' }, []);
    expect(rec.motions.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(rec.motions[0].brabo).toBe('for');
    expect(rec.motions[1].brabo).toBe('abstain');
    for (const mv of rec.moves) {
      expect(mv.motion).toBe(b[0].id);
      expect(Math.abs(seatLean(b[0], mv.club))).toBe(2);
      expect(mv.d).toBe(seatLean(b[0], mv.club) > 0 ? VOTE_MOVE : -VOTE_MOVE);
    }
    expect(rec.moves.length).toBeGreaterThan(0);
  });

  it('passed motions are the season’s twists and rules; without a congress, the usual rules', () => {
    expect(seasonRules(undefined, 3)).toEqual(USUAL_RULES);
    const mk = (id: string, passed: boolean): CongressRecord => ({ season: 3, on: '2030-01-01', moves: [], motions: [{ id, for: passed ? 9 : 1, against: passed ? 1 : 9, abstain: 0, passed, brabo: 'abstain', votes: 1, lobbied: [], pulled: [] }] });
    const four = MOTIONS.find((m) => m.twist.key === 'away-win-four')!;
    expect(seasonRules([mk(four.id, true)], 3).awayWin).toBe(4);
    expect(seasonRules([mk(four.id, true)], 4).awayWin).toBe(3);
    expect(seasonRules([mk(four.id, false)], 3).awayWin).toBe(3);
    expect(twistsOf([mk(four.id, true)], 3).has('away-win-four')).toBe(true);
    const all: CongressRecord = { season: 7, on: '2030-01-01', moves: [], motions: BALLOT_POOL.map((m) => ({ id: m.id, for: 2, against: 1, abstain: 0, passed: true, brabo: 'abstain', votes: 1, lobbied: [], pulled: [] })) };
    expect(seasonRules([all], 7)).toEqual({ awayWin: 4, upDown: 4, loanFee: 0.8, solidarity: 10, trouble: 2 });
  });

  it('how Brabo votes reaches relations through Fork 3’s hook, dated the day it sat', () => {
    const b = ballotFor(5);
    const rec = sitCongress(5, '2030-06-01', CLUBS, zero, { [b[0].id]: 'against' }, []);
    const votes = voteMoves([rec]);
    const club = rec.moves[0].club;
    const src = { rivals: [], ties: [], stays: [], votes };
    expect(movesOf(src, club).some((x) => x.kind === 'vote' && x.day === '2030-06-01')).toBe(true);
    expect(opinionOf(src, club)).toBe(rec.moves.filter((x) => x.club === club).reduce((t, x) => t + x.d, 0));
  });
});

describe('lobbying', () => {
  const m = BALLOT_POOL[0];
  const opinions: Record<string, number> = {};
  const view = (over: Partial<DeskView> = {}): DeskView => ({
    date: '2030-05-20', oppKnown: 'none', youth: [], projects: [], columnLines: [], questions: [], answered: [], spentToday: {}, clocks: [],
    congress: { season: 4, open: true, daysLeft: 5, motions: [{ id: m.id, name: m.name, brabo: 'for' }], clubs: CLUBS.map((id) => ({ id, name: id.toUpperCase(), opinion: opinions[id] ?? 0 })), lobbied: [] },
    ...over,
  });

  it('shows the risk by die, less the perk, never below 0', () => {
    expect(lobbyRisk(6)).toBe(LOBBY_RISK.well);
    expect(lobbyRisk(3)).toBe(LOBBY_RISK.does);
    expect(lobbyRisk(1)).toBe(LOBBY_RISK.badly);
    expect(lobbyRisk(6, 5)).toBe(LOBBY_RISK.well - 5);
    expect(lobbyRisk(6, 50)).toBe(0);
  });

  it('is closed outside the fortnight and asks you to vote first', () => {
    expect(lobby.open(view({ congress: { ...view().congress!, open: false } }))).toBe(false);
    expect(lobby.blocked!(view({ congress: { ...view().congress!, motions: [{ id: m.id, name: m.name, brabo: 'abstain' }] } }))).toMatch(/Vote/);
  });

  it('offers the swing clubs: not already your way, weakest lean first', () => {
    const swing = swingClubs(m, 'for', CLUBS, zero, []);
    expect(swing.length).toBeGreaterThan(0);
    for (const c of swing) expect(clubVote(m, c, 0, 'for').vote).not.toBe('for');
    const t = lobby.targets!(view());
    expect(t.map((x) => parseLobby(x.id)!.club)).toEqual(swing);
  });

  it('the shown odds are the odds used: the seeded draw decides the annoyed club', () => {
    const t = lobby.targets!(view())[0].id;
    const l = parseLobby(t)!;
    const other = annoyedBy(m, l.club, 'for', CLUBS)!;
    expect(other).toBeDefined();
    expect(Math.sign(seatLean(m, other))).toBe(-1);
    for (const v of [1, 3, 6] as const) {
      const d = die('Pace', v);
      const p = lobby.preview(d, view(), t);
      expect(p.risk!.pct).toBe(lobbyRisk(v));
      const r = rng(spendSeed('2030-05-20', d, 'lobby', t));
      const hit = rng(spendSeed('2030-05-20', d, 'lobby', t))() * 100 < p.risk!.pct;
      const out = lobby.spend(d, view(), t, r);
      expect(out.risk).toEqual({ pct: p.risk!.pct, line: expect.any(String), hit });
      expect(out.effects[0]).toEqual({ kind: 'lobby', season: 4, motion: m.id, side: 'for', club: l.club });
      expect(out.effects.some((e) => e.kind === 'opinion' && e.club === other && e.d === LOBBY_ANNOY && e.move === 'lobby')).toBe(hit);
    }
  });

  it('a won vote counts at the congress and leaves the offer', () => {
    const t = lobby.targets!(view())[0].id;
    const l = parseLobby(t)!;
    const spends = [{ effects: lobby.spend(die('Pace', 6), view(), t, () => 0.99).effects }];
    const won = lobbiesFor(spends, 4);
    expect(won).toEqual([{ club: l.club, motion: m.id, side: 'for' }]);
    expect(lobbiesFor(spends, 5)).toEqual([]);
    expect(tally(m, CLUBS, zero, 'for', won).lobbied).toEqual([l.club]);
    const after = view({ congress: { ...view().congress!, lobbied: won } });
    expect(lobby.targets!(after).map((x) => x.id)).not.toContain(lobbyKey(l));
  });
});

describe('the cast: data as the rules need it', () => {
  it('seven members, ten ranks each in order, and every perk key used has a rule', () => {
    expect(CAST.length).toBe(7);
    for (const c of CAST) expect(c.ranks.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const used = new Set(CAST.flatMap((c) => c.ranks.flatMap((r) => (r.perk ? [r.perk.key] : []))));
    for (const k of used) expect(PERK_RULES[k as PerkKey]).toBeTruthy();
  });
});

describe('the cast: bonds', () => {
  const desk = (spends: Partial<Spend>[]): DeskState => ({ ...emptyDesk(), spends: spends.map((s, i) => ({ id: `s${i}`, day: '2030-01-01', axis: 'Pace', value: 3, job: 'cast', effects: [], ...s })) });

  it('ten ranks by points; the next rank’s distance', () => {
    expect(rankOf(0)).toBe(0);
    expect(rankOf(RANK_AT[0])).toBe(1);
    expect(rankOf(RANK_AT[9])).toBe(10);
    expect(rankOf(9999)).toBe(10);
    expect(toNext(0)).toBe(RANK_AT[0]);
    expect(toNext(9999)).toBe(0);
  });

  it('desk time gives 3, 2 or 1 by die, and maybe an ask, drawn as shown', () => {
    const v: DeskView = {
      date: '2030-01-02', oppKnown: 'none', youth: [], projects: [], columnLines: [], questions: [], answered: [], spentToday: {}, clocks: [],
      cast: { members: CAST.map((c) => ({ id: c.id, name: c.name, role: c.role, points: 0, rank: 0, toNext: 4, tone: 'warm', askOpen: false })) },
    };
    for (const [val, n] of [[6, DESK_POINTS.well], [4, DESK_POINTS.does], [1, DESK_POINTS.badly]] as const) {
      const d = die('Rest', val);
      const p = cast.preview(d, v, 'physio');
      expect(p.gain).toBe(`+${n}`);
      expect(p.effects).toEqual([{ kind: 'bond', member: 'physio', n }]);
      const hit = rng(spendSeed(v.date, d, 'cast', 'physio'))() * 100 < p.risk!.pct;
      const out = cast.spend(d, v, 'physio', rng(spendSeed(v.date, d, 'cast', 'physio')));
      expect(out.risk!.hit).toBe(hit);
      expect(out.effects.some((e) => e.kind === 'ask')).toBe(hit);
    }
    // An open ask means no new one, and no chance shown.
    const open = { ...v, cast: { members: v.cast!.members.map((m) => ({ ...m, askOpen: true })) } };
    expect(cast.preview(die('Rest', 6), open, 'physio').risk).toBeUndefined();
  });

  it('a spend through the desk lands in the log and counts toward the bond', () => {
    const d0: DeskState = { ...emptyDesk(), dice: { '2030-01-02': [die('Fuel', 5)] } };
    const v: DeskView = {
      date: '2030-01-02', oppKnown: 'none', youth: [], projects: [], columnLines: [], questions: [], answered: [], spentToday: {}, clocks: [],
      cast: { members: CAST.map((c) => ({ id: c.id, name: c.name, role: c.role, points: 0, rank: 0, toNext: 4, tone: 'cool', askOpen: true })) },
    };
    const r = spendDie(d0, v, die('Fuel', 5), 'cast', 'cook');
    if ('error' in r) throw new Error(r.error);
    expect(pointsOf('cook', r.desk, undefined)).toBe(3);
    expect(pointsOf('physio', r.desk, undefined)).toBe(0);
  });

  it('habit days, asks met and picks add up; nothing ever subtracts', () => {
    let b: BondState = emptyBonds('2030-01-01');
    const d = desk([{ effects: [{ kind: 'ask', member: 'physio', ask: 1 }] }]);
    const ask = CAST.find((c) => c.id === 'physio')!.asks[1];
    const days: { date: string; m: Record<string, number> }[] = [];
    let met = 0;
    for (let i = 1; i <= 7; i++) {
      const date = `2030-01-0${i}`;
      const m = { [ask.trigger.what]: 1 };
      days.push({ date, m });
      const out = bondDay(b, d, date, m, days);
      b = out.bonds;
      met += out.met.length;
    }
    expect(met).toBe(1);
    const habitDays = 7;
    expect(b.habit.physio).toBe(habitDays * HABIT_POINT);
    expect(pointsOf('physio', d, b)).toBe(habitDays * HABIT_POINT + ASK_POINTS);
    // A day before `since` never counts; a day with nothing they care about adds nothing and takes nothing.
    const early = bondDay(emptyBonds('2030-02-01'), d, '2030-01-15', { rested: 1 }, []);
    expect(early.bonds.habit).toEqual({});
    const quiet = bondDay(b, d, '2030-01-08', {}, days);
    expect(pointsOf('physio', d, quiet.bonds)).toBe(pointsOf('physio', d, b));
  });

  it('an ask missed lapses quietly: no points lost, none gained', () => {
    const d = desk([{ effects: [{ kind: 'ask', member: 'kitman', ask: 0 }] }]);
    let b = emptyBonds('2030-01-01');
    for (let i = 1; i <= 9; i++) b = bondDay(b, d, `2030-01-0${i}`, {}, []).bonds;
    expect(b.met).toEqual({});
    expect(pointsOf('kitman', d, b)).toBe(0);
  });

  it('a low opinion only cools the tone; it never changes points', () => {
    const b = emptyBonds('2030-01-01');
    expect(toneOf('physio', b, undefined, '2030-02-01')).toBe('cool');
    const warm = { ...b, recent: { physio: ['2030-01-25', '2030-01-26', '2030-01-27', '2030-01-28'] } };
    expect(toneOf('physio', warm, undefined, '2030-02-01')).toBe('warm');
    const sat = desk([{ day: '2030-01-30', target: 'physio' }]);
    expect(toneOf('physio', b, sat, '2030-02-01')).toBe('warm');
    expect(pointsOf('physio', undefined, b)).toBe(pointsOf('physio', undefined, warm) - 0);
  });

  it('perks come with ranks; holders’ own conditions decide research, the Rest die and parcel lines', () => {
    const top: BondState = { ...emptyBonds('2030-01-01'), habit: Object.fromEntries(CAST_IDS.map((id) => [id, 200])) };
    const held = perksHeld(bondsOf(undefined, top));
    expect(held.length).toBe(CAST.flatMap((c) => c.ranks.filter((r) => r.perk)).length);
    expect(perksHeld(bondsOf(undefined, emptyBonds('2030-01-01')))).toEqual([]);
    expect(holds(held, 'heirloom', undefined, 'tape-gun')).toBe(true);
    expect(perkValue(held, 'clock-head-start', 'scout')).toBeGreaterThan(0);
    expect(closeResearch(held, {})).toBe(0);
    expect(closeResearch(held, { closed: 1, 'checklist-full': 1 })).toBe(1);
    expect(closeResearch(held, { closed: 1, 'checklist-full': 1, protein: 1, 'three-meals': 1 })).toBe(2);
    expect(restDieBonus(held, { bedtime: 1 })).toBe(0);
    expect(restDieBonus(held, { 'rest-day': 1 })).toBe(1);
    expect(restDieBonus(held, { 'rest-day': 1, bedtime: 1 })).toBe(2);
    expect(parcelExtras(held, {})).toEqual([]);
    expect(parcelExtras(held, { rested: 1, bedtime: 1 }).sort()).toEqual(['physio', 'watchman']);
  });

  it('no perk reaches the match engine or a rating', () => {
    const engine = readdirSync('src/football').filter((f) => /^(engine|opponent|ratings|matchday|squadCare)\.ts$/.test(f));
    for (const f of engine) {
      const src = readFileSync(`src/football/${f}`, 'utf8');
      expect(src).not.toMatch(/cast\/bonds|congress\/congress/);
    }
  });
});
