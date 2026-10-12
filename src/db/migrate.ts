import { addDays, type DayKey } from '../domain/dates';
import { DEFAULT_MEAL_TIMES, type Day, type OccasionKind, type Place, type Settings, type Status } from '../domain/types';
import type { HealthDB } from './db';

export interface MigrationReport {
  changed: boolean;
  places: number;
  days: number;
}

const STATUS_FOR: Record<OccasionKind, Status> = {
  travel: 'travelling',
  sick: 'sick',
  injured: 'injured',
  break: 'break',
  festival: 'occasion',
  wedding: 'occasion',
  other: 'occasion',
};

/** v1 homes become places. A home named for an office or a trip keeps the plain home kind; the owner sets kinds in Settings. */
export function placesFromHomes(homes: Settings['homes']): Place[] {
  return homes.map((h) => ({ id: h.id, name: h.name, kind: 'home', meals: { ...DEFAULT_MEAL_TIMES.home }, eased: false, foodsFirst: 'home' }));
}

/**
 * Brings 1.x data up to v2. Safe to run any number of times: it only fills what is missing.
 * Runs after every restore and on the first open of 2.0.
 */
export async function migrateToV2(db: HealthDB): Promise<MigrationReport> {
  const report: MigrationReport = { changed: false, places: 0, days: 0 };
  await db.transaction('rw', db.settings, db.days, db.occasions, async () => {
    const s = await db.settings.get('app');
    if (s && !s.places) {
      const places = placesFromHomes(s.homes ?? []);
      await db.settings.put({ ...s, places });
      report.places = places.length;
      report.changed = true;
    }

    const statusOn = new Map<DayKey, Status>();
    for (const o of await db.occasions.toArray()) {
      for (let d = o.from; d <= o.to; d = addDays(d, 1)) statusOn.set(d, STATUS_FOR[o.kind] ?? 'occasion');
    }

    const days = await db.days.toArray();
    const updates: Day[] = [];
    for (const d of days) {
      const next: Day = { ...d };
      let touched = false;
      if (d.place === undefined && d.home !== undefined) {
        next.place = d.home;
        touched = true;
      }
      const st = statusOn.get(d.date);
      if (st && d.status === undefined) {
        next.status = st;
        touched = true;
      }
      if (touched) updates.push(next);
    }
    if (updates.length) {
      await db.days.bulkPut(updates);
      report.days = updates.length;
      report.changed = true;
    }
  });
  return report;
}
