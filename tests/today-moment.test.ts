import { describe, expect, it } from 'vitest';
import { logMinutes, momentFor, type MomentInput } from '../src/domain/todayMoment';

const hm = (h: number, m = 0) => h * 60 + m;
const base: MomentInput = { minutes: hm(16), morningDone: true, perfect: false, dayClosed: false, proteinGapG: 0, stepsLeft: 0 };
const at = (o: Partial<MomentInput>) => momentFor({ ...base, ...o });

describe('momentFor: the moment card rule', () => {
  it('sick, injured and break show rest whatever else is true', () => {
    for (const status of ['sick', 'injured', 'break'] as const) expect(at({ status, perfect: true, minutes: hm(22), morningDone: false })).toBe('rest');
  });
  it('travelling is not a rest day', () => {
    expect(at({ status: 'travelling' })).not.toBe('rest');
  });
  it('a closed day shows closed, even at 20:00 with a protein gap', () => {
    expect(at({ dayClosed: true, minutes: hm(20), proteinGapG: 22 })).toBe('closed');
  });
  it("shows morning before 14:00 when the morning log isn't done", () => {
    expect(at({ morningDone: false, minutes: hm(13, 59) })).toBe('morning');
    expect(at({ morningDone: false, minutes: hm(14) })).not.toBe('morning');
  });
  it('shows perfect from 19:00', () => {
    expect(at({ perfect: true, minutes: hm(18, 59) })).not.toBe('perfect');
    expect(at({ perfect: true, minutes: hm(19) })).toBe('perfect');
  });
  it('shows close from 21:00', () => {
    expect(at({ minutes: hm(20, 59), proteinGapG: 22 })).toBe('protein');
    expect(at({ minutes: hm(21), proteinGapG: 22 })).toBe('close');
  });
  it('00:30 still counts as the evening', () => {
    expect(at({ minutes: 1470 })).toBe('close');
  });
  it('shows protein 19:00–21:00 only with a gap', () => {
    expect(at({ minutes: hm(19, 30), proteinGapG: 0 })).not.toBe('protein');
    expect(at({ minutes: hm(19, 30), proteinGapG: 22 })).toBe('protein');
  });
  it('shows steps 11:00–19:00 when steps are left', () => {
    expect(at({ minutes: hm(10, 59), stepsLeft: 3880 })).not.toBe('steps');
    expect(at({ minutes: hm(11), stepsLeft: 3880 })).toBe('steps');
    expect(at({ minutes: hm(19), stepsLeft: 3880 })).toBe('glance');
  });
  it('an empty day falls back to glance', () => {
    expect(at({})).toBe('glance');
  });
});

describe('logMinutes', () => {
  const local = (h: number, m: number) => new Date(2026, 9, 22, h, m).getTime();
  it('counts 00:30 as 1470, 03:59 as 1679 and 04:00 as 240', () => {
    expect(logMinutes(local(0, 30))).toBe(1470);
    expect(logMinutes(local(3, 59))).toBe(1679);
    expect(logMinutes(local(4, 0))).toBe(240);
  });
});
