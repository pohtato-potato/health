import type { CheckupFinding } from '../domain/checkup';
import { db } from './db';
import { recordEdit } from './edits';

/** Applies a check-up fix as an ordinary edit, so it shows in the history and can be undone. */
export async function applyFix(f: CheckupFinding): Promise<number> {
  const t = db.table(f.fix.table);
  const before = await t.get(f.fix.rowId);
  if (f.fix.remove) {
    await t.delete(f.fix.rowId);
    return recordEdit(f.fix.table, f.fix.rowId, before, undefined);
  }
  const after: Record<string, unknown> = { ...before, ...f.fix.patch };
  for (const k of Object.keys(after)) if (after[k] === undefined) delete after[k];
  await t.put(after);
  return recordEdit(f.fix.table, f.fix.rowId, before, after);
}
