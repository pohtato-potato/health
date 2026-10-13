import { describe, expect, it } from 'vitest';
import { ACH_SETS, ACHIEVEMENTS, RETIRED_ACHIEVEMENTS, visibleAchievements } from '../src/domain/achievements';
import { constellationFor, skyStars } from '../src/domain/nightSky';
import { shakeIgnored } from '../src/state/restState';
import { voiceFor } from '../src/domain/voice';
import type { Settings } from '../src/domain/types';

describe('achievements v2', () => {
  it('retired hidden from totals, with water and passport ones', () => {
    const v = visibleAchievements({ prefs: { water: false } } as unknown as Settings);
    expect(v.some((a) => RETIRED_ACHIEVEMENTS.includes(a.id))).toBe(false);
    expect(v.some((a) => a.cat === 'water')).toBe(false);
    expect(v.some((a) => typeof a.desc === 'string' && /passport/i.test(a.desc))).toBe(false);
    expect(v.length).toBeLessThan(ACHIEVEMENTS.length);
    expect(v.length).toBeGreaterThan(150);
  });

  it('sets group visible achievements, each with what finishing it unlocks', () => {
    const v = new Set(visibleAchievements({ prefs: { water: false } } as unknown as Settings).map((a) => a.id));
    const seen = new Set<string>();
    for (const s of ACH_SETS) {
      expect(s.unlocks.length, s.name).toBeGreaterThan(3);
      expect(s.ids.length, s.name).toBeGreaterThanOrEqual(4);
      for (const id of s.ids) {
        expect(v.has(id), `${s.name}: ${id}`).toBe(true);
        expect(seen.has(id), id).toBe(false);
        seen.add(id);
      }
    }
    expect(ACH_SETS.length).toBeGreaterThanOrEqual(6);
  });
});

describe('shake', () => {
  it('shake ignored 5 s after set and during rest', () => {
    expect(shakeIgnored(10_000, 6_000, false)).toBe(true);
    expect(shakeIgnored(12_000, 6_000, false)).toBe(false);
    expect(shakeIgnored(60_000, 6_000, true)).toBe(true);
    expect(shakeIgnored(60_000, undefined, false)).toBe(false);
  });
});

describe('voice', () => {
  it('voice is gremlin regardless of stored voice', () => {
    expect(voiceFor('zen', false, 'x')).toBe('gremlin');
    expect(voiceFor('coach', true, 'y')).toBe('gremlin');
  });
});

describe('night sky', () => {
  it('a star for every perfect day, and a named constellation per month', () => {
    const stars = skyStars(['2026-09-03', '2026-09-10', '2026-10-01']);
    expect(stars).toHaveLength(3);
    expect(new Set(stars.map((s) => `${s.x},${s.y}`)).size).toBe(3);
    expect(skyStars(['2026-09-03'])[0]).toEqual(stars[0]);
    const c = constellationFor('2026-09');
    expect(c.name.length).toBeGreaterThan(3);
    expect(constellationFor('2026-09')).toEqual(c);
    expect(constellationFor('2026-10').name).not.toBe(c.name);
  });
});
