import { dayKey } from '../domain/dates';
import type { Settings } from '../domain/types';
import { exportData, shareFile } from '../db/backup';
import { bump } from '../db/actions';
import { workbookSheets, type ExportData } from './workbook';
import { buildXlsx } from './xlsx';

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Builds the workbook from everything on the phone and hands it to the share sheet. */
export async function saveWorkbook() {
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
    routes: (tables.routes ?? []) as ExportData['routes'],
  };
  const bytes = buildXlsx(workbookSheets(data));
  void bump('export', { day: dayKey() });
  return shareFile(new File([bytes as BlobPart], `health-${dayKey()}.xlsx`, { type: XLSX_TYPE }));
}
