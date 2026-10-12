import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { workbookSheets, type ExportData } from '../src/export/workbook';
import { buildXlsx, colName, crc32 } from '../src/export/xlsx';
import { defaultSettings } from '../src/db/actions';
import { EQ, PLAN, sets } from './fixtures';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };

function sample(): ExportData {
  const settings = { ...defaultSettings(), setupDone: true, name: 'Test', heightCm: 180, plan: PLAN, equipment: EQ, targets: [{ from: '2026-09-01', targets: T }] };
  return {
    settings,
    days: [
      { date: '2026-09-27', weightKg: 80.4, steps: 12500, stepsFinal: true, waterMl: 3000, sleep: { asleep: 40, woke: 470, rested: 4 } },
      { date: '2026-09-28', weightKg: 80.2, steps: 5000 },
    ],
    foods: [{ id: 'c', name: 'Chicken & rice <test>', unit: 'g', per: 100, kcal: 165, protein: 31, defaultAmount: 125, createdAt: 0 }],
    entries: [
      { id: 'e1', date: '2026-09-27', meal: 'lunch', at: Date.parse('2026-09-27T13:00:00'), kind: 'food', foodId: 'c', name: 'Chicken & rice <test>', portion: '125 g', kcal: 2100, protein: 160 },
    ],
    sessions: [{ id: 's1', date: '2026-09-27', session: 'A', planName: 'Test', startedAt: Date.parse('2026-09-27T18:00:00'), endedAt: Date.parse('2026-09-27T19:00:00'), status: 'done', short: false, exercises: ['row'] }],
    sets: sets('row', 'Row', 's1', '2026-09-27', 10, [12, 12, 12], { sides: ['L', 'R'] }),
    measurements: [{ id: 'm1', date: '2026-09-27', at: 1, waistStanding: 36, waistSlouched: 38, shoulders: 45 }],
  };
}

describe('xlsx export', () => {
  it('names columns like a spreadsheet', () => {
    expect([colName(0), colName(25), colName(26), colName(27)]).toEqual(['A', 'Z', 'AA', 'AB']);
  });
  it('computes the zip checksum', () => {
    expect(crc32(new TextEncoder().encode('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });
  it('builds every sheet with the plan’s set schema', () => {
    const sheets = workbookSheets(sample(), new Date('2026-09-28T12:00:00'));
    expect(sheets.map((s) => s.name)).toEqual(['README', 'Summary', 'Daily', 'Food log', 'My foods', 'Sets', 'Sessions', 'Weekly', 'Measurements', 'Records', 'Targets history', 'Plan']);
    const setsSheet = sheets.find((s) => s.name === 'Sets')!;
    expect(setsSheet.rows[0].slice(0, 9)).toEqual(['date', 'session', 'exercise', 'set', 'side', 'load_kg', 'reps', 'seconds', 'notes']);
    expect(setsSheet.rows[1].slice(0, 7)).toEqual(['2026-09-27', 'A', 'Row', 1, 'L', 10, 12]);
    const daily = sheets.find((s) => s.name === 'Daily')!;
    const d27 = daily.rows.find((r) => r[0] === '2026-09-27')!;
    expect(d27[17]).toBe(true); // perfect day: 2,100 kcal, 160 g, 12,500 steps
    const m = sheets.find((s) => s.name === 'Measurements')!;
    expect(m.rows[1][4]).toBe(1.25);
  });
  it('adds a Checklist sheet with one column per slot: time, missed or not logged', () => {
    const d = sample();
    d.settings = { ...d.settings, checklist: [{ id: 'vit', name: 'Vitamin', slots: ['Morning', '9 pm'], active: true }] };
    d.days = [{ ...d.days[0], ticks: { 'vit:0': new Date(2026, 8, 27, 8, 5).getTime() }, missed: { 'vit:1': true } }, d.days[1]];
    const sheet = workbookSheets(d, new Date('2026-09-28T12:00:00')).find((s) => s.name === 'Checklist')!;
    expect(sheet.rows[0]).toEqual(['date', 'Vitamin (Morning)', 'Vitamin (9 pm)']);
    expect(sheet.rows[1]).toEqual(['2026-09-27', '08:05', 'missed']);
    expect(sheet.rows[2]).toEqual(['2026-09-28', 'not logged', 'not logged']);
  });
  it('writes a valid zip container', () => {
    const bytes = buildXlsx(workbookSheets(sample(), new Date('2026-09-28T12:00:00')));
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('Chicken &amp; rice &lt;test&gt;');
    if (process.env.XLSX_OUT) writeFileSync(process.env.XLSX_OUT, bytes);
  });
});
