import { describe, expect, it } from 'vitest';
import { distanceInTerms, ghostLastMonth, journal, loadedSteps, trailSegments } from '../src/walk/journal';
import { terrainAt } from '../src/walk/regions';
import { kmFromSteps } from '../src/domain/walk';
import { dayRange } from '../src/domain/dates';
import type { Day, SetEntry } from '../src/domain/types';

describe('walk journal and trail', () => {
  it('day 1 has a journal line and no ghost', () => {
    const days = [{ date: '2026-10-13', steps: 12000 }] as Day[];
    const j = journal(days, [], '2026-10-13');
    expect(j).toHaveLength(1);
    expect(j[0].head).toMatch(/^Day 1 · 12,000 steps · /);
    expect(ghostLastMonth(days, '2026-10-13')).toBeUndefined();
  });

  it('a crossing is named, and a session day says so', () => {
    const days = dayRange('2026-09-01', '2026-10-01').map((date) => ({ date, steps: 12000 }) as Day);
    const j = journal(days, [{ date: '2026-09-20', status: 'done', session: 'B' } as never], '2026-10-01');
    expect(j.some((l) => /crossed into Rajasthan|crossed into Madhya Pradesh/.test(l.head))).toBe(true);
    expect(j.find((l) => l.date === '2026-09-20')!.head).toMatch(/Session B/);
    expect(ghostLastMonth(days, '2026-10-01')).toBeCloseTo(kmFromSteps(12000), 1);
  });

  it('segments sum to total km', () => {
    const days = [{ date: '2026-10-01', steps: 10000 }, { date: '2026-10-02' }, { date: '2026-10-03', steps: 6000 }] as Day[];
    const segs = trailSegments(days, new Map(), 10000);
    expect(segs.reduce((n, s) => n + (s.to - s.from), 0)).toBeCloseTo(kmFromSteps(16000), 6);
    expect(segs[0].from).toBe(0);
    expect(segs[1].from).toBeCloseTo(segs[0].to, 6);
  });

  it('loaded steps from carry sets', () => {
    const sets = [
      { date: '2026-10-01', steps: 70, exerciseId: 'farmer-carry' },
      { date: '2026-10-01', steps: 80, exerciseId: 'farmer-carry' },
      { date: '2026-10-02', reps: 12, exerciseId: 'row' },
      { date: '2026-10-02', steps: 60, exerciseId: 'farmer-carry', skipped: true },
    ] as SetEntry[];
    const l = loadedSteps(sets);
    expect(l.get('2026-10-01')).toBe(150);
    expect(l.has('2026-10-02')).toBe(false);
    const segs = trailSegments([{ date: '2026-10-01', steps: 10000 } as Day], l, 10000);
    expect(segs[0].loaded).toBeCloseTo(kmFromSteps(150), 6);
  });

  it('distance in your terms', () => {
    expect(distanceInTerms(2900)).toBe('You’ve walked Delhi to Mumbai, twice.');
    expect(distanceInTerms(240)).toBe('You’ve walked Delhi to Agra.');
    expect(distanceInTerms(50)).toBeUndefined();
  });

  it('terrain knows the land', () => {
    expect(terrainAt(10).kind).toBe('plains');
    expect(terrainAt(330).kind).toBe('ravines');
    expect(terrainAt(1300).kind).toBe('plateau');
  });
});
