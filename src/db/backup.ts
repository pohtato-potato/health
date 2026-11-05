import { dayKey, daysBetween, type DayKey } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { validatePlan } from '../domain/plan';
import type { Settings } from '../domain/types';
import { bump, defaultSettings, patchSettings } from './actions';
import { TABLES, db, type TableName } from './db';
import { migrateToV2 } from './migrate';

export interface BackupFile {
  app: 'health';
  kind: 'backup' | 'starter';
  version: 1;
  exportedAt: string;
  tables: Partial<Record<TableName, unknown[]>>;
}

export async function exportData(): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) tables[t] = await db.table(t).toArray();
  });
  return { app: 'health', kind: 'backup', version: 1, exportedAt: new Date().toISOString(), tables };
}

export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a Health backup: it couldn't be read as JSON.");
  }
  const b = data as Partial<BackupFile>;
  if (!b || b.app !== 'health' || !b.tables) throw new Error("This file isn't a Health backup.");
  if (b.version !== 1) throw new Error('This backup comes from a newer version of Health. Update the app first.');
  const plan = (b.tables.settings?.[0] as Settings | undefined)?.plan;
  if (plan) {
    const errs = validatePlan(plan);
    if (errs.length) throw new Error(`The training plan in this file has problems: ${errs[0]}`);
  }
  return b as BackupFile;
}

export function summarise(b: BackupFile): string {
  const n = (t: TableName) => b.tables[t]?.length ?? 0;
  const parts = [
    `${n('days')} day${n('days') === 1 ? '' : 's'}`,
    `${n('entries')} food entries`,
    `${n('foods')} saved foods`,
    `${n('sessions')} sessions`,
    `${n('measurements')} measurements`,
  ];
  return parts.join(' · ');
}

/** Replaces everything on this phone with the file's contents. */
export async function restoreData(b: BackupFile) {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = b.tables[t] ?? [];
      if (rows.length) await db.table(t).bulkPut(rows);
    }
    // A starter file may leave settings out or partial; fill the gaps.
    const s = (b.tables.settings?.[0] as Partial<Settings> | undefined) ?? {};
    await db.settings.put({ ...defaultSettings(), ...s, id: 'app' });
  });
  await migrateToV2(db);
}

export type ReadBack = { ok: true } | { ok: false; why: string };

/** Reads the finished file back and counts every table against what was meant to go in. */
export async function confirmReadBack(file: File, expected: BackupFile): Promise<ReadBack> {
  try {
    const back = parseBackup(await file.text());
    for (const t of TABLES) {
      if ((back.tables[t]?.length ?? 0) !== (expected.tables[t]?.length ?? 0)) return { ok: false, why: `The backup came back short: ${t} didn't match, so it wasn't saved.` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, why: `The backup couldn't be read back, so it wasn't saved. ${(e as Error).message}` };
  }
}

export type FileCheck = { ok: true; exportedAt: string; summary: string; newestDay?: DayKey } | { ok: false; why: string };

/** Looks inside a backup file without restoring anything. */
export function checkBackup(b: BackupFile): FileCheck {
  const dates = ((b.tables.days ?? []) as { date: DayKey }[]).map((d) => d.date).sort();
  return { ok: true, exportedAt: b.exportedAt, summary: summarise(b), newestDay: dates[dates.length - 1] };
}

export async function checkBackupFile(file: File): Promise<FileCheck> {
  try {
    return checkBackup(parseBackup(await file.text()));
  } catch (e) {
    return { ok: false, why: (e as Error).message };
  }
}

/** Where the backups stand, in words. */
export function backupWords(settings: Settings, today: DayKey): string {
  const last = Math.max(settings.backup.lastQuick ?? 0, settings.backup.lastFull ?? 0);
  if (!last) return 'No backup yet.';
  const saved = dayKey(new Date(last));
  const gap = daysBetween(saved, today);
  if (gap <= 0) return 'Backed up today. Everything is safe.';
  return `Safe up to ${fmtDayMonth(saved)}. ${gap} day${gap === 1 ? '' : 's'} since then.`;
}

export function backupFileName(d = new Date()): string {
  return `health-backup-${dayKey(d)}.json`;
}

/**
 * Hands the backup to Android's share sheet, so it can go straight to Google
 * Drive. Falls back to a download where sharing files isn't available.
 */
export async function saveBackup(deps: { share?: (f: File) => Promise<'shared' | 'downloaded' | 'cancelled'>; readBack?: (f: File, data: BackupFile) => Promise<ReadBack> } = {}): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const data = await exportData();
  const file = new File([JSON.stringify(data)], backupFileName(), { type: 'application/json' });
  const check = await (deps.readBack ?? confirmReadBack)(file, data);
  if (!check.ok) throw new Error(check.why);
  const result = await (deps.share ?? shareFile)(file);
  if (result !== 'cancelled') {
    await patchSettings((s) => ({ backup: { ...s.backup, lastQuick: Date.now() } }));
    await bump('backup', { day: dayKey() });
  }
  return result;
}

/** Android's share sheet where it can take files (so Drive is one tap away), else a download. */
export async function shareFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(file, file.name);
  return 'downloaded';
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function readFile(file: File): Promise<string> {
  return file.text();
}
