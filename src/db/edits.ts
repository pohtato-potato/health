import { db } from './db';

type Row = { [k: string]: unknown };

/** Keeps the before and after of a change so it can be undone and audited. before = undefined means it was created; after = undefined means it was deleted. */
export async function recordEdit(table: string, rowId: string, before: unknown, after: unknown): Promise<number> {
  return (await db.edits.add({ at: Date.now(), table, rowId, before, after })) as number;
}

/** Puts a row back to how it was before the recorded change. */
export async function undoEdit(id: number): Promise<boolean> {
  const rec = await db.edits.get(id);
  if (!rec) return false;
  const t = db.table(rec.table);
  if (rec.before === undefined) await t.delete(rec.rowId);
  else await t.put(rec.before as Row);
  await db.edits.delete(id);
  return true;
}
