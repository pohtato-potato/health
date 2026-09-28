import { dayKey } from '../domain/dates';
import { validatePlan } from '../domain/plan';
import type { Settings } from '../domain/types';
import { bump, defaultSettings, patchSettings } from './actions';
import { TABLES, db, type TableName } from './db';

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
    `${n('days')} days`,
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
}

export function backupFileName(d = new Date()): string {
  return `health-backup-${dayKey(d)}.json`;
}

/**
 * Hands the backup to Android's share sheet, so it can go straight to Google
 * Drive. Falls back to a download where sharing files isn't available.
 */
export async function saveBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const data = await exportData();
  const name = backupFileName();
  const result = await shareFile(new File([JSON.stringify(data)], name, { type: 'application/json' }));
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
