import { describe, expect, it } from 'vitest';
import { atOn } from '../src/domain/dates';
import { dosesAllowPerfect, lanternOn, courseOn, dayDoses, keptCount, keptWeek, nextDose, onTime, refillBy, doseSchedule } from '../src/domain/medicines';
import type { ChecklistItem } from '../src/domain/types';

const drops: ChecklistItem = {
  id: 'drops',
  name: 'Eye drops',
  slots: ['8 am', '2 pm', '6 pm', '11 pm'],
  active: true,
  med: { kind: 'medicine', form: 'drops', courses: [{ from: '2026-10-27', slots: ['8 am', '11 pm'] }] },
};
const tablet: ChecklistItem = { id: 'tab', name: 'Tablet', slots: ['8 am', '9 pm'], active: true, med: { kind: 'medicine', form: 'tablet', stock: { left: 9, perDose: 1 } } };
const settings = { places: [] };

describe('medicines', () => {
  it('on time means within 60 minutes of the plan', () => {
    const planned = atOn('2026-10-13', 480);
    expect(onTime(planned + 59 * 60_000, planned)).toBe(true);
    expect(onTime(planned - 30 * 60_000, planned)).toBe(true);
    expect(onTime(planned + 61 * 60_000, planned)).toBe(false);
  });

  it('courses switch on their date', () => {
    expect(courseOn('2026-10-26', drops)).toEqual(['8 am', '2 pm', '6 pm', '11 pm']);
    expect(courseOn('2026-10-27', drops)).toEqual(['8 am', '11 pm']);
    expect(courseOn('2026-11-30', drops)).toEqual(['8 am', '11 pm']);
    expect(courseOn('2026-10-13', tablet)).toEqual(['8 am', '9 pm']);
  });

  it('refill date from stock and doses', () => {
    // 9 tablets, two a day from Monday 12 Oct: the ninth goes on Friday morning.
    expect(refillBy(tablet.med!.stock!, tablet, '2026-10-12')).toBe('2026-10-16');
    expect(refillBy({ left: 0, perDose: 1 }, tablet, '2026-10-12')).toBe('2026-10-12');
  });

  it('next dose is the first untaken one, up to an hour overdue', () => {
    const sched = doseSchedule([drops, tablet], '2026-10-13', settings, undefined);
    const at = atOn('2026-10-13', 13 * 60);
    const next = nextDose(at, sched, { 'drops:0': 1 });
    expect(next?.key).toBe('drops:1');
    expect(nextDose(at, sched, { 'drops:1': at })?.key).toBe('drops:2');
    expect(nextDose(atOn('2026-10-13', 23 * 60 + 30), sched, {})?.key).toBe('drops:3');
    expect(nextDose(atOn('2026-10-13', 23 * 60 + 30), sched, { 'drops:3': 1 })).toBeUndefined();
  });

  it('a day sorts doses into on time, late and missed', () => {
    const d = { date: '2026-10-13', ticks: { 'tab:0': atOn('2026-10-13', 490), 'tab:1': atOn('2026-10-13', 23 * 60 + 30) }, missed: {} };
    expect(dayDoses([tablet], d, settings, atOn('2026-10-14', 600))).toEqual({ planned: 2, onTime: 1, late: 1, missed: 0 });
    expect(dayDoses([tablet], { date: '2026-10-13', missed: { 'tab:1': true } }, settings, atOn('2026-10-13', 600)).missed).toBe(2);
  });

  it('kept count pauses on a miss', () => {
    const on = (date: string) => ({ date, ticks: { 'tab:0': atOn(date, 480), 'tab:1': atOn(date, 1260) } });
    const days = [on('2026-10-10'), on('2026-10-11'), { date: '2026-10-12', missed: { 'tab:0': true as const } }, on('2026-10-13')];
    // 6 on-time doses; the miss neither adds nor wipes the count.
    expect(keptCount(tablet, days, settings, '2026-10-14')).toEqual({ count: 6, paused: false });
    expect(keptCount(tablet, days.slice(0, 3), settings, '2026-10-13')).toEqual({ count: 4, paused: true });
  });

  it('a kept week needs every dose of the week on time', () => {
    const on = (date: string) => ({ date, ticks: { 'tab:0': atOn(date, 480), 'tab:1': atOn(date, 1260) } });
    const week = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
    expect(keptWeek([tablet], week.map(on), settings, '2026-10-05')).toBe(true);
    expect(keptWeek([tablet], week.slice(1).map(on), settings, '2026-10-05')).toBe(false);
  });

  it('a lantern and a perfect day follow the reward switches', () => {
    const day = { date: '2026-10-13', ticks: { 'tab:0': atOn('2026-10-13', 480), 'tab:1': atOn('2026-10-13', 1260) } };
    const late = { date: '2026-10-13', ticks: { 'tab:0': atOn('2026-10-13', 700) } };
    const s = { places: [], checklist: [tablet], medRewards: { lantern: true, keptWeek: true, perfectDay: true, keptCount: true } };
    expect(lanternOn(s, day)).toBe(true);
    expect(lanternOn(s, late)).toBe(false);
    expect(lanternOn({ ...s, medRewards: { ...s.medRewards, lantern: false } }, day)).toBe(false);
    expect(dosesAllowPerfect(s, late)).toBe(false);
    expect(dosesAllowPerfect({ ...s, medRewards: { ...s.medRewards, perfectDay: false } }, late)).toBe(true);
    expect(dosesAllowPerfect({ ...s, checklist: [] }, late)).toBe(true);
  });
});
