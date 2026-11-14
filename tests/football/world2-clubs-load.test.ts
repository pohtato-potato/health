// LG-4 (ledger O38): the real clubs fed into the club registry and the seed. World 1 reads league.json untouched.
import { afterEach, describe, expect, it } from 'vitest';
import { clubById, clubWorld, isRetired, LANDLORDS_2, rememberClubs, RETIRED, RIVAL_2, setClubWorld } from '../../src/football/data/load';
import { WORLD_CLUBS } from '../../src/football/data/world';
import { realSeeds, seedWorld2 } from '../../src/football/pyramid/world';
import { DIVISION_SIZE, POOL, PYRAMID } from '../../src/football/pyramid/shape';

afterEach(() => setClubWorld(1));

describe('the club registry in each world', () => {
  it('world 1 reads league.json exactly as before', () => {
    setClubWorld(1);
    expect(clubById('ars').rating).toBe(89);
    expect(clubById('bet').short).toBe('BET');
    expect(clubById('ant').name).toBe('Antigoon FC');
    expect(clubById('bra').ground).toContain('Zurenborg');
  });
  it('world 2 reads world.json for real clubs, with their abilities and ratings', () => {
    setClubWorld(2);
    const w = WORLD_CLUBS.find((c) => c.id === 'ars')!;
    expect(clubById('ars').rating).toBe(w.rating);
    expect(clubById('ars').known).toEqual(w.known);
    expect(clubById('bet').short).toBe('RBB');
    expect(clubById(RIVAL_2).name).toBe('Royal Antwerp');
    expect(clubById(LANDLORDS_2).name).toBe('Berchem Sport');
    expect(clubById('bra').ground).toBe('Het Rooi (tenants of Berchem Sport)');
  });
  it('retired clubs stay readable in world 2 for old records', () => {
    setClubWorld(2);
    expect(isRetired('ant')).toBe(true);
    expect(isRetired('zur')).toBe(true);
    expect(isRetired('ars')).toBe(false);
    expect(isRetired('os1')).toBe(false);
    expect(clubById('ant').name).toBe('Antigoon FC');
    expect(RETIRED.find((c) => c.id === 'zur')!.colours.length).toBeGreaterThan(0);
  });
  it('the stored clubs pick the world: the pool or a division below six means world 2', () => {
    rememberClubs([{ id: 'ars', tier: 1 }, { id: 'bra', tier: 6 }]);
    expect(clubWorld()).toBe(1);
    rememberClubs([{ id: 'ars', tier: 1 }, { id: 'whu', tier: 9, pool: true }]);
    expect(clubWorld()).toBe(2);
    rememberClubs([{ id: 'ars', tier: 1 }]);
    expect(clubWorld()).toBe(1);
  });
});

describe('seeding from the real clubs', () => {
  const seeds = realSeeds(WORLD_CLUBS);
  it('leaves Berchem Sport out: it never joins the pool', () => {
    expect(seeds.some((s) => s.id === LANDLORDS_2)).toBe(false);
    expect(seeds).toHaveLength(WORLD_CLUBS.length - 1);
  });
  it('with Brabo in Division Three and one Old Self in Eight, every division holds the draft clubs', () => {
    const old = { id: 'os1', tier: 8 as const, name: 'AFC October 2026', nickname: 'The Walkers', rating: 64, month: '2026-10', standIn: false };
    const out = seedWorld2(seeds, { id: 'bra', style: 'grit', rating: 34 }, 3, [old]);
    for (const p of PYRAMID) expect(out.filter((c) => c.tier === p.no && !c.pool && !c.folded)).toHaveLength(DIVISION_SIZE);
    for (const w of WORLD_CLUBS.filter((c) => c.place === 'pyramid')) expect(out.find((c) => c.id === w.id)!.tier).toBe(w.division);
    expect(out.filter((c) => c.pool && c.tier === POOL)).toHaveLength(WORLD_CLUBS.filter((c) => c.place === 'pool').length);
  });
});
