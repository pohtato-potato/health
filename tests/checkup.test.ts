import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { applyFix } from '../src/db/checkup';
import { db } from '../src/db/db';
import { undoEdit } from '../src/db/edits';
import { dataCheckup, type CheckupInput } from '../src/domain/checkup';
import { addDays } from '../src/domain/dates';
import type { Day, FoodEntry, TrainingSession } from '../src/domain/types';

const TODAY = '2026-11-05';
const input = (o: Partial<CheckupInput> = {}): CheckupInput => ({ today: TODAY, settings: defaultSettings(), days: [], entries: [], sessions: [], ...o });
const entry = (id: string, at: number) => ({ id, date: TODAY, name: 'Eggs', kind: 'quick', kcal: 100, protein: 10, at }) as unknown as FoodEntry;
const days = (n: number, steps: number): Day[] => Array.from({ length: n }, (_, i) => ({ date: addDays(TODAY, -i - 1), steps }));
const session = (date: string, status: 'active' | 'done') => ({ id: date, date, status, startedAt: 0, short: false, exercises: [] }) as unknown as TrainingSession;
const kinds = (i: CheckupInput) => dataCheckup(i).map((f) => f.kind);

describe('dataCheckup', () => {
  it('finds nothing in an empty install', () => expect(dataCheckup(input())).toEqual([]));
  it('finds nothing in clean data', () => {
    expect(dataCheckup(input({ days: days(20, 9000), entries: [entry('a', 1)], sessions: [session('2026-11-01', 'done')] }))).toEqual([]);
  });
  it('an empty day', () => expect(kinds(input({ days: [{ date: '2026-11-01' }] }))).toEqual(['empty-day']));
  it('a double entry within minutes, naming the second', () => {
    const f = dataCheckup(input({ entries: [entry('a', 0), entry('b', 60_000)] }));
    expect(f.map((x) => x.kind)).toEqual(['double-entry']);
    expect(f[0].fix.rowId).toBe('b');
  });
  it('the same food hours apart is not a double', () => {
    expect(dataCheckup(input({ entries: [entry('a', 0), entry('b', 3 * 3_600_000)] }))).toEqual([]);
  });
  it('a weight far off its neighbours', () => {
    const w: Day[] = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-24', '2026-10-25'].map((date) => ({ date, weightKg: 70 }));
    const f = dataCheckup(input({ days: [...w, { date: '2026-10-23', weightKg: 77 }] }));
    expect(f.map((x) => x.kind)).toEqual(['weight-off']);
    expect(f[0].date).toBe('2026-10-23');
  });
  it('a session left unfinished on an earlier day, but not today', () => {
    expect(kinds(input({ sessions: [session('2026-11-01', 'active')] }))).toEqual(['unfinished-session']);
    expect(kinds(input({ sessions: [session(TODAY, 'active')] }))).toEqual([]);
  });
  it('steps far above usual', () => {
    expect(kinds(input({ days: [...days(10, 5000), { date: TODAY, steps: 60000 }] }))).toEqual(['steps-high']);
  });
  it('a dose ticked twice within minutes', () => {
    const f = dataCheckup(input({ days: [{ date: '2026-11-01', ticks: { 'med:0': 1000, 'med:1': 1000 + 60_000 } }], settings: { ...defaultSettings(), checklist: [{ id: 'med', name: 'Pill', med: true, active: true } as never] } }));
    expect(f.map((x) => x.kind)).toEqual(['double-dose']);
  });
  it('every finding says what it is and offers a fix', () => {
    const all = dataCheckup(input({
      days: [{ date: '2026-10-01' }, ...days(10, 5000), { date: TODAY, steps: 60000 }, { date: '2026-11-01', steps: 5000, ticks: { 'm:0': 1, 'm:1': 2 } }],
      entries: [entry('a', 0), entry('b', 1)],
      sessions: [session('2026-10-02', 'active')],
      settings: { ...defaultSettings(), checklist: [{ id: 'm', name: 'Pill', med: true, active: true } as never] },
    }));
    expect(all.length).toBeGreaterThanOrEqual(5);
    for (const f of all) {
      expect(f.text.length).toBeGreaterThan(5);
      expect(f.fix.label.length).toBeGreaterThan(2);
    }
  });
  it('a finding you said is right stays quiet', () => {
    const i = input({ days: [{ date: '2026-11-01' }] });
    const id = dataCheckup(i)[0].id;
    expect(dataCheckup({ ...i, settings: { ...i.settings, checkupOk: [id] } })).toEqual([]);
  });
});

describe('applyFix', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });
  it('deletes the second entry, and undo brings it back', async () => {
    await db.entries.bulkPut([entry('a', 0), entry('b', 60_000)]);
    const f = dataCheckup(input({ entries: await db.entries.toArray() }))[0];
    const edit = await applyFix(f);
    expect(await db.entries.get('b')).toBeUndefined();
    await undoEdit(edit!);
    expect(await db.entries.get('b')).toBeDefined();
  });
  it('clears a field without touching the rest of the day, and undo restores it', async () => {
    const list: Day[] = [...days(10, 5000), { date: TODAY, steps: 60000, note: 'keep' }];
    await db.days.bulkPut(list);
    const f = dataCheckup(input({ days: list }))[0];
    const edit = await applyFix(f);
    const d = await db.days.get(TODAY);
    expect(d?.steps).toBeUndefined();
    expect(d?.note).toBe('keep');
    await undoEdit(edit!);
    expect((await db.days.get(TODAY))?.steps).toBe(60000);
  });
  it('finishes a session left open', async () => {
    const s = session('2026-11-01', 'active');
    await db.sessions.put(s);
    await applyFix(dataCheckup(input({ sessions: [s] }))[0]);
    expect((await db.sessions.get(s.id))?.status).toBe('done');
  });
});
