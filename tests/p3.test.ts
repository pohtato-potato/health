import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { usualWater } from '../src/domain/water';
import { workbookSheets } from '../src/export/workbook';

describe('water and steps (#29, #30)', () => {
  it('a usual day of water is the recent median, to 250 ml', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((date, i) => ({ date, waterMl: [3500, 4000, 3600, 0][i] }));
    expect(usualWater(days, '2026-10-08')).toBe(3500);
    expect(usualWater(days.slice(0, 2), '2026-10-08')).toBeUndefined();
  });

  it('estimated steps are marked in the export and left out of step averages', () => {
    const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 12000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
    const settings = { ...defaultSettings(), setupDone: true, targets: [{ from: '2026-09-01', targets: T }] };
    const days = [{ date: '2026-10-05', steps: 12000, stepsEstimated: true }, { date: '2026-10-06', steps: 8000 }];
    const sheets = workbookSheets({ settings, days, foods: [], entries: [], sessions: [], sets: [], measurements: [] }, new Date('2026-10-06T20:00:00'));
    const daily = sheets.find((s) => s.name === 'Daily')!;
    expect(daily.rows.find((r) => r[0] === '2026-10-05')![daily.rows[0].indexOf('steps_estimated')]).toBe(true);
    const weekly = sheets.find((s) => s.name === 'Weekly')!;
    expect(weekly.rows.find((r) => r[0] === '2026-10-05')![3]).toBe(8000);
    expect(sheets.find((s) => s.name === 'Summary')!.rows.find((r) => r[0] === 'steps, 7-day average')![1]).toBe(8000);
  });
});
