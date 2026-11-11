// Cup runs, layer 1: dealing the deck from the last seven nights (spec §3, §12). Invented values only.
import { describe, expect, it } from 'vitest';
import { dealDeck, levelFor, SLOTS, type DealDay, type DealInput } from '../../../src/football/cup/deck';
import { AXES, type Axis, type AxisFlags, type AxisValues } from '../../../src/football/types';

const all = (x: number): AxisValues => ({ Pace: x, Power: x, Fuel: x, Rest: x, Routine: x, Shape: x });
const day = (n: number, values: AxisValues, more: Partial<DealDay> = {}): DealDay => ({
  date: `2026-11-0${n + 1}`, values, flags: {}, empty: false, perfect: false, records: [], ...more,
});
const week = (values: AxisValues, more: Partial<DealDay> = {}) => Array.from({ length: 7 }, (_, i) => day(i, values, more));
const input = (days: DealDay[], more: Partial<DealInput> = {}): DealInput => ({ days, form28: {}, firstWeek: false, loans: [], ...more });
const rowOf = (d: ReturnType<typeof dealDeck>, a: Axis) => d.rows.find((r) => r.axis === a)!;

describe('levels', () => {
  it('15 or more is great, 11 to 14 good, under 11 basic', () => {
    expect(levelFor(15)).toBe('great');
    expect(levelFor(20)).toBe('great');
    expect(levelFor(14.9)).toBe('good');
    expect(levelFor(11)).toBe('good');
    expect(levelFor(10.9)).toBe('basic');
    expect(levelFor(1)).toBe('basic');
  });
});

describe('the twelve cards', () => {
  it('fills the slots: Pace 3, Power 3, Fuel 2, Rest 2, Routine 1, Shape 1', () => {
    const d = dealDeck(input(week(all(12))));
    expect(d.cards).toHaveLength(12);
    const count = (a: Axis) => d.cards.filter((c) => c.axis === a).length;
    expect(AXES.map(count)).toEqual([3, 3, 2, 2, 1, 1]);
    expect(SLOTS.Pace).toEqual(['one-two', 'one-two', 'overlap']);
    expect(SLOTS.Power).toEqual(['strike', 'strike', 'header']);
    expect(d.cards.every((c) => c.level === 'good')).toBe(true);
  });

  it('a stronger week gives better cards, never more', () => {
    const great = dealDeck(input(week(all(17))));
    const basic = dealDeck(input(week(all(6))));
    expect(great.cards).toHaveLength(12);
    expect(basic.cards).toHaveLength(12);
    expect(great.cards.every((c) => c.level === 'great')).toBe(true);
    expect(basic.cards.every((c) => c.level === 'basic')).toBe(true);
  });

  it('each axis reads its own seven-day average', () => {
    const days = week({ Pace: 16, Power: 12, Fuel: 8, Rest: 15, Routine: 11, Shape: 10 });
    const d = dealDeck(input(days));
    expect(rowOf(d, 'Pace').level).toBe('great');
    expect(rowOf(d, 'Power').level).toBe('good');
    expect(rowOf(d, 'Fuel').level).toBe('basic');
    expect(rowOf(d, 'Rest').level).toBe('great');
    expect(rowOf(d, 'Routine').level).toBe('good');
    expect(rowOf(d, 'Shape').level).toBe('basic');
    expect(rowOf(d, 'Pace').avg).toBe(16);
  });

  it('a night that axis was not logged is left out of the average', () => {
    const days = week(all(16));
    days[0] = day(0, { ...all(16), Fuel: 2 }, { flags: { Fuel: 'not-logged' } });
    days[1] = day(1, { ...all(16), Fuel: 10 }, { flags: { Fuel: 'no-data' } });
    const d = dealDeck(input(days));
    expect(rowOf(d, 'Fuel').avg).toBe(16);
    expect(rowOf(d, 'Fuel').days).toBe(5);
  });

  it('an axis with no logged night in the seven is dealt as hopeful punts', () => {
    const flags: AxisFlags = { Rest: 'not-logged' };
    const d = dealDeck(input(week(all(14), { flags })));
    expect(rowOf(d, 'Rest').level).toBe('punt');
    expect(d.cards.filter((c) => c.kind === 'punt')).toHaveLength(2);
    expect(d.cards).toHaveLength(12);
    expect(rowOf(d, 'Rest').why).toMatch(/not logged/i);
  });

  it('first week: an axis with too little data is dealt at basic, not as punts', () => {
    const flags: AxisFlags = { Rest: 'no-data' };
    const d = dealDeck(input(week(all(14), { flags }), { firstWeek: true }));
    expect(rowOf(d, 'Rest').level).toBe('basic');
    expect(d.cards.some((c) => c.kind === 'punt')).toBe(false);
    expect(rowOf(d, 'Rest').why).toMatch(/first week/i);
  });
});

describe('sick and travelling days', () => {
  it('count at 28-day form, capped at basic, and never give a punt', () => {
    const days = week(all(16));
    for (let i = 0; i < 4; i++) days[i] = day(i, all(10), { status: 'sick', flags: Object.fromEntries(AXES.map((a) => [a, 'no-data'])) as AxisFlags });
    const d = dealDeck(input(days, { form28: all(16) }));
    // Four days at 10 (capped) and three at 16: 12.6, good.
    expect(rowOf(d, 'Pace').avg).toBeCloseTo((4 * 10 + 3 * 16) / 7, 5);
    expect(rowOf(d, 'Pace').level).toBe('good');
    expect(rowOf(d, 'Pace').away).toBe(4);
  });

  it('a whole week away deals basic cards, not punts', () => {
    const flags = Object.fromEntries(AXES.map((a) => [a, 'no-data'])) as AxisFlags;
    const d = dealDeck(input(week(all(10), { status: 'travelling', flags }), { form28: all(18) }));
    expect(d.cards.every((c) => c.level === 'basic' && c.kind !== 'punt')).toBe(true);
  });

  it('a low 28-day form counts as it is', () => {
    const flags = Object.fromEntries(AXES.map((a) => [a, 'no-data'])) as AxisFlags;
    const days = week(all(16));
    days[6] = day(6, all(10), { status: 'sick', flags });
    const d = dealDeck(input(days, { form28: all(4) }));
    expect(rowOf(d, 'Pace').avg).toBeCloseTo((6 * 16 + 4) / 7, 5);
  });
});

describe('extras', () => {
  it('a record gives a rare finish named for the exercise, at most two', () => {
    const days = week(all(12));
    days[1] = day(1, all(12), { records: ['Exercise A'] });
    days[3] = day(3, all(12), { records: ['Exercise B', 'Exercise C'] });
    days[4] = day(4, all(12), { records: ['Exercise A'] });
    const d = dealDeck(input(days));
    const rare = d.cards.filter((c) => c.kind === 'thunderbolt');
    expect(rare.map((c) => c.name)).toEqual(['Exercise A', 'Exercise B']);
    expect(d.cards).toHaveLength(14);
    expect(d.extras.filter((e) => e.kind === 'record')).toHaveLength(2);
  });

  it('a day with every ring closed gives Total football, at most two', () => {
    const d = dealDeck(input(week(all(12), { perfect: true })));
    expect(d.cards.filter((c) => c.kind === 'total')).toHaveLength(2);
  });

  it('a day with nothing logged adds a hopeful punt, at most three; sick days never do', () => {
    const days = week(all(12));
    for (let i = 0; i < 5; i++) days[i] = day(i, all(2), { empty: true });
    days[5] = day(5, all(10), { empty: true, status: 'sick' });
    const d = dealDeck(input(days));
    expect(d.extras.filter((e) => e.kind === 'empty')).toHaveLength(3);
    expect(d.cards.filter((c) => c.kind === 'punt')).toHaveLength(3);
  });

  it('a loan player at the club brings its own card', () => {
    const d = dealDeck(input(week(all(12)), { loans: [{ id: 'l1', name: 'A Loan', axis: 'Power' }] }));
    const loan = d.cards.find((c) => c.kind === 'loan')!;
    expect(loan.name).toBe('A Loan');
    expect(loan.level).toBe('great');
    expect(loan.loanAs).toBe('strike');
  });

  it('every card has its own id', () => {
    const days = week(all(12), { perfect: true, records: ['X'] });
    const d = dealDeck(input(days, { loans: [{ id: 'l1', name: 'L', axis: 'Pace' }] }));
    expect(new Set(d.cards.map((c) => c.id)).size).toBe(d.cards.length);
  });

  it('every row reason fits the screen: two short lines at most', () => {
    const days = week(all(12), { perfect: true, records: ['X'] });
    days[0] = day(0, all(2), { empty: true, flags: { Pace: 'not-logged' } });
    const d = dealDeck(input(days));
    for (const r of [...d.rows.map((x) => x.why), ...d.extras.map((x) => x.why)]) expect(r.length).toBeLessThan(90);
  });
});
