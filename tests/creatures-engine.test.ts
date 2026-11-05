import { describe, expect, it } from 'vitest';
import { CREATURES, creatureById, figureFor, nameAt } from '../src/domain/creatureRoster';
import {
  companionFor, creatureThemeOn, dexRows, drawVisitors, earnedRingStyles, firstVisitor, grownOn, metBetween, nightWeight, notesSoFar, oddsFor, pityDue, recordFrames, revealDue, seeded, stageFor, stepsCreature, themeArrivals, visitorCount, type Sighting,
} from '../src/domain/creatures';

const seen = (date: string, creatureId: string, tier: Sighting['tier'], over: Partial<Sighting> = {}): Sighting => ({ id: `${date}:${creatureId}`, date, creatureId, tier, stageAfter: 1, grew: false, why: 'night', at: 1, ...over });
const base = { date: '2026-11-05', asleep: 1400, region: 'plains' as const, sightings: [] as Sighting[], roster: CREATURES, at: 1000, perfect: false, records: 0, sleepMin: 450 };

describe('who visits', () => {
  it('counts by sleep: 3 from 7 h, 2 from 6 h, else 1', () => {
    expect([visitorCount(420), visitorCount(419), visitorCount(360), visitorCount(359)]).toEqual([3, 2, 2, 1]);
  });
  it('brings the same visitors for the same date, and different ones across dates', () => {
    expect(drawVisitors(base)).toEqual(drawVisitors(base));
    const runs = new Set(Array.from({ length: 30 }, (_, i) => drawVisitors({ ...base, date: `2026-11-${String(i + 1).padStart(2, '0')}` }).map((v) => v.creatureId).join()));
    expect(runs.size).toBeGreaterThan(5);
  });
  it('draws everyday visitors from the region the walk is in, each at most once', () => {
    const out = drawVisitors(base).filter((v) => v.tier === 'everyday');
    for (const v of out) expect(creatureById(v.creatureId)!.region).toBe('plains');
    expect(new Set(out.map((v) => v.creatureId)).size).toBe(out.length);
  });
  it('falls back to the whole roster where nothing is drawn yet', () => {
    expect(drawVisitors({ ...base, region: 'himalaya' }).length).toBe(3);
  });
  it('doubles for temperament and for bedtime', () => {
    expect(nightWeight({ temperament: 'slow' }, 500, 1400)).toBe(2);
    expect(nightWeight({ temperament: 'restless' }, 300, 1400)).toBe(2);
    expect(nightWeight({ temperament: 'bold', hours: 'dawn' }, 420, 1320)).toBe(2);
    expect(nightWeight({ temperament: 'bold', hours: 'night' }, 420, 90)).toBe(2);
    expect(nightWeight({ temperament: 'bold' }, 420, 1400)).toBe(1);
  });
  it('adds up the odds per state', () => {
    expect(oddsFor({ perfect: false, records: 0, sleepMin: 400 })).toEqual({ medium: 0.04, rare: 0.01 });
    const all = oddsFor({ perfect: true, records: 2, sleepMin: 480 });
    expect(all.medium).toBeCloseTo(0.18);
    expect(all.rare).toBeCloseTo(0.1);
  });
  it('comes close to the promised rates over many days', () => {
    let rare = 0;
    let medium = 0;
    const days = 3000;
    for (let i = 0; i < days; i++) for (const v of drawVisitors({ ...base, date: `d${i}` })) {
      if (v.tier === 'rare') rare++;
      if (v.tier === 'medium') medium++;
    }
    expect(rare / days).toBeGreaterThan(0.01);
    expect(rare / days).toBeLessThan(0.04);
    expect(medium / days).toBeGreaterThan(0.04);
    expect(medium / days).toBeLessThan(0.1);
  });
  it('puts a rare guest last, and keeps the count', () => {
    const past = [seen('2026-09-01', 'peacock', 'everyday')];
    const out = drawVisitors({ ...base, perfect: true, sightings: past });
    expect(out).toHaveLength(3);
    expect(out[2].tier).toBe('rare');
    expect(out[2].why).toBe('pity');
  });
  it('the pity rule needs a perfect day and 45 days without a guest', () => {
    const s = [seen('2026-09-21', 'peacock', 'everyday')];
    expect(pityDue({ date: '2026-11-05', perfect: true, sightings: s })).toBe(true);
    expect(pityDue({ date: '2026-11-04', perfect: true, sightings: s })).toBe(false);
    expect(pityDue({ date: '2026-11-05', perfect: false, sightings: s })).toBe(false);
    expect(pityDue({ date: '2026-11-05', perfect: true, sightings: [...s, seen('2026-10-30', 'tanuki', 'rare')] })).toBe(false);
  });
});

describe('growth', () => {
  it('everyday at 4 and 10 visits', () => {
    expect([1, 3, 4, 9, 10, 20].map((v) => stageFor('everyday', v))).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it('medium: tracks, glimpse, sighting, legend at the 5th', () => {
    expect([1, 2, 3, 4, 5, 9].map((v) => stageFor('medium', v))).toEqual([1, 2, 3, 3, 4, 4]);
  });
  it('rare: a new form each visit, up to three', () => {
    expect([1, 2, 3, 7].map((v) => stageFor('rare', v))).toEqual([1, 2, 3, 3]);
  });
  it('marks a visit that moved it up, and not a first visit', () => {
    const three = ['2026-10-01', '2026-10-02', '2026-10-03'].map((d) => seen(d, 'x', 'everyday'));
    const one = { id: 'x', tier: 'everyday' as const, region: 'plains' as const, temperament: 'bold' as const };
    expect(drawVisitors({ ...base, roster: [one], sightings: three })[0]).toMatchObject({ stageAfter: 2, grew: true });
    expect(drawVisitors({ ...base, roster: [one] })[0]).toMatchObject({ stageAfter: 1, grew: false });
  });
  it('one new note per visit until they run out', () => {
    expect(notesSoFar(['a', 'b'], 1)).toEqual(['a']);
    expect(notesSoFar(['a', 'b'], 9)).toEqual(['a', 'b']);
  });
  it('hides a medium-rare name until its sighting', () => {
    const c = creatureById('cheetah')!;
    expect(nameAt(c, 2)).toBe('Not yet known');
    expect(nameAt(c, 3)).toBe(c.name);
  });
});

describe('when the reveal plays', () => {
  const day = { morning: {}, sleep: {} };
  const go = { logDay: '2026-11-05', calendarDay: '2026-11-05', momentsOn: true };
  it('after a morning log with sleep', () => expect(revealDue({ ...go, day })).toBe(true));
  it('waits while sleep is not logged', () => expect(revealDue({ ...go, day: { morning: {} } })).toBe(false));
  it('plays once a day', () => expect(revealDue({ ...go, day: { ...day, revealedAt: 1 } })).toBe(false));
  it('holds while yesterday’s log is finished after midnight', () => expect(revealDue({ ...go, calendarDay: '2026-11-06', day })).toBe(false));
  it('stays away with moments off', () => expect(revealDue({ ...go, momentsOn: false, day })).toBe(false));
});

describe('payoffs', () => {
  const grown = seen('2026-11-01', 'peacock', 'everyday', { grew: true, stageAfter: 3 });
  it('a grown creature gets a theme day on the next free day, once', () => {
    expect(grownOn([grown])).toEqual([{ id: 'peacock', date: '2026-11-01' }]);
    const busy = (d: string) => d === '2026-11-02';
    expect([...themeArrivals([grown], busy)]).toEqual([['2026-11-03', 'peacock']]);
    expect(creatureThemeOn({ date: '2026-11-03', sightings: [grown], hasOtherTheme: busy })).toBe('peacock');
    expect(creatureThemeOn({ date: '2026-11-04', sightings: [grown], hasOtherTheme: busy })).toBeUndefined();
  });
  it('a worn theme wins on its day', () => {
    expect(creatureThemeOn({ date: '2026-11-04', worn: 'nilgai', sightings: [], hasOtherTheme: () => true })).toBe('nilgai');
  });
  it('legends and completed guests earn ring styles', () => {
    expect(earnedRingStyles([seen('d', 'cheetah', 'medium', { stageAfter: 4 }), seen('d', 'lion', 'medium', { stageAfter: 3 }), seen('d', 'tanuki', 'rare', { stageAfter: 3 })])).toEqual(['cheetah', 'tanuki']);
  });
  it('a rare guest frames the record of the night before', () => {
    expect([...recordFrames([seen('2026-11-05', 'tanuki', 'rare')], new Set(['2026-11-04']))]).toEqual([['2026-11-04', 'tanuki']]);
    expect(recordFrames([seen('2026-11-05', 'peacock', 'everyday')], new Set(['2026-11-04'])).size).toBe(0);
  });
  it('finds the night’s first visitor, and who was met in a week', () => {
    const s = [seen('2026-11-05', 'a', 'everyday', { at: 2 }), seen('2026-11-05', 'b', 'everyday', { at: 1 }), seen('2026-11-06', 'a', 'everyday')];
    expect(firstVisitor(s, '2026-11-05')!.creatureId).toBe('b');
    expect(metBetween(s, '2026-11-05', '2026-11-06').sort()).toEqual(['a', 'b']);
  });
  it('a sick day’s company is a found slow creature, never an unfound one', () => {
    expect(companionFor([], CREATURES, '2026-11-05')).toBeUndefined();
    expect(companionFor([seen('d', 'gharial', 'everyday')], CREATURES, '2026-11-05')).toBe('gharial');
    expect(companionFor([seen('d', 'nilgai', 'everyday')], CREATURES, '2026-11-05')).toBeUndefined();
  });
  it('the steps hint prefers a creature from this region', () => {
    const s = [seen('d', 'gharial', 'everyday'), seen('d', 'nilgai', 'everyday')];
    expect(stepsCreature(s, CREATURES, 'plains', '2026-11-05')).toBe('nilgai');
    expect(stepsCreature([], CREATURES, 'plains', '2026-11-05')).toBeUndefined();
  });
  it('the dex holds only the found', () => {
    expect(dexRows([seen('d', 'nilgai', 'everyday')], CREATURES).map((r) => r.id)).toEqual(['nilgai']);
  });
});

describe('the roster', () => {
  it('holds at most twenty, in the three tiers', () => {
    expect(CREATURES.length).toBeLessThanOrEqual(20);
    for (const t of ['everyday', 'medium', 'rare'] as const) expect(CREATURES.some((c) => c.tier === t)).toBe(true);
    expect(new Set(CREATURES.map((c) => c.id)).size).toBe(CREATURES.length);
  });
  it('every creature has its notes, moves, and a drawing at every stage', () => {
    for (const c of CREATURES) {
      expect(c.notes.length, c.id).toBeGreaterThan(2);
      expect(c.notes.length, c.id).toBeLessThanOrEqual(6);
      expect(c.reaction, c.id).toBeTruthy();
      const top = c.tier === 'medium' ? 4 : 3;
      for (let s = 1; s <= top; s++) expect(figureFor(c, s).parts.length, `${c.id} ${s}`).toBeGreaterThan(0);
    }
  });
  it('an everyday creature only gains detail as it grows', () => {
    const lines = (c: string, s: number) => figureFor(creatureById(c)!, s).parts.flatMap((p) => p.l).length;
    for (const c of CREATURES.filter((x) => x.tier === 'everyday')) {
      expect(lines(c.id, 2), c.id).toBeGreaterThan(lines(c.id, 1));
      expect(lines(c.id, 3), c.id).toBeGreaterThan(lines(c.id, 2));
    }
  });
  it('legends and guests give a ring style, and grown creatures a theme', () => {
    for (const c of CREATURES) if (c.tier === 'everyday') expect(c.theme, c.id).toBeTruthy();
    else expect(c.ring, c.id).toBeTruthy();
  });
  it('nothing is religious-coded and there is no astrology', () => {
    const banned = /\b(god|goddess|deity|temple|shrine|holy|sacred|divine|vishnu|shiva|ganesh|krishna|hanuman|garuda|nandi|naga|buddha|jesus|allah|zodiac|horoscope|astrolog)/i;
    for (const c of CREATURES) expect(JSON.stringify([c.name, c.notes, c.theme, c.ring, c.forms?.map((f) => [f.name, f.note])]), c.id).not.toMatch(banned);
  });
  it('the generator stays stable: the same seed, the same run', () => {
    expect(seeded('a')()).toBe(seeded('a')());
    expect(seeded('a')()).not.toBe(seeded('b')());
  });
});
