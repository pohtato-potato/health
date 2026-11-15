import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { patchDay, setTargets } from '../../src/db/actions';
import { addDays } from '../../src/domain/dates';
import { matchup, PARITY, parityRating, playMatch, refFor, TYPICAL_WEIGHT, type MatchInput } from '../../src/football/engine';
import type { Opponent } from '../../src/football/opponent';
import { pausedInput } from '../../src/football/store/paused';
import { kickOff, pausedMatch } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { allAxes, AXES, type AxisValues } from '../../src/football/types';

// The 14 Nov rating fix (ledger O38, league spec §4 and decision 5a). Invented values only.
const V = (Pace: number, Power: number, Fuel: number, Rest: number, Routine: number, Shape: number): AxisValues => ({ Pace, Power, Fuel, Rest, Routine, Shape });
const opp = (rating: number): Opponent => ({ id: 'tst', rating, reach: 0.75, shrinks: { Pace: -1, Power: -1, Fuel: -1 }, presses: { Rest: -1, Routine: -1, Shape: -1 }, abilities: [] });

describe('the parity rating rises all the way (spec §4)', () => {
  it('a better night never rates lower: every average from 0 to 20 in steps of 0.01', () => {
    let prev = -Infinity, prevX = 0;
    for (let i = 0; i <= 2000; i++) {
      const x = i / 100;
      const r = parityRating(allAxes(x));
      if (r < prev) throw new Error(`average ${x} rates ${r}, below ${prev} at ${prevX}`);
      prev = r; prevX = x;
    }
  });
  it('the table itself rises at every step, and the old one fell between 16 and 18', () => {
    for (let i = 1; i < PARITY.length; i++) expect(PARITY[i][1]).toBeGreaterThan(PARITY[i - 1][1]);
    expect(parityRating(allAxes(18), 1)).toBeLessThan(parityRating(allAxes(16), 1));
  });
  it('the shape: as before up to 16, then 82 at 18 and 88 at 20', () => {
    for (let i = 0; i <= 1600; i++) expect(parityRating(allAxes(i / 100))).toBe(parityRating(allAxes(i / 100), 1));
    expect(parityRating(allAxes(16))).toBe(76);
    expect(parityRating(allAxes(18))).toBe(82);
    expect(parityRating(allAxes(20))).toBe(88);
    expect(parityRating(V(16, 17, 18, 15, 17, 19))).toBeCloseTo(76 + 3 * (17 - 16));
  });
  it('the rating reads only the average: a lopsided night rates as an even one of the same average', () => {
    expect(parityRating(V(20, 20, 20, 14, 14, 14))).toBeCloseTo(parityRating(allAxes(17)));
  });
  it('a better night meets a smaller gap against the same club', () => {
    expect(matchup(allAxes(18), opp(85)).gap).toBeLessThan(matchup(allAxes(16.5), opp(85)).gap);
  });
});

describe('better than usual counts half as much again (decision 5a)', () => {
  const typical = V(14, 14, 14, 12, 12, 12);
  const better = V(18, 18, 18, 16, 16, 16);
  it('chances are sized half way between tonight and the typical shape', () => {
    expect(TYPICAL_WEIGHT).toBe(0.5);
    expect(refFor(better, typical)).toEqual(V(16, 16, 16, 14, 14, 14));
    expect(refFor(better, typical, [], 1)).toEqual(typical);
    expect(refFor(better, undefined)).toEqual(better);
  });
  it('an unlogged axis is sized as before: at typical with history, at the fog value without', () => {
    expect(refFor(better, typical, ['Rest']).Rest).toBe(12);
    expect(refFor(better, undefined, ['Rest']).Rest).toBe(4);
  });
  it('a better night than usual still helps, but less than before', () => {
    const base = { values: better, opp: opp(80), home: true, stack: 0, abilities: [], bench: [], pre: [], conds: [] };
    const mean = (x: Partial<MatchInput>) => {
      let s = 0, n = 0;
      for (let i = 0; i < 300; i++) for (const c of playMatch({ ...base, ...x, seed: 7 + i * 7919 } as MatchInput).chances) if (c.side === 'atk') { s += c.pct; n++; }
      return s / n;
    };
    const none = mean({}), half = mean({ typical }), full = mean({ typical, parity: 1 });
    expect(half).toBeGreaterThan(none);
    expect(half).toBeLessThan(full);
  });
  it('without history nothing changes for a night below 16', () => {
    const input = { seed: 42, values: V(15, 14, 15, 11, 13, 14), opp: opp(70), home: false, stack: 0, abilities: [], bench: [], pre: [], conds: [] } as MatchInput;
    expect(playMatch(input)).toEqual(playMatch({ ...input, parity: 1 }));
    for (const a of AXES) expect(refFor(input.values, undefined)[a]).toBe(input.values[a]);
  });
});

describe('matches set up before the fix finish as they began', () => {
  let n = 0;
  beforeEach(async () => {
    setDatabase(new HealthDB(`fb-rating-${++n}`));
    await db.open();
    await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
    for (let i = 0; i < 20; i++) await patchDay(addDays('2026-10-01', i), { steps: 9000 + i * 100, sleep: { asleep: 1380, woke: 420 } });
    await foundClub('2026-10-10', { shirt: 'H1', crest: 'a' });
  });
  it('a new paused match is stamped with the new rules; one stored without a stamp plays the old ones', async () => {
    await kickOff('2026-10-10');
    const p = (await pausedMatch())!;
    const save = (await db.fbSave.get('save'))!;
    expect(p.input.parity).toBe(2);
    expect(pausedInput(p, save, { watch: false }).parity).toBe(2);
    const { parity: _drop, ...old } = p.input;
    expect(pausedInput({ ...p, input: old }, save, { watch: false }).parity).toBe(1);
  });
});
