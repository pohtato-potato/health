import { addDays, type DayKey } from '../domain/dates';
import { bridgeSleepNight, decodeBridgeSleepFile } from '../sources/bridgeSleep';
import { db } from './db';

/** Record the device reads without modifying the sleep someone logged in Health. */
export async function importBridgeSleepFiles(files: readonly string[], importedAt = Date.now()): Promise<number> {
  if (!Number.isFinite(importedAt)) throw new Error('The Bridge import time is invalid.');
  const parsed = files.map(decodeBridgeSleepFile);
  return db.transaction('rw', db.bridgeSleepReads, db.bridgeSleepSpans, async () => {
    const changed = new Set<string>();
    for (const { date, readAt, status, spans } of parsed) {
      const read = await db.bridgeSleepReads.get(date);
      if (read?.readAt === readAt && read.status !== status) throw new Error('Conflicting statuses in the same Bridge sleep read.');
      if (!read || readAt > read.readAt) await db.bridgeSleepReads.put({ date, readAt, status, importedAt });

      for (const span of spans) {
        const cached = await db.bridgeSleepSpans.get(span.uuid);
        if (cached && readAt < cached.readAt) continue;
        const same = cached && cached.start === span.start && cached.end === span.end &&
          cached.stage === span.stage && cached.source === span.source;
        if (cached?.readAt === readAt) {
          if (!same) throw new Error('Conflicting values in the same Bridge sleep span.');
          continue;
        }
        await db.bridgeSleepSpans.put({ ...span, importedAt: same ? cached.importedAt : importedAt });
        if (!same) changed.add(span.uuid);
      }
    }
    return changed.size;
  });
}

export async function readBridgeSleepNight(day: DayKey) {
  const spans = await db.bridgeSleepSpans.where('endDay').between(addDays(day, -1), addDays(day, 1), true, true).toArray();
  return bridgeSleepNight(day, spans);
}
