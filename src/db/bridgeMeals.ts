import type { DayKey } from '../domain/dates';
import type { Meal } from '../domain/types';
import { decodeBridgeMealFile } from '../sources/bridgeMeals';
import type { BridgeMeal } from '../sources/bridgeMeals';
import { db } from './db';

export interface BridgeMealDetails {
  name?: string;
  meal?: Meal;
  eatenAt?: number;
  decision?: 'keep-manual' | 'include';
}

export interface CachedBridgeMeal extends BridgeMeal {
  importedAt: number;
  details?: BridgeMealDetails;
}

function sameMeasurement(a: BridgeMeal, b: BridgeMeal): boolean {
  return a.loggedAt === b.loggedAt && a.kcal === b.kcal &&
    JSON.stringify(a.nutrients) === JSON.stringify(b.nutrients) &&
    JSON.stringify(a.sampleIds) === JSON.stringify(b.sampleIds);
}

/** Cache source records separately from the food log. An omitted log is not a confirmed deletion. */
export async function importBridgeMealFiles(files: readonly string[], importedAt = Date.now()): Promise<number> {
  if (!Number.isFinite(importedAt)) throw new Error('The Bridge import time is invalid.');
  const parsed = files.map(decodeBridgeMealFile);
  return db.transaction('rw', db.bridgeMealReads, db.bridgeMeals, async () => {
    const changed = new Set<string>();
    for (const { date, readAt, status, meals } of parsed) {
      const previousRead = await db.bridgeMealReads.get(date);
      if (previousRead?.readAt === readAt && previousRead.status !== status) {
        throw new Error('Conflicting meal statuses in the same Bridge read.');
      }
      if (!previousRead || readAt > previousRead.readAt) {
        await db.bridgeMealReads.put({ date, readAt, status, importedAt });
      }

      for (const record of meals) {
        const cached = await db.bridgeMeals.get(record.id);
        const order = cached ? record.readAt - cached.readAt ||
          Number(record.fileDate === record.day) - Number(cached.fileDate === cached.day) : 1;
        if (order < 0) continue;
        const same = cached ? sameMeasurement(record, cached) : false;
        if (order === 0) {
          if (!same) throw new Error('Conflicting values for the same Bridge meal.');
          continue;
        }
        await db.bridgeMeals.put({
          ...record,
          importedAt: same && cached ? cached.importedAt : importedAt,
          details: cached?.details,
        });
        if (!same) changed.add(record.id);
      }
    }
    return changed.size;
  });
}

/** Reads source entries for their logged day. A supplied eaten time stays a separate field. */
export async function readBridgeMeals(day: DayKey): Promise<CachedBridgeMeal[]> {
  const rows = await db.bridgeMeals.where('day').equals(day).toArray();
  return rows.sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt) || a.id.localeCompare(b.id));
}

/** Saves user annotations separately from the provider's fields. */
export async function setBridgeMealDetails(id: string, details: BridgeMealDetails): Promise<boolean> {
  return (await db.bridgeMeals.update(id, { details })) === 1;
}
