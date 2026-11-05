import { dayKey } from '../domain/dates';
import { db } from './db';

/** Keeps a moment for the shelf on Earned. */
export async function logMoment(kind: string, text: string, at = Date.now()): Promise<void> {
  await db.moments.put({ id: `${kind}:${at}`, at, kind, date: dayKey(new Date(at)), payload: { text } });
}
