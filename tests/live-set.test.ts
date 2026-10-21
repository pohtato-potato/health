import { describe, expect, it } from 'vitest';
import { burnNudge, counter, repsSlowing, seconds, setState, stateWord, tapTempo } from '../src/domain/liveSet';
import type { LiveCounter } from '../src/domain/types';

const fresh: LiveCounter = { key: 'curl:1:both', taps: [] };
const run = (...as: Parameters<typeof counter>[1][]) => as.reduce(counter, fresh);
const tapsAt = (gaps: number[]) => gaps.reduce((ts, g) => [...ts, ts[ts.length - 1] + g * 1000], [0]);

describe('the tap counter', () => {
  it('counts taps and marks the burn at the count so far', () => {
    const c = run({ t: 'tap', at: 1000 }, { t: 'tap', at: 2000 }, { t: 'hold', at: 2500 }, { t: 'tap', at: 3000 });
    expect(c.taps).toHaveLength(3);
    expect(c.burnAt).toBe(2);
    expect(c.startedAt).toBe(1000);
  });
  it('a second hold moves the burn', () => {
    expect(run({ t: 'tap', at: 1 }, { t: 'hold', at: 2 }, { t: 'tap', at: 3 }, { t: 'hold', at: 4 }).burnAt).toBe(2);
  });
  it('−1 keeps the burn at or below the count', () => {
    const c = run({ t: 'tap', at: 1 }, { t: 'tap', at: 2 }, { t: 'hold', at: 3 }, { t: 'tap', at: 4 }, { t: 'undo' }, { t: 'undo' });
    expect(c.taps).toHaveLength(1);
    expect(c.burnAt).toBe(1);
  });
  it('−1 to nothing clears the burn and the start', () => {
    const c = run({ t: 'tap', at: 1 }, { t: 'hold', at: 2 }, { t: 'undo' });
    expect(c.burnAt).toBeUndefined();
    expect(c.startedAt).toBeUndefined();
  });
  it('a cancelled touch changes nothing', () => {
    const c = run({ t: 'tap', at: 1 });
    expect(counter(c, { t: 'cancel' })).toEqual(c);
  });
  it('a timed set counts seconds from the first tap', () => {
    expect(seconds(run({ t: 'tap', at: 1000 }), 66_000)).toBe(65);
    expect(seconds(fresh, 66_000)).toBe(0);
  });
});

describe('the colour of a set', () => {
  it('ranks record over burn over in range over building', () => {
    expect(setState({ reps: 13, bar: 12, burnAt: 9, bottom: 10 })).toBe('record');
    expect(setState({ reps: 11, bar: 12, burnAt: 9, bottom: 10 })).toBe('burn');
    expect(setState({ reps: 10, bottom: 10 })).toBe('in');
    expect(setState({ reps: 9, bottom: 10 })).toBe('build');
  });
  it('is never a record without a bar', () => expect(setState({ reps: 50 })).not.toBe('record'));
  it('says the state in words', () => {
    expect(stateWord('burn')).toBe('in the burn');
    expect(stateWord('in')).toBe('in range');
    expect(stateWord('build')).toBe('building');
    expect(stateWord('record', 12)).toBe('new record · best was 12');
    expect(stateWord('record', 0)).toBe('new record · first time at this load');
  });
});

describe('tempo after a tap', () => {
  it('lowers for 3 s, lifts for 1 s, then waits', () => {
    expect(tapTempo(undefined)).toEqual({ phase: 'idle', beat: null, frac: 0 });
    expect(tapTempo(0)).toEqual({ phase: 'down', beat: 3, frac: 0 });
    expect(tapTempo(2500)).toMatchObject({ phase: 'down', beat: 1 });
    expect(tapTempo(3500)).toEqual({ phase: 'up', beat: 0, frac: 0.5 });
    expect(tapTempo(4000).phase).toBe('idle');
  });
});

describe('reps slowing', () => {
  it('when the last two reps take 30% longer than the first three', () => expect(repsSlowing(tapsAt([2, 2, 2, 2, 3, 3]))).toBe(true));
  it('not at an even pace', () => expect(repsSlowing(tapsAt([2, 2, 2, 2, 2, 2]))).toBe(false));
  it('not before six reps', () => expect(repsSlowing(tapsAt([2, 2, 3, 3]))).toBe(false));
});

describe('the burn nudge', () => {
  it('on isolation work after a set with 2+ left', () => {
    expect(burnNudge({ isolation: true }, { rir: 2 })).toBe(true);
    expect(burnNudge({ isolation: true }, { rir: 1 })).toBe(false);
    expect(burnNudge({}, { rir: 3 })).toBe(false);
    expect(burnNudge({ isolation: true }, undefined)).toBe(false);
  });
});
