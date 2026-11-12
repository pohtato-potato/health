// The loan market, talks and relations (desk-and-world spec §3, §5; Fork 3). Rules only; made-up clubs and days.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { wage } from '../src/football/content/money';
import { deskFold } from '../src/football/desk/fold';
import { JOBS, jobById } from '../src/football/desk/jobs';
import { negotiate, optionsFor, talkCtx } from '../src/football/desk/jobs/negotiate';
import { study } from '../src/football/desk/jobs/study';
import { spendDie, spendSeed } from '../src/football/desk/spend';
import { emptyDesk, type DeskState, type DeskView, type Die, type Effect, type MarketView, type Spend } from '../src/football/desk/types';
import { LOAN_RATING, LOAN_SLOTS, startLoans, withLoans, mentorFor } from '../src/football/globe/loans';
import type { LoanStay } from '../src/football/globe/types';
import {
  COOL_OFF, DIE_EDGE, FEE_CUT, LONGER_DAYS, MOOD_EDGE, ODDS_MAX, ODDS_MIN, OPEN_DAYS, PUSH_BASE, RETRY_COST, SPOT_EDGE, STUDY_EDGE,
  coolingUntil, feeFactor, leadsFrom, marketSlot, marketStay, missedDays, openingLoan, playRound, pushOdds, ratingShown, replies,
  secretsOf, startMood, studyClockId, talkState, targetKnown, type TalkRow, type TalkState,
} from '../src/football/market/market';
import { MOVE, movesOf, opinionKnown, opinionOf, opinionWord, RIVAL_START, type RelationSource } from '../src/football/market/relations';
import { rng } from '../src/football/rng';
import { emptyEngine } from '../src/football/tree/types';
import type { XiPlace } from '../src/football/players/types';

const DATE = '2030-03-05';
const die = (axis: Die['axis'], value: Die['value']): Die => ({ axis, value, score: value * 3, reason: `${axis} reason` });
// Doku is a Gold loan (Pace), Saka a Prism loan (Pace), from the real pool.
const KEY = 'c1:doku';
const market = (o: Partial<MarketView> = {}): MarketView => ({
  ownTier: 6, budget: 1, offers: [], talks: [],
  leads: [{ key: KEY, club: 'c1', clubName: 'Hospital Porters FC', loan: 'doku', day: '2030-03-01', opinion: 0, poach: false }],
  ...o,
});
const view = (o: Partial<DeskView> = {}, m: Partial<MarketView> = {}): DeskView => ({
  date: DATE, oppKnown: 'none', youth: [], projects: [], columnLines: [], questions: [], answered: [], spentToday: {}, clocks: [],
  market: market(m), ...o,
});
const deskWith = (dice: Die[]): DeskState => ({ ...emptyDesk(), dice: { [DATE]: dice } });
const fresh = (o: Partial<TalkState> = {}): TalkState => ({ talk: KEY, n: 1, round: 1, terms: { kind: 'loan', days: 7, fee: 0.04, promise: true }, mood: 2, won: [], fails: {}, live: false, ...o });
const studied = (filled: number) => [{ id: studyClockId(KEY), job: 'study' as const, target: KEY, name: 'Study', size: 2, opened: DATE, filled }];

describe('targets and study (spec §3)', () => {
  it('targets come from the scouts’ leads, once each, oldest first', () => {
    const ls = leadsFrom([{ day: '2030-03-01', club: 'c1', loan: 'doku' }, { day: '2030-03-02', club: 'c1', loan: 'doku' }, { day: '2030-03-02', club: 'c2', loan: 'saka' }, { day: '2030-03-03', club: 'c3', loan: 'nobody' }]);
    expect(ls.map((l) => l.key)).toEqual(['c1:doku', 'c2:saka']);
  });

  it('known %: 30 from the lead, 65 after one segment, 100 studied in full', () => {
    expect([0, 1, 2].map(targetKnown)).toEqual([30, 65, 100]);
  });

  it('the rating shows as a range holding the true rating until studied, then the number', () => {
    for (const k of ['a:doku', 'b:doku', 'c:doku', 'd:doku']) {
      const r = ratingShown(k, 'gold', 0);
      expect(r.hi - r.lo).toBe(6);
      expect(r.lo).toBeLessThanOrEqual(LOAN_RATING.gold);
      expect(r.hi).toBeGreaterThanOrEqual(LOAN_RATING.gold);
      expect(ratingShown(k, 'gold', 1)).toEqual({ lo: LOAN_RATING.gold, hi: LOAN_RATING.gold });
    }
  });

  it('each target has a soft spot and a different sore spot, always the same', () => {
    for (const k of ['a:doku', 'b:saka', 'c:leao', 'd:yamal', 'e:doku']) {
      const s = secretsOf(k);
      expect(s.soft).not.toBe(s.sore);
      expect(secretsOf(k)).toEqual(s);
    }
  });

  it('Study a loan target is on the job list, a clock of 2; a 5 or 6 studies in one go', () => {
    expect(JOBS.some((j) => j.id === 'study')).toBe(true);
    const r = spendDie(deskWith([die('Pace', 6)]), view(), die('Pace', 6), 'study', KEY);
    if ('error' in r) throw new Error(r.error);
    expect(r.desk.clocks).toEqual([expect.objectContaining({ id: studyClockId(KEY), size: 2, target: KEY })]);
    expect(r.spend.effects).toEqual([{ kind: 'clock', clock: studyClockId(KEY), n: 2 }]);
    const half = study.preview(die('Shape', 3), view(), KEY);
    expect(half.line).toMatch(/rating and signature move/);
    expect(half.line).toMatch(/30% to 65%/);
    expect(study.preview(die('Shape', 3), view({ clocks: studied(1) }), KEY).line).toMatch(/where their club will give/);
  });

  it('a fully studied target leaves the study list; nothing to study is a reason, not a crash', () => {
    expect(study.targets!(view({ clocks: studied(2) }))).toEqual([]);
    expect(study.open(view({ clocks: studied(2) }))).toBe(false);
    expect(study.open(view({}, { leads: [] }))).toBe(false);
  });
});

describe('opening terms and odds (spec §5, relations)', () => {
  it('a week, he starts every match, and the fee in wage units at Brabo’s division', () => {
    const t = openingLoan('gold', 6, 0);
    expect(t).toEqual({ kind: 'loan', days: OPEN_DAYS, fee: wage(1, 6), promise: true });
    expect(openingLoan('prism', 3, 0).fee).toBe(wage(2, 3));
  });

  it('friendly clubs ask less and start warmer; rivals ask more and start colder', () => {
    expect(feeFactor(100)).toBe(0.8);
    expect(feeFactor(-100)).toBe(1.2);
    expect(openingLoan('gold', 3, 60).fee).toBeLessThan(openingLoan('gold', 3, 0).fee);
    expect(openingLoan('gold', 3, -60).fee).toBeGreaterThan(openingLoan('gold', 3, 0).fee);
    expect([startMood(-60), startMood(0), startMood(60)]).toEqual([1, 2, 3]);
  });

  it('the odds of a push: the base plus each edge, shown one by one', () => {
    const base = { die: 3, studied: 0, opinion: 0, mood: 2, fails: 0 };
    expect(pushOdds('fee', base).pct).toBe(PUSH_BASE.fee);
    expect(pushOdds('fee', { ...base, die: 6 }).pct).toBe(PUSH_BASE.fee + DIE_EDGE.well);
    expect(pushOdds('fee', { ...base, die: 1 }).pct).toBe(PUSH_BASE.fee + DIE_EDGE.badly);
    expect(pushOdds('fee', { ...base, studied: 1 }).pct).toBe(PUSH_BASE.fee + STUDY_EDGE);
    expect(pushOdds('fee', { ...base, mood: 3 }).pct).toBe(PUSH_BASE.fee + MOOD_EDGE);
    expect(pushOdds('fee', { ...base, opinion: 50 }).pct).toBe(PUSH_BASE.fee + 10);
    expect(pushOdds('fee', { ...base, fails: 1 }).pct).toBe(PUSH_BASE.fee - RETRY_COST);
    const o = pushOdds('fee', { ...base, die: 6, studied: 1, mood: 3 });
    expect(o.edges.reduce((t, e) => t + e.d, PUSH_BASE.fee)).toBe(o.pct);
  });

  it('better knowledge gives leverage: the soft and sore spots count only once studied in full', () => {
    const s = secretsOf(KEY);
    const base = { die: 3, opinion: 0, mood: 2, fails: 0, secrets: s };
    expect(pushOdds(s.soft, { ...base, studied: 1 }).pct).toBe(PUSH_BASE[s.soft] + STUDY_EDGE);
    expect(pushOdds(s.soft, { ...base, studied: 2 }).pct).toBe(PUSH_BASE[s.soft] + 2 * STUDY_EDGE + SPOT_EDGE);
    expect(pushOdds(s.sore, { ...base, studied: 2 }).pct).toBe(PUSH_BASE[s.sore] + 2 * STUDY_EDGE - SPOT_EDGE);
  });

  it('odds stay between 5% and 95%', () => {
    expect(pushOdds('promise', { die: 1, studied: 0, opinion: -100, mood: 1, fails: 3 }).pct).toBe(ODDS_MIN);
    expect(pushOdds('days', { die: 6, studied: 2, opinion: 100, mood: 4, fails: 0 }).pct).toBe(ODDS_MAX);
  });
});

describe('talks: three rounds, a die each (w3-haggle)', () => {
  it('agree is sure and closes the deal; it needs the money', () => {
    const r = playRound(fresh(), 'agree', 100, true, 1);
    expect(r).toEqual(expect.objectContaining({ reply: 'agree', pct: 100, hit: true, end: 'deal' }));
    const opts = replies(fresh({ terms: { kind: 'loan', days: 7, fee: 2, promise: true } }), { die: 3, studied: 0, opinion: 0 }, 1);
    expect(opts[0]).toEqual(expect.objectContaining({ reply: 'agree', ok: false }));
    expect(opts.map((o) => o.reply)).toEqual(['agree', 'fee', 'days', 'promise']);
  });

  it('a push that comes off wins the term; one that fails sours the mood', () => {
    const t0 = fresh();
    expect(playRound(t0, 'fee', 50, true, 1).terms).toEqual({ ...t0.terms, fee: Math.round(0.04 * FEE_CUT * 1000) / 1000 });
    expect(playRound(t0, 'days', 50, true, 1).terms).toEqual({ ...t0.terms, days: OPEN_DAYS + LONGER_DAYS });
    expect(playRound(t0, 'promise', 50, true, 1).terms).toEqual({ ...t0.terms, promise: false });
    const miss = playRound(t0, 'fee', 50, false, 1);
    expect(miss.terms).toEqual(t0.terms);
    expect(miss.mood).toBe(1);
    expect(miss.end).toBeUndefined();
  });

  it('at no mood left they walk out, and won’t take a call for a week', () => {
    const r = playRound(fresh({ mood: 1 }), 'fee', 50, false, 1);
    expect(r.end).toBe('walked');
    const log: TalkRow[] = [{ day: DATE, e: r }];
    const s = talkState(log, KEY, fresh().terms, 2);
    expect(s.ended).toEqual({ how: 'walked', day: DATE });
    expect(s.n).toBe(2);
    expect(coolingUntil(s)).toBe('2030-03-12');
    expect(COOL_OFF).toBe(7);
  });

  it('after the third round the deal is done on the terms reached, if the money is there', () => {
    const third = fresh({ round: 3, live: true, terms: { kind: 'loan', days: 7, fee: 0.5, promise: true } });
    expect(playRound(third, 'days', 50, false, 1).end).toBe('deal');
    expect(playRound(third, 'days', 50, true, 0.1).end).toBe('short');
    expect(playRound(third, 'fee', 50, true, 0.4).end).toBe('deal');
  });

  it('talk state is worked out from the log: round, terms, mood, terms won and pushes refused', () => {
    const t0 = fresh();
    const r1 = playRound(t0, 'fee', 50, true, 1);
    const s1 = talkState([{ day: DATE, e: r1 }], KEY, t0.terms, 2);
    expect(s1).toEqual(expect.objectContaining({ round: 2, won: ['fee'], live: true, terms: r1.terms }));
    const r2 = playRound(s1, 'days', 60, false, 1);
    const s2 = talkState([{ day: DATE, e: r1 }, { day: DATE, e: r2 }], KEY, t0.terms, 2);
    expect(s2).toEqual(expect.objectContaining({ round: 3, mood: 1, fails: { days: 1 } }));
    // A term won is off the table; a push refused can be asked again, at worse odds.
    expect(replies(s2, { die: 3, studied: 0, opinion: 0 }, 1).map((o) => o.reply)).toEqual(['agree', 'days', 'promise']);
    expect(replies(s2, { die: 3, studied: 0, opinion: 0 }, 1)[1].pct).toBe(PUSH_BASE.days - RETRY_COST - MOOD_EDGE);
  });
});

describe('the negotiate job (honest dice)', () => {
  it('is on the job list; a reply is a target `talk|reply`', () => {
    expect(jobById('negotiate')).toBe(negotiate);
    expect(negotiate.targets!(view()).map((t) => t.id)).toEqual([`${KEY}|agree`, `${KEY}|fee`, `${KEY}|days`, `${KEY}|promise`]);
  });

  it('the odds shown are the odds drawn against, from the spend’s seed', () => {
    for (const v of [1, 2, 3, 4, 5, 6] as const) {
      for (const reply of ['fee', 'days', 'promise'] as const) {
        const d = die('Pace', v), target = `${KEY}|${reply}`;
        const shown = negotiate.preview(d, view(), target);
        const r = spendDie(deskWith([d]), view(), d, 'negotiate', target);
        if ('error' in r) throw new Error(r.error);
        expect(r.spend.risk?.pct).toBe(shown.risk?.pct);
        const expected = rng(spendSeed(DATE, d, 'negotiate', target))() * 100 < shown.risk!.pct;
        expect(r.spend.risk?.hit).toBe(expected);
        const round = r.spend.effects.find((e) => e.kind === 'talk');
        expect(round).toEqual(expect.objectContaining({ pct: shown.risk!.pct, hit: expected, round: 1 }));
      }
    }
  });

  it('a die’s quality shifts the odds: a 6 better than a 3, a 1 worse', () => {
    const c = talkCtx(view(), KEY)!;
    const pct = (v: Die['value']) => optionsFor(view(), c, die('Pace', v)).find((o) => o.reply === 'fee')!.pct;
    expect(pct(6)).toBeGreaterThan(pct(3));
    expect(pct(1)).toBeLessThan(pct(3));
  });

  it('agreeing makes a deal and a fair one warms their club; a poach cools it', () => {
    const r = spendDie(deskWith([die('Pace', 3)]), view({}, { leads: [{ ...market().leads[0], poach: true }] }), die('Pace', 3), 'negotiate', `${KEY}|agree`);
    if ('error' in r) throw new Error(r.error);
    const deal = r.spend.effects.find((e) => e.kind === 'deal');
    expect(deal).toEqual({ kind: 'deal', talk: KEY, n: 1, club: 'c1', loan: 'doku', days: 7, fee: wage(1, 6), promise: true });
    expect(r.spend.effects.filter((e) => e.kind === 'opinion').map((e) => e.kind === 'opinion' && e.d)).toEqual([MOVE.fair, MOVE.poach]);
  });

  it('a deal after a fee cut is a hard bargain', () => {
    const r1 = playRound(fresh({ terms: openingLoan('gold', 6, 0) }), 'fee', 50, true, 1);
    const v = view({}, { talks: [{ day: DATE, e: r1 }] });
    const r = spendDie(deskWith([die('Pace', 3)]), v, die('Pace', 3), 'negotiate', `${KEY}|agree`);
    if ('error' in r) throw new Error(r.error);
    expect(r.spend.effects.filter((e) => e.kind === 'opinion').map((e) => e.kind === 'opinion' && e.d)).toEqual([MOVE.sharp]);
  });

  it('one talk at a time, and a new loan talk waits while the market slot is taken', () => {
    expect(negotiate.blocked!(view({}, { slot: { name: 'Saka', until: '2030-03-09' } }))).toMatch(/slot is taken until 2030-03-09/);
    expect(negotiate.targets!(view({}, { slot: { name: 'Saka', until: '2030-03-09' } }))).toEqual([]);
    expect(negotiate.blocked!(view({}, { leads: [] }))).toMatch(/scout/);
  });

  it('a sponsor talk uses the same rounds over money, seasons and a bonus', () => {
    const v = view({}, { leads: [], offers: [{ slot: 'shirt', brand: 'Lantern Bikes', what: 'bikes', risk: 'stable', perSeason: 0.2, seasons: 1 }] });
    const ids = negotiate.targets!(v).map((t) => t.id);
    expect(ids).toEqual(['sp:shirt:Lantern Bikes|agree', 'sp:shirt:Lantern Bikes|more', 'sp:shirt:Lantern Bikes|longer', 'sp:shirt:Lantern Bikes|bonus']);
    const r = spendDie(deskWith([die('Pace', 4)]), v, die('Pace', 4), 'negotiate', 'sp:shirt:Lantern Bikes|agree');
    if ('error' in r) throw new Error(r.error);
    expect(r.spend.effects).toContainEqual({ kind: 'sponsor', slot: 'shirt', brand: 'Lantern Bikes', perSeason: 0.2, seasons: 1, bonus: 0 });
  });
});

describe('the market slot and the loan rules (12.5 a, globe/loans.ts)', () => {
  const stay = (o: Partial<LoanStay>): LoanStay => ({ key: 'k', loan: 'doku', unit: 'Pace', tier: 'gold', from: '2030-03-01', until: '2030-03-07', apps: [], goals: 0, ...o });

  it('a deal makes a stay from the day after, for the days agreed, in the market slot', () => {
    const s = marketStay({ talk: KEY, n: 1, club: 'c1', loan: 'doku', days: 10, fee: 0.04, promise: true }, 'Pace', 'gold', DATE);
    expect(s).toEqual(expect.objectContaining({ key: `market:${KEY}:1`, from: '2030-03-06', until: '2030-03-15', market: true, club: 'c1', promise: true }));
  });

  it('one market loan at a time: here or on its way', () => {
    expect(marketSlot([], [], DATE)).toBeUndefined();
    expect(marketSlot([stay({ market: true, until: '2030-03-09' })], [], DATE)).toEqual({ name: 'Jérémy Doku', until: '2030-03-09' });
    expect(marketSlot([], [{ loan: 'saka', days: 7, day: DATE }], DATE)).toEqual({ name: 'Bukayo Saka', until: '2030-03-12' });
    // A pack loan never takes the market's slot.
    expect(marketSlot([stay({ until: '2030-03-09' })], [], DATE)).toBeUndefined();
  });

  it('packs keep their slot: a market loan at the club never stops a pack loan from starting', () => {
    const opened = [{ id: 'p1', on: '2030-03-04', items: [{ kind: 'card' as const, id: 'x', rarity: 'bronze' as const }, { kind: 'loan' as const, id: 'saka', rarity: 'prism' as const }] }];
    const market = [stay({ key: 'market:c1:doku:1', loan: 'leao', unit: 'Pace', market: true, from: '2030-03-04', until: '2030-03-10' })];
    expect(LOAN_SLOTS).toBe(1);
    expect(startLoans(market, opened as never, [], DATE, { days: 7, slots: 1 }).map((s) => s.loan)).toEqual(['saka']);
  });

  it('a market loan plays only when its unit’s habit is logged, and the unit’s youngsters grow ×1.5', () => {
    const xi: XiPlace[] = [{ player: 'p1', unit: 'Pace', place: 'LW', name: 'One', rating: 60 }, { player: 'p2', unit: 'Pace', place: 'RW', name: 'Two', rating: 50 }];
    const st = [stay({ key: 'm', market: true, from: DATE, until: '2030-03-10' })];
    expect(withLoans(xi, st, () => false).played).toEqual([]);
    const on = withLoans(xi, st, () => true);
    expect(on.played).toEqual(['m']);
    expect(on.rested).toEqual(['p2']);
    expect(mentorFor(st, DATE, 'Pace')).toBe(1.5);
  });

  it('a promise of minutes breaks on days its unit went unlogged, never on sick or travel days', () => {
    const unlogged = (d: string) => d === '2030-03-02' || d === '2030-03-03';
    expect(missedDays('2030-03-01', '2030-03-07', unlogged, () => false)).toBe(2);
    expect(missedDays('2030-03-01', '2030-03-07', unlogged, (d) => d === '2030-03-03')).toBe(1);
  });
});

describe('deals folded at 4 am', () => {
  const world = (budget: number) => ({
    eng: emptyEngine(), squad: [], bundles: new Map(), needs: () => undefined, news: [] as { id: string; date: string; kind: string; text: string }[],
    club: { budget, loans: [] as LoanStay[], offers: [{ brand: 'Lantern Bikes', what: 'bikes', risk: 'stable' as const, slot: 'shirt' as const, perSeason: 0.2, seasons: 1 as const, line: '' }], sponsors: [], season: 3, phase: 'event' as const },
  });
  const deskOf = (effects: Effect[]): DeskState => ({ ...emptyDesk(), spends: [{ id: `${DATE}:Pace`, day: DATE, axis: 'Pace', value: 4, job: 'negotiate', effects } as Spend] });
  const deal: Effect = { kind: 'deal', talk: KEY, n: 1, club: 'c1', loan: 'doku', days: 7, fee: 0.3, promise: true };

  it('the fee leaves the budget and the loan arrives the next day', () => {
    const w = world(1);
    deskFold(deskOf([deal]), DATE, [], w);
    expect(w.club.budget).toBe(0.7);
    expect(w.club.loans).toEqual([expect.objectContaining({ key: `market:${KEY}:1`, from: '2030-03-06', market: true, fee: 0.3 })]);
  });

  it('no debt: a deal the budget no longer covers falls through, and nothing is owed', () => {
    const w = world(0.2);
    deskFold(deskOf([deal]), DATE, [], w);
    expect(w.club.budget).toBe(0.2);
    expect(w.club.loans).toEqual([]);
    expect(w.news.some((n) => /falls through/.test(n.text))).toBe(true);
  });

  it('a sponsor signs on the terms reached, with the bonus paid now', () => {
    const w = world(1);
    deskFold(deskOf([{ kind: 'sponsor', slot: 'shirt', brand: 'Lantern Bikes', perSeason: 0.23, seasons: 2, bonus: 0.05 }]), DATE, [], w);
    expect(w.club.sponsors).toEqual([expect.objectContaining({ brand: 'Lantern Bikes', perSeason: 0.23, seasons: 2, since: 4 })]);
    expect(w.club.offers).toEqual([]);
    expect(w.club.budget).toBe(1.05);
  });
});

describe('relations (w-relations, 12.4 a)', () => {
  const src = (o: Partial<RelationSource> = {}): RelationSource => ({ rivals: [], ties: [], stays: [], ...o });
  const opinionDesk = (club: string, d: number): DeskState => ({ ...emptyDesk(), spends: [{ id: 'x', day: DATE, axis: 'Pace', value: 3, job: 'negotiate', effects: [{ kind: 'opinion', club, d, why: 'w', move: 'deal' }] }] });

  it('everyone starts at 0; named rivals start cold', () => {
    expect(opinionOf(src(), 'c1')).toBe(0);
    expect(opinionOf(src({ rivals: ['c1'] }), 'c1')).toBe(RIVAL_START);
  });

  it('deals, cup ties and promises move it; congress votes plug in (Fork 4)', () => {
    expect(opinionOf(src({ desk: opinionDesk('c1', MOVE.fair) }), 'c1')).toBe(MOVE.fair);
    const ties = [{ opp: 'c1', date: DATE, result: 'W' as const, comp: 'bigcup' as const }, { opp: 'c1', date: DATE, result: 'L' as const, comp: 'league' as const }];
    expect(opinionOf(src({ ties }), 'c1')).toBe(MOVE.cupWin);
    expect(opinionOf(src({ ties: [{ ...ties[0], result: 'L' }] }), 'c1')).toBe(MOVE.cupLoss);
    const kept = { club: 'c1', market: true, promise: true, missed: 0, until: DATE, loan: 'doku' };
    expect(opinionOf(src({ stays: [kept] }), 'c1')).toBe(MOVE.promiseKept);
    expect(opinionOf(src({ stays: [{ ...kept, missed: 2 }] }), 'c1')).toBe(2 * MOVE.promiseDay);
    expect(opinionOf(src({ stays: [{ ...kept, missed: 9 }] }), 'c1')).toBe(MOVE.promiseFloor);
    expect(opinionOf(src({ votes: [{ club: 'c1', d: 12, why: 'Voted their way', kind: 'vote', day: DATE }] }), 'c1')).toBe(12);
  });

  it('stays between −100 and 100', () => {
    const many = Array.from({ length: 30 }, () => ({ club: 'c1', d: 10, why: 'v', kind: 'vote' as const, day: DATE }));
    expect(opinionOf(src({ votes: many }), 'c1')).toBe(100);
    expect(opinionOf(src({ rivals: ['c1'], votes: many.map((m) => ({ ...m, d: -10 })) }), 'c1')).toBe(-100);
  });

  it('words, and fog: shown once you know their manager or have dealt with them', () => {
    expect([60, 20, 0, -20, -60].map(opinionWord)).toEqual(['Friends', 'Warm', 'Neutral', 'Cool', 'Hostile']);
    expect(opinionKnown(new Set(), [])).toBe(false);
    expect(opinionKnown(new Set(['manager']), [])).toBe(true);
    expect(opinionKnown(new Set(), movesOf(src({ rivals: ['c1'] }), 'c1'))).toBe(true);
  });

  it('never touches a match: nothing that plays a match reads relations or the market', () => {
    const files = ['engine.ts', 'matchday.ts', 'opponent.ts', 'rivals.ts', 'radar.ts', 'matchup.ts', 'store/tonight.ts', 'store/players.ts', 'store/matchday.ts', 'players/attributes.ts'];
    for (const f of files) {
      const text = readFileSync(new URL(`../src/football/${f}`, import.meta.url), 'utf8');
      expect(text, f).not.toMatch(/market\/relations|opinionOf/);
    }
  });
});
