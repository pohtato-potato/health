import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addEntry, deleteEntry, deleteSet, logSet, updateEntry } from '../src/db/actions';
import { HealthDB, setDatabase, db } from '../src/db/db';
import { undoEdit } from '../src/db/edits';
import { logUsage, pruneUsage } from '../src/db/usage';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`v2u-${++n}`));
  await db.open();
});

const entry = { date: '2026-10-11', meal: 'dinner' as const, at: 1, kind: 'food' as const, name: 'Dal', portion: '1 katori', kcal: 180, protein: 7 };
const set = { sessionId: 'x', date: '2026-10-11', session: 'A', exerciseId: 'row', exercise: 'Row', setNo: 1, side: 'L' as const, loadKg: 10, reps: 12, at: 2 };

describe('usage log and edit history', () => {
  it('updateEntry records before and after, and undoEdit restores it', async () => {
    const e = await addEntry(entry);
    await updateEntry(e.id, { meal: 'lunch' });
    const rec = (await db.edits.toArray()).at(-1)!;
    expect(rec.table).toBe('entries');
    expect((rec.before as { meal: string }).meal).toBe('dinner');
    expect((rec.after as { meal: string }).meal).toBe('lunch');
    expect(await undoEdit(rec.id!)).toBe(true);
    expect((await db.entries.get(e.id))?.meal).toBe('dinner');
  });

  it('deleting an entry or a set can be undone', async () => {
    const e = await addEntry(entry);
    const s = await logSet(set);
    await deleteEntry(e.id);
    await deleteSet(s.id);
    const edits = await db.edits.orderBy('id').toArray();
    for (const r of edits.reverse()) await undoEdit(r.id!);
    expect(await db.entries.get(e.id)).toBeTruthy();
    expect(await db.sets.get(s.id)).toBeTruthy();
  });

  it('the usage log keeps 400 days', async () => {
    const day = 86_400_000;
    const now = Date.UTC(2026, 9, 12);
    await logUsage('open', undefined, now - 401 * day);
    await logUsage('open', undefined, now - 10 * day);
    await pruneUsage(now);
    const rows = await db.usage.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].at).toBe(now - 10 * day);
  });

  it('logging food, a set, steps, a tick or the morning log records a log event', async () => {
    await addEntry(entry);
    await logSet(set);
    const kinds = (await db.usage.toArray()).map((u) => `${u.kind}:${u.detail}`);
    expect(kinds).toEqual(expect.arrayContaining(['log:food', 'log:set']));
  });
});
