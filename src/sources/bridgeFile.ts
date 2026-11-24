import type { DayKey } from '../domain/dates';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function isDay(value: unknown): value is DayKey {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return false;
  const at = Date.parse(value);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === value;
}

export function timestamp(value: unknown): { localDate: DayKey; minute: number; at: number } | undefined {
  if (typeof value !== 'string') return undefined;
  const match = ISO_TIME.exec(value);
  if (!match || !isDay(match[1]) || Number(match[2]) > 23) return undefined;
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return undefined;
  return { localDate: match[1], minute: Number(match[2]) * 60 + Number(match[3]), at };
}

export type BridgeReadStatus = 'ok' | 'none' | 'error';

export interface BridgeRead {
  date: DayKey;
  readAt: number;
  status: BridgeReadStatus;
}

export function decodeBridgeStream(text: string, stream: 'steps' | 'meals' | 'sleep'): BridgeRead & { rows: unknown[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The Bridge day file is not valid JSON.');
  }
  if (!isObject(data) || data.schema !== 1) throw new Error('This Bridge day file version is unsupported.');
  const date = data.date;
  const read = timestamp(data.readAt);
  if (!isDay(date) || !read) throw new Error('The Bridge day file has an invalid date or read time.');
  const status = isObject(data.status) ? data.status[stream] : undefined;
  if (status !== 'ok' && status !== 'none' && status !== 'error') {
    throw new Error(`The Bridge day file has an invalid ${stream} status.`);
  }
  const rows = data[stream];
  if (status !== 'ok') {
    if (rows !== undefined && (!Array.isArray(rows) || rows.length)) {
      throw new Error(`An empty or failed Bridge ${stream} read cannot include readings.`);
    }
    return { date, readAt: read.at, status, rows: [] };
  }
  if (!Array.isArray(rows) || !rows.length) throw new Error(`The Bridge day file is missing ${stream} readings.`);
  return { date, readAt: read.at, status, rows };
}
