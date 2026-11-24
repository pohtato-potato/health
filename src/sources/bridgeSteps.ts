import { DAY_STARTS_AT_MIN, type DayKey } from '../domain/dates';
import { decodeBridgeStream, isObject, timestamp, type BridgeRead } from './bridgeFile';

export const BRIDGE_STEP_HOUR_MS = 3_600_000;
export interface BridgeStepHour {
  startAt: number;
  start: string;
  end: string;
  day: DayKey;
  calendarDate: DayKey;
  fileDate: DayKey;
  count: number;
  reportedSource: string;
  readAt: number;
}

interface BridgeStepFile extends BridgeRead {
  hours: BridgeStepHour[];
}

/** Decode only the steps part of the Bridge v1 file. Other streams can evolve independently. */
export function decodeBridgeStepFile(text: string): BridgeStepFile {
  const { rows, ...read } = decodeBridgeStream(text, 'steps');
  const { date, readAt } = read;
  const hours = rows.map((bucket: unknown) => {
    if (!isObject(bucket)) throw new Error('The Bridge day file has an invalid step hour.');
    const rawStart = bucket.start;
    const start = timestamp(rawStart);
    const end = timestamp(bucket.end);
    const count = bucket.count;
    const reportedSource = bucket.source;
    if (!start || !end || typeof rawStart !== 'string' || typeof bucket.end !== 'string' || end.at - start.at !== BRIDGE_STEP_HOUR_MS ||
      start.minute % 60 !== 0 || start.at % 60_000 !== 0 ||
      typeof count !== 'number' || !Number.isFinite(count) || count < 0 ||
      typeof reportedSource !== 'string' || !reportedSource.trim()) {
      throw new Error('The Bridge day file has an invalid step hour.');
    }

    // Use the timestamp's local calendar, even when the phone or test runner uses another zone.
    const localDay = Date.parse(start.localDate);
    const fileDay = Date.parse(date);
    const withinFile = (localDay - fileDay) / 60_000 + start.minute;
    if (withinFile < -240 || withinFile > 1440 + 240) throw new Error('A Bridge step hour is outside its day file.');
    const day = start.minute < DAY_STARTS_AT_MIN ? new Date(localDay - 24 * BRIDGE_STEP_HOUR_MS).toISOString().slice(0, 10) : start.localDate;
    return {
      startAt: start.at, start: rawStart, end: bucket.end, day, calendarDate: start.localDate, fileDate: date,
      count, reportedSource, readAt,
    };
  });
  return { ...read, hours };
}
