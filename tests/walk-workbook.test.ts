import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { workbookSheets } from '../src/export/workbook';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
const settings = { ...defaultSettings(), setupDone: true, targets: [{ from: '2026-09-01', targets: T }] };
const days = [
  { date: '2026-10-05', steps: 10000 },
  { date: '2026-10-06', steps: 10000 },
];
const base = { settings, days, foods: [], entries: [], sessions: [], sets: [], measurements: [] };

describe('routes in the workbook', () => {
  it('lists every route joined, with km walked and where it stands', () => {
    const sheets = workbookSheets({ ...base, routes: [{ id: 'dandi', spans: [{ from: '2026-10-06' }] }] }, new Date('2026-10-06T20:00:00'));
    const routes = sheets.find((s) => s.name === 'Routes')!;
    expect(routes.rows[0]).toEqual(['route', 'name', 'km_walked', 'of_km', 'state', 'joined', 'finished']);
    expect(routes.rows[1]).toEqual(['dandi', 'The Dandi March', 7.4, 387, 'walking', '2026-10-06', null]);
  });

  it('has no Routes sheet when none were joined', () => {
    expect(workbookSheets(base, new Date('2026-10-06T20:00:00')).some((s) => s.name === 'Routes')).toBe(false);
  });
});
