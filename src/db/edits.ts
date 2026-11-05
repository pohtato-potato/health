import { db } from './db';

type Row = { [k: string]: unknown };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Keeps the before and after of a change so it can be undone and audited. before = undefined means it was created; after = undefined means it was deleted. */
export async function recordEdit(table: string, rowId: string, before: unknown, after: unknown): Promise<number> {
  return (await db.edits.add({ at: Date.now(), table, rowId, before, after })) as number;
}

/** A day holds many separate answers, so undo works on one field at a time. */
function undoOnDay(now: Row | undefined, before: Row | undefined, after: Row | undefined): { row?: Row; restored: boolean } {
  if (!after) {
    if (!now) return { row: before, restored: true };
    const row = { ...now };
    let restored = false;
    for (const k of Object.keys(before ?? {})) if (row[k] === undefined) { row[k] = before![k]; restored = true; }
    return { row, restored };
  }
  if (!now) return { restored: false };
  const row = { ...now };
  let restored = false;
  for (const k of new Set([...Object.keys(before ?? {}), ...Object.keys(after)])) {
    if (k === 'date' || same(before?.[k], after[k]) || !same(now[k], after[k])) continue;
    if (before?.[k] === undefined) delete row[k];
    else row[k] = before[k];
    restored = true;
  }
  return { row, restored };
}

/** Undoes only what this edit changed. Anything changed again since stays. Says whether anything went back. */
export async function undoEdit(id: number): Promise<boolean> {
  const rec = await db.edits.get(id);
  if (!rec) return false;
  const t = db.table(rec.table);
  const now = (await t.get(rec.rowId)) as Row | undefined;
  const before = rec.before as Row | undefined;
  const after = rec.after as Row | undefined;
  let restored = false;
  if (rec.table === 'days') {
    const out = undoOnDay(now, before, after);
    restored = out.restored;
    if (restored && out.row) {
      if (Object.keys(out.row).every((k) => k === 'date' || out.row![k] === undefined)) await t.delete(rec.rowId);
      else await t.put(out.row);
    }
  } else if (!after) {
    if (!now) { await t.put(before as Row); restored = true; }
  } else if (now && same(Object.entries(now).sort(), Object.entries(after).sort())) {
    if (before) await t.put(before);
    else await t.delete(rec.rowId);
    restored = true;
  }
  await db.edits.delete(id);
  return restored;
}
