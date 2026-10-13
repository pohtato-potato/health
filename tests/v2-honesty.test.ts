import { describe, expect, it } from 'vitest';
import { recordLine, resolveAll, trackRecord } from '../src/domain/forecastStore';
import { whatIf } from '../src/domain/whatIf';
import type { ForecastRecord } from '../src/domain/types';

const rec = (id: string, targetDate: string, low: number, high: number, extra: Partial<ForecastRecord> = {}): ForecastRecord => ({ id, kind: 'weight', madeAt: 0, targetDate, low, high, ...extra });

describe('forecast honesty', () => {
  it('resolved forecast counted once', () => {
    const actual = (_k: string, d: string) => (d === '2026-10-01' ? 79.5 : d === '2026-10-08' ? 81 : undefined);
    const once = resolveAll([rec('a', '2026-10-01', 79, 80), rec('b', '2026-10-08', 79, 80), rec('c', '2026-12-01', 75, 76)], '2026-10-12', actual);
    expect(once.filter((r) => r.outcome !== undefined)).toHaveLength(2);
    const twice = resolveAll(once, '2026-10-12', () => 79.5);
    expect(twice.find((r) => r.id === 'b')!.outcome).toBe(81);
    expect(trackRecord(twice, 'weight')).toEqual({ hits: 1, total: 2 });
    expect(recordLine(trackRecord(twice, 'weight'))).toBe('1 of 2 similar forecasts came true');
  });

  it('no history → no record line', () => {
    expect(trackRecord([], 'weight')).toEqual({ hits: 0, total: 0 });
    expect(recordLine({ hits: 0, total: 0 })).toBeUndefined();
  });
});

describe('what if', () => {
  const base = { kmSoFar: 400, kmToGo: 2470, stepsPerDay: 10000, strideM: 0.74, whtr: 0.53, whtrPerDay: -0.0002, goal: 0.5 };

  it('no change gives the baseline; more steps arrive sooner', () => {
    const now = whatIf(base, {});
    const more = whatIf(base, { stepsPerDay: 2000 });
    expect(now.walkDays).toBe(Math.ceil(2470 / 7.4));
    expect(more.walkDays).toBeLessThan(now.walkDays);
    expect(more.revealDays!).toBeLessThan(now.revealDays!);
  });

  it('no reveal date when the waist is not falling', () => {
    expect(whatIf({ ...base, whtrPerDay: 0 }, {}).revealDays).toBeUndefined();
  });
});
