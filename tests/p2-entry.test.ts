import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { whtrWaists } from '../src/domain/benchmark';
import { slotStatus } from '../src/domain/checklist';
import type { Measurement } from '../src/domain/types';
import { workbookSheets } from '../src/export/workbook';
import { checklistSlots } from '../src/state/derived';

describe('waist-to-height basis (#12)', () => {
  const m = (date: string, extra: Partial<Measurement>): Measurement => ({ id: date, date, at: 0, ...extra });
  it('uses the tucked series until a relaxed reading exists, then only relaxed', () => {
    expect(whtrWaists([m('2026-10-01', { waistStanding: 37.5 })]).map((w) => [w.waist, w.relaxed])).toEqual([[37.5, false]]);
    const both = [m('2026-10-01', { waistStanding: 37.5 }), m('2026-10-18', { waistStanding: 37.1, waistRelaxed: 38.3 })];
    expect(whtrWaists(both).map((w) => [w.date, w.waist])).toEqual([['2026-10-18', 38.3]]);
  });
});

describe('checklist (#22, #28)', () => {
  it('a late tick reads as recorded late', () => {
    expect(slotStatus({ ticks: { 'd:0': 5 }, ticksLate: { 'd:0': 9 } }, 'd:0')).toEqual({ kind: 'taken', at: 5, late: true });
    expect(slotStatus({ ticks: { 'd:0': 5 } }, 'd:0')).toEqual({ kind: 'taken', at: 5 });
  });

  it('a finished course leaves the checklist and checklist_total', () => {
    const settings = {
      ...defaultSettings(),
      setupDone: true,
      targets: [],
      checklist: [
        { id: 'tab', name: 'Tablet', slots: ['Morning', '9 pm'], active: true, med: { kind: 'medicine' as const, courses: [{ from: '2026-10-08', slots: [] }] } },
        { id: 'vit', name: 'Vitamin D', slots: ['Morning'], active: true },
      ],
    };
    expect(checklistSlots(settings, '2026-10-07').length).toBe(3);
    expect(checklistSlots(settings, '2026-10-09').map((s) => s.itemId)).toEqual(['vit']);
    const daily = workbookSheets({ settings, days: [{ date: '2026-10-07' }, { date: '2026-10-09' }], foods: [], entries: [], sessions: [], sets: [], measurements: [] }, new Date('2026-10-09T20:00:00')).find((s) => s.name === 'Daily')!;
    const col = daily.rows[0].indexOf('checklist_total');
    expect(daily.rows.find((r) => r[0] === '2026-10-07')![col]).toBe(3);
    expect(daily.rows.find((r) => r[0] === '2026-10-09')![col]).toBe(1);
  });
});
