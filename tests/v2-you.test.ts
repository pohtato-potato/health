import { describe, expect, it } from 'vitest';
import { checkInDue } from '../src/domain/checkinSchedule';
import { experimentResult } from '../src/domain/experiments';
import { heatmapLevel } from '../src/domain/heatmap';

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
