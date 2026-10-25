import { describe, expect, it } from 'vitest';
import { dayGlow, isDayGlow } from '../src/domain/dayGlow';
import { regionAt } from '../src/domain/regions';
import { regionTint } from '../src/ui/live/regionTint';
import { auroraFor } from '../src/walk/page';

describe('dayGlow: how the day went, as a light on the land', () => {
  it('is none on an ordinary day with no session', () => expect(dayGlow({ perfect: false })).toBeUndefined());
  it('is none after a calm session', () => expect(dayGlow({ perfect: false, session: { records: 1, checks: 0.6 } })).toBeUndefined());
  it('is in range after a session with good form', () => {
    expect(dayGlow({ perfect: false, session: { records: 0, checks: 0.85 } })).toBe('in');
    expect(dayGlow({ perfect: false, session: { records: 0, formAvg: 4.2 } })).toBe('in');
  });
  it('is a record night with more than one record', () => expect(dayGlow({ perfect: false, session: { records: 2 } })).toBe('record'));
  it('a record beats in range', () => expect(dayGlow({ perfect: false, session: { records: 3, checks: 0.95 } })).toBe('record'));
  it('a perfect day beats everything', () => {
    expect(dayGlow({ perfect: true })).toBe('perfect');
    expect(dayGlow({ perfect: true, session: { records: 3 } })).toBe('perfect');
    expect(dayGlow({ perfect: true, session: { records: 0, checks: 0.9 } })).toBe('perfect');
  });
});

describe('isDayGlow: the dev override takes only real glows', () => {
  it('accepts the three glows', () => ['in', 'record', 'perfect'].forEach((g) => expect(isDayGlow(g)).toBe(true)));
  it('refuses anything else', () => [null, '', 'calm', 'gold', 'PERFECT'].forEach((g) => expect(isDayGlow(g)).toBe(false)));
});

describe('regionTint: the region is the ground, the glow is its light', () => {
  const km = 300;
  it('is the region aurora on an ordinary day', () => expect(regionTint(km)).toEqual(auroraFor(regionAt(km))));
  it('green after a session in range, in the live session\'s own rich colours', () =>
    expect(regionTint(km, 'in')).toMatchObject({ '--lv-a': auroraFor(regionAt(km))['--lv-a'], '--lv-glow': '#1a8f6a', '--lv-accent': '#bfe8d4' }));
  it('gold after a record night or on a perfect day', () => {
    expect(regionTint(km, 'record')).toMatchObject({ '--lv-glow': '#8a6420', '--lv-accent': '#f6cf72' });
    expect(regionTint(km, 'perfect')).toMatchObject({ '--lv-glow': '#8a6420', '--lv-accent': '#f6cf72' });
  });
});
