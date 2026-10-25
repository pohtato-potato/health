import { describe, expect, it } from 'vitest';
import { STRIDE_M } from '../src/domain/walk';
import type { SmallStop, Stretch } from '../src/walk/content/types';
import { STOP_KINDS, STOP_WORDS } from '../src/walk/content/types';
import { stopToday, stretchAt, stretchDay, stretchesEnded } from '../src/walk/road';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);
const stretch = (id: string, fromKm: number, toKm: number): Stretch => ({ id, name: id, plain: `${id} road`, fromKm, toKm, page: ['a', 'b'], sources: [{ title: 's' }] });
const stop = (id: string, km: number): SmallStop => ({ id, kind: 'river', km, name: id, facts: ['1', '2', '3'], sources: [{ title: 's' }] });
const STRETCHES = [stretch('one', 230, 315), stretch('two', 315, 465)];
const STOPS = [stop('a', 250), stop('b', 260), stop('c', 300)];

describe('the road’s rules', () => {
  it('finds the stretch you’re on, none before the first or past the last', () => {
    expect(stretchAt(230, STRETCHES)?.id).toBe('one');
    expect(stretchAt(314.9, STRETCHES)?.id).toBe('one');
    expect(stretchAt(315, STRETCHES)?.id).toBe('two');
    expect(stretchAt(229, STRETCHES)).toBeUndefined();
    expect(stretchAt(465, STRETCHES)).toBeUndefined();
  });

  it('gives the last stop reached today, and none on a day without one', () => {
    const s = new Map([['2026-01-01', steps(245)], ['2026-01-02', steps(20)], ['2026-01-03', steps(5)]]);
    expect(stopToday(s, '2026-01-02', STOPS)?.id).toBe('b'); // passed a (250) and b (260) on the 2nd
    expect(stopToday(s, '2026-01-03', STOPS)).toBeUndefined();
    expect(stopToday(s, '2026-01-01', STOPS)).toBeUndefined();
  });

  it('counts the day of the stretch from the day you entered it', () => {
    const s = new Map([['2026-01-01', steps(225)], ['2026-01-02', steps(10)], ['2026-01-04', steps(10)]]);
    expect(stretchDay(s, '2026-01-02', STRETCHES[0])).toBe(1);
    expect(stretchDay(s, '2026-01-05', STRETCHES[0])).toBe(4);
  });

  it('lists the stretches already ended, in order', () => {
    expect(stretchesEnded(new Map([['2026-01-01', steps(100)]]), STRETCHES)).toEqual([]);
    expect(stretchesEnded(new Map([['2026-01-01', steps(470)]]), STRETCHES).map((x) => x.id)).toEqual(['one', 'two']);
  });

  it('has a word for every kind of stop', () => {
    expect(STOP_KINDS).toHaveLength(6);
    for (const k of STOP_KINDS) expect(STOP_WORDS[k]).toBeTruthy();
    expect(STOP_WORDS.fort).toBe('Forts and temples');
  });
});
