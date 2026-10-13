import { describe, expect, it } from 'vitest';
import { benchmarkProgress, weeklyCheckIn, whtr } from '../src/domain/benchmark';
import { autoMarkers } from '../src/domain/markers';
import type { Day, Measurement, Settings, Targets } from '../src/domain/types';

const T: Targets = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 0, sleepMin: 420, sessionsPerWeek: 4 };

describe('benchmark and check-in', () => {
  it('whtr', () => {
    expect(whtr(35, 178)).toBeCloseTo(0.4994, 3);
    expect(whtr(38, 180)).toBeCloseTo(0.536, 3);
  });

  it('benchmark aims at 0.5, then 0.45, with a projected date from the trend', () => {
    const ms = [
      { id: 'a', date: '2026-09-01', at: 1, waistStanding: 38 },
      { id: 'b', date: '2026-09-15', at: 2, waistStanding: 37.5 },
      { id: 'c', date: '2026-09-29', at: 3, waistStanding: 37 },
    ] as Measurement[];
    const b = benchmarkProgress(ms, 178, '2026-10-01')!;
    expect(b.goal).toBe(0.5);
    expect(b.current).toBeCloseTo(0.528, 2);
    expect(b.projected! > '2026-10-01').toBe(true);
    const there = benchmarkProgress([{ id: 'x', date: '2026-09-01', at: 1, waistStanding: 34 } as Measurement], 178, '2026-10-01')!;
    expect(there.goal).toBe(0.45);
    expect(there.projected).toBeUndefined();
    expect(benchmarkProgress([], 178, '2026-10-01')).toBeUndefined();
  });

  it('check-in offers, never applies', () => {
    const offer = weeklyCheckIn({ kcal: 2640, band: 120, status: 'updating' }, T, 2500)!;
    expect(offer.text).toBe('Maintenance moved to 2,640 (±120). Keep your targets, or adjust?');
    expect(offer.proposal).toEqual({ kcalMin: 2140, kcalMax: 2440 });
    expect(T.kcalMin).toBe(2000);
    expect(weeklyCheckIn({ kcal: 2520, band: 120, status: 'updating' }, T, 2500)).toBeUndefined();
    expect(weeklyCheckIn({ kcal: 2640, band: 120, status: 'holding' }, T, 2500)).toBeUndefined();
    const lower = weeklyCheckIn({ kcal: 2380, band: 120, status: 'updating' }, T, 2500)!;
    expect(lower.proposal).toBeUndefined();
  });
});

describe('markers', () => {
  it('auto markers for status changes and supplement start', () => {
    const days = [
      { date: '2026-10-01', ticks: { 'creatine:0': 1 } },
      { date: '2026-10-02', ticks: { 'creatine:0': 1 } },
      { date: '2026-10-05', status: 'sick' },
      { date: '2026-10-06', status: 'sick' },
      { date: '2026-10-07' },
      { date: '2026-10-09', nightOut: true },
    ] as Day[];
    const settings = { checklist: [{ id: 'creatine', name: 'Creatine', slots: ['Morning'], active: true }] } as unknown as Settings;
    const m = autoMarkers(days, settings);
    expect(m.map((x) => [x.date, x.text])).toEqual([
      ['2026-10-01', 'Started creatine'],
      ['2026-10-05', 'Status: ill'],
      ['2026-10-09', 'Night out'],
    ]);
    expect(m.every((x) => x.auto)).toBe(true);
  });
});
