import type { DayKey } from '../domain/dates';
import { BRIDGE_STEP_HOUR_MS, decodeBridgeStepFile, type BridgeStepHour } from '../sources/bridgeSteps';
import type { BridgeRead } from '../sources/bridgeFile';
import { db } from './db';

export interface CachedBridgeStepHour extends BridgeStepHour {
  importedAt: number;
}

export interface CachedBridgeRead extends BridgeRead {
  importedAt: number;
}

function compareHours(incoming: BridgeStepHour, cached: CachedBridgeStepHour): number {
  return incoming.readAt - cached.readAt ||
    Number(incoming.fileDate === incoming.calendarDate) - Number(cached.fileDate === cached.calendarDate);
}

/** Cache one rolling-window batch atomically. Return the Health days with newly observed or changed hours. */
export async function importBridgeStepFiles(files: readonly string[], importedAt = Date.now()): Promise<DayKey[]> {
  if (!Number.isFinite(importedAt)) throw new Error('The Bridge import time is invalid.');
  const parsed = files.map(decodeBridgeStepFile);
  return db.transaction('rw', db.bridgeStepHours, db.bridgeStepReads, async () => {
    const changed = new Set<DayKey>();
    for (const file of parsed) {
      const read = await db.bridgeStepReads.get(file.date);
      if (read?.readAt === file.readAt && read.status !== file.status) {
        throw new Error('Conflicting steps statuses in the same Bridge read.');
      }
      if (!read || file.readAt > read.readAt) {
        await db.bridgeStepReads.put({ date: file.date, readAt: file.readAt, status: file.status, importedAt });
      }

      // A failed or empty read carries no deletion evidence. The last usable hours stay available.
      for (const hour of file.hours) {
        const cached = await db.bridgeStepHours.get(hour.startAt);
        const order = cached ? compareHours(hour, cached) : 1;
        if (order < 0) continue;
        const same = cached && cached.count === hour.count && cached.day === hour.day && cached.reportedSource === hour.reportedSource;
        if (order === 0) {
          if (!same) throw new Error('Conflicting values for the same Bridge step hour.');
          continue;
        }
        if (!cached) {
          // Hourly aggregates that overlap without matching intervals cannot be split accurately.
          const overlap = await db.bridgeStepHours.where('startAt')
            .between(hour.startAt - BRIDGE_STEP_HOUR_MS, hour.startAt + BRIDGE_STEP_HOUR_MS, false, false).first();
          if (overlap) throw new Error('Overlapping Bridge step hours use different intervals.');
        }
        await db.bridgeStepHours.put({ ...hour, importedAt: same ? cached.importedAt : importedAt });
        if (!cached || cached.count !== hour.count || cached.day !== hour.day) {
          changed.add(hour.day);
          if (cached) changed.add(cached.day);
        }
      }
    }
    return Array.from(changed).sort();
  });
}

export async function readBridgeStepDay(day: DayKey) {
  const hours = await db.bridgeStepHours.where('day').equals(day).toArray();
  if (!hours.length) return undefined;
  const latest = hours.reduce((a, b) => a.startAt > b.startAt ? a : b);
  return {
    count: hours.reduce((total, hour) => total + hour.count, 0),
    latestBucketEnd: latest.end,
    observedThrough: Math.min(Date.parse(latest.end), latest.readAt),
    // Bridge v1 sends an Apple Health aggregate and names only the leading source in each hour.
    source: 'Apple Health' as const,
    importedAt: hours.reduce((latestImport, hour) => Math.max(latestImport, hour.importedAt), 0),
  };
}
