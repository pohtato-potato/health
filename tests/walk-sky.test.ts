import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import { fullMoonAt, isFullMoon, meteorShower, moonPhase, skyLine } from '../src/walk/sky';

const FULL_2024 = ['2024-01-25', '2024-02-24', '2024-03-25', '2024-04-23', '2024-05-23', '2024-06-22', '2024-07-21', '2024-08-19', '2024-09-18', '2024-10-17', '2024-11-15', '2024-12-15'];

describe('the sky over the walk', () => {
  it('knows every full moon of 2024', () => {
    for (const d of FULL_2024) expect(isFullMoon(d), d).toBe(true);
  });
  it('puts the full moon within minutes of the almanac', () => {
    // 25 January 2024, 17:54 UTC; 15 December 2024, 09:02 UTC.
    expect(Math.abs(fullMoonAt(297.5).getTime() - Date.UTC(2024, 0, 25, 17, 54)) / 60_000).toBeLessThan(10);
    expect(Math.abs(fullMoonAt(308.5).getTime() - Date.UTC(2024, 11, 15, 9, 2)) / 60_000).toBeLessThan(10);
  });
  it('and not the nights a week either side', () => {
    for (const d of FULL_2024) {
      expect(isFullMoon(addDays(d, 7)), addDays(d, 7)).toBe(false);
      expect(isFullMoon(addDays(d, -7)), addDays(d, -7)).toBe(false);
    }
  });
  it('gives the phase from new (0) through full (0.5)', () => {
    expect(moonPhase(new Date(Date.UTC(2024, 0, 11, 11, 57)))).toBeLessThan(0.05); // new moon, 11 Jan 2024
    expect(Math.abs(moonPhase(new Date(Date.UTC(2024, 0, 25, 17, 54))) - 0.5)).toBeLessThan(0.05);
  });
  it('knows the great meteor showers’ nights', () => {
    expect(meteorShower('2026-12-13')).toBe('geminids');
    expect(meteorShower('2026-12-14')).toBe('geminids');
    expect(meteorShower('2026-08-12')).toBe('perseids');
    expect(meteorShower('2027-01-03')).toBe('quadrantids');
    expect(meteorShower('2026-04-22')).toBe('lyrids');
    expect(meteorShower('2026-03-01')).toBeUndefined();
  });
  it('says so on the Walk tab, a shower before the moon', () => {
    expect(skyLine('2024-12-13')).toBe('The Geminids peak tonight.');
    expect(skyLine('2024-01-25')).toBe('Full moon tonight.');
    expect(skyLine('2024-03-01')).toBeUndefined();
  });
});
