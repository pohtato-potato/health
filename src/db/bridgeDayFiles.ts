import { importBridgeMealFiles } from './bridgeMeals';
import { importBridgeSleepFiles } from './bridgeSleep';
import { importBridgeStepFiles } from './bridgeSteps';
import { db } from './db';

/** Intake for the complete v1 day files. A malformed stream rolls back the whole batch. */
export async function importBridgeDayFiles(files: readonly string[], importedAt = Date.now()) {
  return db.transaction('rw', [
    db.bridgeStepHours, db.bridgeStepReads, db.bridgeMeals, db.bridgeMealReads,
    db.bridgeSleepSpans, db.bridgeSleepReads,
  ], async () => ({
    stepDays: await importBridgeStepFiles(files, importedAt),
    meals: await importBridgeMealFiles(files, importedAt),
    sleepSpans: await importBridgeSleepFiles(files, importedAt),
  }));
}
