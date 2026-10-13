import { db } from './db';

export type UsageKind = 'open' | 'screen' | 'sheet' | 'log' | 'edit' | 'skip' | 'tick' | 'finish' | 'banner-shown' | 'banner-tap' | 'banner-dismiss';

const KEEP_MS = 400 * 86_400_000;
let lastPrune = 0;

/** Records one use of the app, on the phone only, for monthly audits and "nudges at your hour". Never throws. */
export async function logUsage(kind: UsageKind, detail?: string, at = Date.now()): Promise<void> {
  try {
    await db.usage.add({ at, kind, detail });
    if (at - lastPrune > 86_400_000) {
      lastPrune = at;
      await pruneUsage(at);
    }
  } catch {
    /* usage logging must never break the app */
  }
}

/** Drops events older than 400 days. */
export async function pruneUsage(now = Date.now()): Promise<number> {
  return db.usage.where('at').below(now - KEEP_MS).delete();
}
