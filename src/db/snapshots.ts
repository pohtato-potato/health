import { dayKey, type DayKey } from '../domain/dates';
import { exportData, parseBackup, restoreData } from './backup';
import { db } from './db';

export interface Snapshot { id: string; at: number; kind: 'daily' | 'before'; day: DayKey; reason?: string; data: string }

const KEEP_DAILY = 7;

/** Stores a copy of every number on this phone. Photos stay where they are. */
export async function takeSnapshot(kind: Snapshot['kind'], reason?: string, day: DayKey = dayKey()): Promise<string> {
  const data = JSON.stringify(await exportData());
  const id = `${kind}:${day}:${Date.now()}`;
  await db.snapshots.put({ id, at: Date.now(), kind, day, reason, data });
  const same = (await db.snapshots.where('kind').equals(kind).toArray()).sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at);
  const stale = same.slice(kind === 'daily' ? KEEP_DAILY : 1);
  if (stale.length) await db.snapshots.bulkDelete(stale.map((s) => s.id));
  return id;
}

/** The copy taken before anything is replaced. If it can't be saved, nothing goes ahead. */
export async function safetyCopy(reason: string): Promise<void> {
  try {
    await takeSnapshot('before', reason);
  } catch {
    throw new Error("Couldn't save a copy first, so nothing was changed.");
  }
}

export async function dailySnapshot(today: DayKey): Promise<void> {
  const dailies = await db.snapshots.where('kind').equals('daily').toArray();
  if (!dailies.some((s) => s.day === today)) await takeSnapshot('daily', undefined, today);
}

export async function listSnapshots(): Promise<Snapshot[]> {
  return (await db.snapshots.toArray()).sort((a, b) => b.at - a.at);
}

export async function restoreSnapshot(id: string): Promise<void> {
  const snap = await db.snapshots.get(id);
  if (!snap) throw new Error('That snapshot is no longer here.');
  await safetyCopy('Before going back to a snapshot');
  await restoreData(parseBackup(snap.data));
}
