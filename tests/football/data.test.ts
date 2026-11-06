import { describe, expect, it } from 'vitest';
import league from '../../src/football/data/league.json';
import { CLUBS, YOUTH_POOL, clubById } from '../../src/football/data/load';
import { AXES, TIERS } from '../../src/football/types';

describe('league data', () => {
  it('has 108 clubs, 18 a tier', () => {
    expect(CLUBS).toHaveLength(108);
    for (const t of TIERS) expect(CLUBS.filter((c) => c.tier === t)).toHaveLength(18);
  });
  it('has one own club, Brabo United in Division Six', () => {
    const own = CLUBS.filter((c) => c.kind === 'own');
    expect(own.map((c) => c.id)).toEqual(['bra']);
    expect(clubById('bra').tier).toBe(6);
  });
  it('has 40 real, 60 quirky and 7 Old Self slots', () => {
    expect(CLUBS.filter((c) => c.kind === 'real')).toHaveLength(40);
    expect(CLUBS.filter((c) => c.kind === 'quirky')).toHaveLength(60);
    expect(CLUBS.filter((c) => c.kind === 'old')).toHaveLength(7);
  });
  it('only uses the six axes in modifiers and effects', () => {
    for (const c of CLUBS) {
      for (const k of [...Object.keys(c.shrinks), ...Object.keys(c.presses)]) expect(AXES).toContain(k);
      for (const a of [...c.known, ...(c.hidden ? [c.hidden] : [])]) for (const m of a.fx?.mods ?? []) expect(AXES).toContain(m.axis);
    }
  });
  it('carries no old axis names and no water', () => {
    const s = JSON.stringify(league);
    for (const w of ['Water', 'Engine', 'Spark', 'Recovery']) expect(s).not.toContain(w);
  });
  it('keeps exercise youngsters out of the public file', () => {
    const s = JSON.stringify(league);
    expect(s).not.toMatch(/ kg\b/);
    expect(s).not.toMatch(/knee/i);
    expect(s).not.toContain('physio first');
    expect(league.youth.every((y) => y.kind === 'habit')).toBe(true);
  });
  it('writes no gendered pronouns for youngsters', () => {
    const s = JSON.stringify(league);
    expect(s).not.toMatch(/\b(he|his|him)\b/);
  });
  it('youth pool has the habit youngsters, plus private ones only when present', () => {
    expect(YOUTH_POOL.filter((y) => y.kind === 'habit').length).toBeGreaterThanOrEqual(20);
    for (const y of YOUTH_POOL) expect(AXES).toContain(y.axis);
  });
});
