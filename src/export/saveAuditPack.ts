import { dayKey } from '../domain/dates';
import type { Settings } from '../domain/types';
import { exportData, shareFile } from '../db/backup';
import { db } from '../db/db';
import { buildAuditPack } from './auditPack';
import type { ExportData } from './workbook';

/** The audit pack (workbook, usage, edits, notes, settings without secrets) as a zip to share. */
export async function saveAuditPack() {
  const { tables } = await exportData();
  const data: ExportData = {
    settings: tables.settings![0] as Settings,
    days: (tables.days ?? []) as ExportData['days'],
    foods: (tables.foods ?? []) as ExportData['foods'],
    entries: (tables.entries ?? []) as ExportData['entries'],
    sessions: (tables.sessions ?? []) as ExportData['sessions'],
    sets: (tables.sets ?? []) as ExportData['sets'],
    measurements: (tables.measurements ?? []) as ExportData['measurements'],
    trackValues: (tables.trackValues ?? []) as ExportData['trackValues'],
  };
  const bytes = buildAuditPack(data, { usage: await db.usage.toArray(), edits: await db.edits.toArray(), notes: await db.auditNotes.toArray() });
  return shareFile(new File([bytes as BlobPart], `health-audit-${dayKey()}.zip`, { type: 'application/zip' }));
}
