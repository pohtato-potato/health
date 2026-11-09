import { db } from '../db/db';
import type { DayKey } from '../domain/dates';

/**
 * Marks this morning's reveal as seen, once, so a reload never opens it again. No visitors are drawn any more: the
 * creatures were retired for the album and cards (R4-7). Sightings already stored stay in the data and in backups.
 */
export async function ensureReveal(date: DayKey, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const day = await db.days.get(date);
    if (!day?.sleep || day.revealedAt) return;
    await db.days.put({ ...day, revealedAt: now });
  });
}
