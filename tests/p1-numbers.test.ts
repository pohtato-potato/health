import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { addDays } from '../src/domain/dates';
import { foodDaysFor } from '../src/domain/logged';
import { maintenanceModel } from '../src/domain/maintenance';
import type { Day, FoodEntry } from '../src/domain/types';
import { workbookSheets, type ExportData } from '../src/export/workbook';
import { EQ, PLAN, sets } from './fixtures';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
const entry = (date: string, kcal: number, id = `${date}-${kcal}`): FoodEntry => ({ id, date, meal: 'lunch', at: Date.parse(`${date}T13:00:00`), kind: 'food', name: 'x', portion: '1', kcal, protein: 10 });
const base = (over: Partial<ExportData> = {}): ExportData => ({
  settings: { ...defaultSettings(), setupDone: true, plan: PLAN, equipment: EQ, heightCm: 181, targets: [{ from: '2026-09-01', targets: T }] },
  days: [],
  foods: [],
  entries: [],
  sessions: [],
  sets: [],
  measurements: [],
  ...over,
});
const sheet = (d: ExportData, name: string) => workbookSheets(d, new Date('2026-10-11T12:00:00')).find((s) => s.name === name)!;

describe('workbook numbers', () => {
  it('Summary waist is the latest by date, whatever order the rows are in (#6)', () => {
    const d = base({ measurements: [{ id: 'z', date: '2026-10-08', at: 3, waistStanding: 37.1 }, { id: 'a', date: '2026-09-27', at: 9, waistStanding: 37.5 }] });
    const row = sheet(d, 'Summary').rows.find((r) => r[0] === 'waist standing, in')!;
    expect(row.slice(1, 3)).toEqual([37.1, '2026-10-08']);
  });

  it('Weekly and the 7-day kcal average count complete days when marked, and say so (#7)', () => {
    const days: Day[] = [{ date: '2026-10-05', foodDone: true }, { date: '2026-10-06', foodDone: true }];
    const entries = [entry('2026-10-05', 2000), entry('2026-10-06', 2200), entry('2026-10-07', 360), entry('2026-10-08', 845)];
    const weekly = sheet(base({ days, entries }), 'Weekly');
    const w = weekly.rows.find((r) => r[0] === '2026-10-05')!;
    expect(w[weekly.rows[0].indexOf('avg_kcal')]).toBe(2100);
    expect(w[weekly.rows[0].indexOf('food_basis')]).toBe('complete, 2 days');
    const kcal = sheet(base({ days, entries }), 'Summary').rows.find((r) => r[0] === 'kcal, 7-day average')!;
    expect(kcal[1]).toBe(2100);
    expect(kcal[2]).toContain('complete, 2 days');
  });

  it('Records group by exercise id, rank by estimated 1RM, show the best per load and old names (#9, #10)', () => {
    const s1 = { id: 's1', date: '2026-10-01', session: 'A', planName: 't', startedAt: 1, status: 'done' as const, short: false, exercises: [] };
    const s2 = { ...s1, id: 's2', date: '2026-10-08', startedAt: 2 };
    const xs = [...sets('curl', 'Old curl', 's1', '2026-10-01', 5, [24]), ...sets('curl', 'Curl', 's2', '2026-10-08', 10, [7]), ...sets('band', 'Band pull', 's2', '2026-10-08', null, [1, 1])];
    const rec = sheet(base({ sessions: [s1, s2], sets: xs }), 'Records');
    const h = rec.rows[0];
    expect(rec.rows.length).toBe(2); // the band's "x1" placeholders don't make a record
    const row = rec.rows[1];
    expect(row[0]).toBe('Curl');
    expect(row[h.indexOf('exercise_id')]).toBe('curl');
    expect(row[h.indexOf('best_load_kg')]).toBe(10);
    expect(row[h.indexOf('best_per_load')]).toBe('10 kg × 7; 5 kg × 24');
    expect(row[h.indexOf('other_names')]).toBe('Old curl');
  });
});

describe('maintenance basis (#8)', () => {
  it('a couple of complete days fall back to logged days instead of freezing the model', () => {
    const range = Array.from({ length: 20 }, (_, i) => addDays('2026-10-01', i));
    const days = new Map(range.map((d, i) => [d, { foodDone: i < 2 }]));
    const entries = range.slice(0, 17).map((d) => ({ date: d }));
    expect(foodDaysFor(range, days, entries, 10)).toEqual({ counted: range.slice(0, 17), basis: 'logged' });
    expect(foodDaysFor(range, days, entries).basis).toBe('complete');
  });

  it('the model updates with 17 logged days and 2 complete ones', () => {
    const today = '2026-10-29';
    const range = Array.from({ length: 28 }, (_, i) => addDays(today, -28 + i));
    const days: Day[] = range.map((d, i) => ({ date: d, weightKg: 85 - i * 0.05, foodDone: i < 2 }));
    const entries = range.slice(0, 17).map((d) => entry(d, 2100));
    const m = maintenanceModel({ days, entries, today, heightCm: 181 });
    expect(m.status).toBe('updating');
    expect(m.logged).toBe(17);
    expect(m.method).toContain('logged days');
  });
});
