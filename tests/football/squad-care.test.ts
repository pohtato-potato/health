import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/domain/dates';
import { physio } from '../../src/football/discipline';
import { playMatch, type MatchInput } from '../../src/football/engine';
import { opponentFor } from '../../src/football/opponent';
import { clubById } from '../../src/football/data/load';
import {
  backLine, capChance, cleanBill, conditionCap, conditionOn, dressingRoom, letDown, lowLogNight, lowLogOn, meetingDue, missedInWeek, onInjuryList, typicalShape,
} from '../../src/football/squadCare';
import { allAxes, type AxisValues } from '../../src/football/types';

const D = '2026-11-12';
const meds = (missed: number[]) => Array.from({ length: 9 }, (_, i) => ({ date: addDays(D, -(i + 1)), allTaken: !missed.includes(i + 1) }));

describe('medicines (C2, q-meds3 A)', () => {
  it('one missed day stays a small knock', () => expect(physio(meds([1]), D, false)).toMatchObject({ state: 'knock' }));
  it('three missed days in a week, none in a row, is an injury: Rest −4', () => {
    expect(missedInWeek(meds([1, 3, 5]), addDays(D, -1))).toBe(3);
    const p = physio(meds([2, 4, 6]), D, false);
    expect(p.state).toBe('injury');
    expect(p.mods).toEqual([{ axis: 'Rest', d: -4, why: 'Injury', kind: 'knock' }]);
  });
  it('the injury lasts two matches', () => {
    // Missed 3, 5, 7 days before D: the window ending D−2 has three, so D still plays injured.
    expect(physio(meds([3, 5, 7]), D, false).state).toBe('injury');
    // A third match later, the week has moved on.
    expect(physio(meds([5, 7, 9]), D, false).state).toBe('fit');
  });
  it('a full week earns a clean bill', () => {
    expect(cleanBill(meds([]), D)).toBe(true);
    expect(cleanBill(meds([7]), D)).toBe(false);
  });
});

describe('the injury list (C6)', () => {
  it('covers sick, injured and break days, not travelling', () => {
    expect(['sick', 'injured', 'break'].every((s) => onInjuryList(s))).toBe(true);
    expect(onInjuryList('travelling')).toBe(false);
  });
  it('the first match back says what the Rotation XI did, and that nothing was lost', () => {
    const line = backLine([{ result: 'D' }, { result: 'W' }])!;
    expect(line).toContain('won 1, drew 1');
    expect(line).toContain('nothing was lost');
    expect(backLine([])).toBeUndefined();
  });
});

describe('low-log weeks (b-lowlog)', () => {
  const typical = { Pace: 12, Power: 11, Fuel: 13, Rest: 14, Routine: 15, Shape: 10 } as AxisValues;
  it('runs one week at a time', () => {
    expect(lowLogOn({ week: '2026-11-09', axis: 'Pace' }, D)).toBe(true);
    expect(lowLogOn({ week: '2026-11-09', axis: 'Pace' }, '2026-11-16')).toBe(false);
  });
  it('plays the rest at your typical level when the chosen habit is logged, never below what you logged', () => {
    const v = { Pace: 16, Power: 5, Fuel: 18, Rest: 5, Routine: 9, Shape: 10 } as AxisValues;
    const r = lowLogNight(v, { Power: 'not-logged', Rest: 'not-logged' }, typical, 'Pace');
    expect(r.applied).toBe(true);
    expect(r.values).toEqual({ Pace: 16, Power: 11, Fuel: 18, Rest: 14, Routine: 15, Shape: 10 });
    expect(r.flags).toEqual({});
  });
  it('does nothing when the chosen habit was not logged', () => {
    const v = allAxes(5);
    expect(lowLogNight(v, { Pace: 'not-logged' }, typical, 'Pace').applied).toBe(false);
  });
  it('typical is the median', () => expect(typicalShape([allAxes(10), allAxes(14), allAxes(12)])!.Pace).toBe(12));
});

describe('the dressing room (b-morale)', () => {
  const v = { Pace: 14, Power: 9, Fuel: 12, Rest: 4, Routine: 15, Shape: 10 } as AxisValues;
  it('after a defeat, +1 on the logged axis that let you down', () => {
    expect(letDown(v, { Rest: 'not-logged' })).toBe('Power');
    expect(dressingRoom({ result: 'L', values: v, flags: { Rest: 'not-logged' } })).toEqual({ axis: 'Power', d: 1, why: 'Dressing room responds', kind: 'ability' });
  });
  it('nothing after a win, a draw or a Rotation XI night', () => {
    expect(dressingRoom({ result: 'W', values: v })).toBeUndefined();
    expect(dressingRoom({ result: 'D', values: v })).toBeUndefined();
    expect(dressingRoom({ result: 'L', values: v, rotation: true })).toBeUndefined();
  });
  it('two defeats in a row bring one meeting, not one every loss after', () => {
    expect(meetingDue(['W', 'L', 'L'])).toBe(true);
    expect(meetingDue(['L', 'L', 'L'])).toBe(false);
    expect(meetingDue(['L', 'W'])).toBe(false);
  });
});

describe('squad condition (q-cond A)', () => {
  it('hard days in a row tire the squad; rest and full nights refill it', () => {
    const hard = (d: string) => d >= addDays(D, -4);
    expect(conditionOn(hard, () => false, D)).toBe(50);
    expect(conditionOn(() => false, () => false, D)).toBe(100);
    expect(conditionOn(hard, () => true, D)).toBeGreaterThan(conditionOn(hard, () => false, D));
  });
  it('maps condition to a ceiling: 20 at full, 10 at the floor', () => {
    expect(conditionCap(100)).toBe(20);
    expect(conditionCap(75)).toBe(15);
    expect(conditionCap(50)).toBe(10);
  });
  it('caps only the lifts on Power and Pace, never below the logged values', () => {
    const base = { ...allAxes(10), Power: 16 } as AxisValues;
    const v = { ...base, Power: 19, Pace: 14, Fuel: 18 };
    const mods = capChance(v, base, { Power: 12, Pace: 12 });
    expect(v.Power).toBe(16);
    expect(v.Pace).toBe(12);
    expect(v.Fuel).toBe(18);
    expect(mods.map((m) => m.why)).toEqual(['Squad condition', 'Squad condition']);
  });
  it('plays through the engine: a capped night never scores more than an uncapped one on the same seed', () => {
    const input: MatchInput = { seed: 7, values: allAxes(15), opp: opponentFor(clubById('bay')), home: true, stack: 0, abilities: [], bench: [], pre: [], conds: [] };
    const free = playMatch(input), capped = playMatch({ ...input, condCap: { Power: 10, Pace: 10 } });
    expect(capped.score[0]).toBeLessThanOrEqual(free.score[0] + 0);
    for (const c of capped.chances) if (c.side === 'atk') { expect(c.values.Power).toBeLessThanOrEqual(15); expect(c.values.Pace).toBeLessThanOrEqual(15); }
  });
});
