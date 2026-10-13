import type { AuditNote, EditRecord, Settings, UsageEvent } from '../domain/types';
import { workbookSheets, type ExportData } from './workbook';
import { buildXlsx, zip } from './xlsx';

const enc = (v: unknown) => new TextEncoder().encode(typeof v === 'string' ? v : JSON.stringify(v, null, 2));

/** Settings with every secret taken out: the Last.fm key never leaves the phone. */
export function scrubSettings(s: Settings): Settings {
  const copy = JSON.parse(JSON.stringify(s)) as Settings;
  if (copy.lastfm) copy.lastfm = { ...copy.lastfm, key: undefined as unknown as string };
  return copy;
}

const README = `Health audit pack

health-workbook.xlsx  every log, one sheet each (start with its README sheet)
usage.json            how the app was used, for spotting friction
edits.json            every edit and delete, with before and after
notes.json            notes left while using the app ("this looked wrong")
settings.json         targets, places, plan and preferences, with secrets removed

Ask Claude: what looks off, what is worth changing, and what the data says about progress.
`;

/** The files of the audit pack, for Claude or a spreadsheet. */
export function auditFiles(d: ExportData, extra: { usage: Pick<UsageEvent, 'at' | 'kind' | 'detail'>[]; edits: EditRecord[]; notes: Pick<AuditNote, 'at' | 'text'>[] }): { name: string; data: Uint8Array }[] {
  const safe = { ...d, settings: scrubSettings(d.settings) };
  return [
    { name: 'README.txt', data: enc(README) },
    { name: 'health-workbook.xlsx', data: buildXlsx(workbookSheets(safe)) },
    { name: 'usage.json', data: enc(extra.usage) },
    { name: 'edits.json', data: enc(extra.edits) },
    { name: 'notes.json', data: enc(extra.notes) },
    { name: 'settings.json', data: enc(safe.settings) },
  ];
}

/** The audit pack as one zip file. */
export function buildAuditPack(d: ExportData, extra: Parameters<typeof auditFiles>[1]): Uint8Array {
  return zip(auditFiles(d, extra));
}
