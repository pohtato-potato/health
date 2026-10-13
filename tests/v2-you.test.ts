import { describe, expect, it } from 'vitest';
import { checkInDue } from '../src/domain/checkinSchedule';
import { experimentResult } from '../src/domain/experiments';
import { heatmapLevel } from '../src/domain/heatmap';
import { weekReview } from '../src/domain/weekReview';
import type { Settings } from '../src/domain/types';

describe('heatmap', () => {
  it('levels against the target, not logged is null', () => {
    expect(heatmapLevel('steps', undefined, 10000)).toBeNull();
    expect(heatmapLevel('steps', 3000, 10000)).toBe(1);
    expect(heatmapLevel('steps', 7000, 10000)).toBe(2);
    expect(heatmapLevel('steps', 9000, 10000)).toBe(3);
    expect(heatmapLevel('steps', 12000, 10000)).toBe(4);
    expect(heatmapLevel('readiness', 82)).toBe(4);
    expect(heatmapLevel('form', 3)).toBe(2);
  });
});

describe('experiments', () => {
  it('experiment needs ≥10 days each side', () => {
    const ten = Array.from({ length: 10 }, (_, i) => 400 + i);
    expect(experimentResult(ten.slice(0, 9), ten)).toBeUndefined();
    expect(experimentResult(ten, ten.slice(0, 9))).toBeUndefined();
    const r = experimentResult(ten, ten.map((v) => v + 40))!;
    expect(r.change).toBe(40);
    expect(r.verdict).toBe('up');
    expect(experimentResult(ten, ten)!.verdict).toBe('same');
  });
});

describe('check-in schedule', () => {
  it('due from the fixed day each month until one is done', () => {
    expect(checkInDue('2026-10-01', 1, undefined)).toBe(true);
    expect(checkInDue('2026-10-12', 1, '2026-10-03')).toBe(false);
    expect(checkInDue('2026-11-02', 1, '2026-10-03')).toBe(true);
    expect(checkInDue('2026-10-12', 15, '2026-09-20')).toBe(false);
  });
});

describe('weekly review', () => {
  it('review handles a week with no food', () => {
    const settings = { targets: [{ from: '2026-01-01', targets: { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 0, sleepMin: 420, sessionsPerWeek: 4 } }], checklist: [], prefs: {}, places: [] } as unknown as Settings;
    const days = [{ date: '2026-10-05', steps: 9000 }, { date: '2026-10-10', steps: 15000 }];
    const r = weekReview(settings, '2026-10-05', days, [], [], [], 3);
    expect(r.title).toMatch(/^Week 3/);
    const food = r.cards.find((c) => c.id === 'food')!;
    expect(food.big).toBe('Not logged');
    for (const c of r.cards) for (const l of c.lines) expect(l).not.toMatch(/NaN|undefined/);
    expect(r.cards.find((c) => c.id === 'weekend')!.lines.join(' ')).toMatch(/weekend/i);
  });
});
