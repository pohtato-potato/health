import { dayKey } from '../domain/dates';
import { db } from './db';

/** Keeps a moment for the shelf on Earned. */
export async function logMoment(kind: string, text: string, at = Date.now()): Promise<void> {
  await db.moments.put({ id: `${kind}:${at}`, at, kind, date: dayKey(new Date(at)), payload: { text } });
}

/** Keeps a moment once, under its own id (a record on a day, an arrival): seeing it again changes nothing. */
export async function keepMomentOnce(id: string, kind: string, date: string, text: string, at = Date.now()): Promise<void> {
  await db.transaction('rw', db.moments, async () => {
    if (!(await db.moments.get(id))) await db.moments.put({ id, at, kind, date, payload: { text } });
  });
}
