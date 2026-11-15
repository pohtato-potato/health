// Fork 4: the season twists and the cast's perks where they play. Rules only; made-up clubs and days.
import { describe, expect, it } from 'vitest';
import { standings } from '../src/football/table';
import { playoffPairs, seasonEnd } from '../src/football/promotion';
import { worldTurn } from '../src/football/world';
import { openingLoan } from '../src/football/market/market';
import { revealFor, CLUB_FINDS } from '../src/football/fog/fog';
import { unspentResearch } from '../src/football/desk/rules';
import { takeBackable } from '../src/football/desk/jobs/negotiate';
import { project } from '../src/football/desk/jobs/project';
import { watch } from '../src/football/desk/jobs/watch';
import { academy, ACADEMY_GROWTH } from '../src/football/desk/jobs/academy';
import { emptyDesk, type DeskState, type DeskView, type Die } from '../src/football/desk/types';
import type { HeldPerk } from '../src/football/cast/bonds';
import { rng } from '../src/football/rng';
import { TIERS, type Tier } from '../src/football/types';

const die = (value: Die['value']): Die => ({ axis: 'Pace', value, score: 10, reason: 'x' });
const perk = (key: HeldPerk['key'], value = 1, job?: HeldPerk['job']): HeldPerk => ({ key, value, text: '', member: 'scout', rank: 3, ...(job ? { job } : {}) });
const base: DeskView = { date: '2030-01-02', oppKnown: 'none', youth: [], projects: [], columnLines: [], questions: [], answered: [], spentToday: {}, clocks: [] };

describe('season twists', () => {
  it('away-win-four: an away win is worth 4', () => {
    const t = standings([{ home: 'a', away: 'b', score: [0, 1] }], ['a', 'b'], {}, 4);
    expect(t.find((r) => r.id === 'b')!.pts).toBe(4);
    expect(standings([{ home: 'a', away: 'b', score: [1, 0] }], ['a', 'b'], {}, 4).find((r) => r.id === 'a')!.pts).toBe(3);
  });

  it('four-up: top three up with a 4th–7th play-off, four down; every division keeps 18', () => {
    const row = (id: string) => ({ id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] });
    const tables = Object.fromEntries(TIERS.map((t) => [t, Array.from({ length: 18 }, (_, i) => row(`t${t}c${i}`))])) as Record<Tier, ReturnType<typeof row>[]>;
    expect(playoffPairs(tables[2], 4)).toEqual([['t2c3', 't2c6'], ['t2c4', 't2c5']]);
    expect(playoffPairs(tables[2])).toEqual([['t2c2', 't2c5'], ['t2c3', 't2c4']]);
    const m = seasonEnd(tables, { 2: 't2c5' }, undefined, 4);
    expect(m.up[2]).toEqual(['t2c0', 't2c1', 't2c2', 't2c5']);
    expect(m.down[1]!.length).toBe(4);
    expect(seasonEnd(tables, {}).up[3]!.length).toBe(3);
  });

  it('spending-rule: clubs above their band are likelier to land in financial trouble', () => {
    const clubs = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, name: `C${i}`, rating: i < 2 ? 90 : 50, tier: 3 as Tier, kind: 'invented' }));
    const bands = { 3: [40, 60] as [number, number] };
    let usual = 0, twisted = 0;
    for (let s = 0; s < 400; s++) {
      if (Object.keys(worldTurn(clubs, rng(s)).deductions).some((id) => id === 'c0' || id === 'c1')) usual++;
      if (Object.keys(worldTurn(clubs, rng(s), { trouble: 2, bands }).deductions).some((id) => id === 'c0' || id === 'c1')) twisted++;
    }
    expect(twisted).toBeGreaterThan(usual * 1.4);
  });

  it('loan-cap: market fees fall by a fifth', () => {
    expect(openingLoan('gold', 3, 0, 0.8).fee).toBeCloseTo(openingLoan('gold', 3, 0).fee * 0.8, 2);
  });
});

describe('cast perks where they play', () => {
  it('scout-known: a club trip finds one more', () => {
    const f = revealFor('c1', [{ id: 'c1', facts: new Set() }], false, 5).c1;
    expect(f.length).toBe(CLUB_FINDS + 1);
    expect(revealFor('c1', [{ id: 'c1', facts: new Set() }]).c1.length).toBe(CLUB_FINDS);
  });

  it('unspent-research: one die sooner, never past the cap', () => {
    expect(unspentResearch(1)).toBe(0);
    expect(unspentResearch(1 + 1)).toBe(1);
    expect(unspentResearch(6 + 2)).toBe(2);
  });

  it('watch-both: style and weak side on any die', () => {
    const v = { ...base, opp: { id: 'x', name: 'X', style: 'press' } };
    expect(watch.preview(die(1), v).effects).toEqual([{ kind: 'watch', club: 'x', level: 'style' }]);
    expect(watch.preview(die(1), { ...v, perks: [perk('watch-both')] }).effects).toEqual([{ kind: 'watch', club: 'x', level: 'full' }]);
  });

  it('academy-growth: one more on a 5 or 6 only', () => {
    const v = { ...base, youth: [{ id: 'y', name: 'Y', axis: 'Pace' as const, growth: 0, potential: 3 as const }], perks: [perk('academy-growth')] };
    expect(academy.preview(die(6), v, 'y').effects).toEqual([{ kind: 'grow', youth: 'y', n: ACADEMY_GROWTH.well + 1 }]);
    expect(academy.preview(die(4), v, 'y').effects).toEqual([{ kind: 'grow', youth: 'y', n: ACADEMY_GROWTH.does }]);
  });

  it('clock-head-start on building: the first push on a project starts a day ahead', () => {
    const p = { id: 'p', name: 'P', worst: { what: 'days', have: 0, count: 10 } };
    const perks = [perk('clock-head-start', 1, 'build')];
    expect(project.preview(die(3), { ...base, projects: [{ ...p, fresh: true }], perks }, 'p').effects).toEqual([{ kind: 'project', id: 'p', n: 2 }]);
    expect(project.preview(die(3), { ...base, projects: [{ ...p, fresh: false }], perks }, 'p').effects).toEqual([{ kind: 'project', id: 'p', n: 1 }]);
    expect(project.preview(die(3), { ...base, projects: [{ ...p, fresh: true }] }, 'p').effects).toEqual([{ kind: 'project', id: 'p', n: 1 }]);
  });

  it('negotiate-reroll: the last failed push can be taken back, once a talk; never a deal', () => {
    const round = (id: string, hit: boolean, end?: 'deal') => ({ id, day: '2030-01-01', axis: 'Pace' as const, value: 3 as const, job: 'negotiate' as const,
      effects: [{ kind: 'talk' as const, talk: 'c:l', n: 1, round: 1, reply: 'fee' as const, pct: 50, hit, terms: { kind: 'loan' as const, days: 7, fee: 1, promise: true }, mood: 2, ...(end ? { end } : {}) }] });
    const d: DeskState = { ...emptyDesk(), spends: [round('a', true), round('b', false)] };
    expect(takeBackable(d, [])).toBeUndefined();
    expect(takeBackable(d, [perk('negotiate-reroll')])).toBe('b');
    expect(takeBackable({ ...d, backs: ['b'], spends: [...d.spends, round('c', false)] }, [perk('negotiate-reroll')])).toBeUndefined();
    expect(takeBackable({ ...d, spends: [round('a', true, 'deal')] }, [perk('negotiate-reroll')])).toBeUndefined();
  });
});
