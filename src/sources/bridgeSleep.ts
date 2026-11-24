import type { DayKey } from '../domain/dates';
import { decodeBridgeStream, isObject, timestamp } from './bridgeFile';

interface Interval {
  start: string;
  end: string;
  startAt: number;
  endAt: number;
}

const STAGES = ['inBed', 'awake', 'asleep', 'core', 'deep', 'rem'] as const;
type Stage = (typeof STAGES)[number];

function isStage(value: unknown): value is Stage {
  return STAGES.some((stage) => stage === value);
}

export interface BridgeSleepSpan extends Interval {
  uuid: string;
  source: string;
  stage: Stage;
  endDay: DayKey;
  readAt: number;
}

export function decodeBridgeSleepFile(text: string) {
  const { rows, ...read } = decodeBridgeStream(text, 'sleep');
  const spans = rows.map((row): BridgeSleepSpan => {
    if (!isObject(row) || typeof row.uuid !== 'string' || !row.uuid.trim() ||
      typeof row.source !== 'string' || !row.source.trim() || !isStage(row.stage) ||
      typeof row.start !== 'string' || typeof row.end !== 'string') {
      throw new Error('The Bridge day file has an invalid sleep span.');
    }
    const start = timestamp(row.start);
    const end = timestamp(row.end);
    if (!start || !end || end.at <= start.at) throw new Error('The Bridge sleep span has invalid times.');
    return {
      uuid: row.uuid, source: row.source, stage: row.stage, start: row.start, end: row.end,
      startAt: start.at, endAt: end.at, endDay: end.localDate, readAt: read.readAt,
    };
  });
  return { ...read, spans };
}

export interface CachedBridgeSleepSpan extends BridgeSleepSpan {
  importedAt: number;
}

interface MeasuredWindow {
  asleepAt: string;
  wokeAt: string;
  asleepMinutes: number;
  source: string;
  importedAt: number;
}

/** The caller supplies spans in chronological order. */
function union(spans: Interval[]): Interval[] {
  const intervals: Interval[] = [];
  for (const { start, end, startAt, endAt } of spans) {
    const tail = intervals.at(-1);
    if (!tail || startAt > tail.endAt) intervals.push({ start, end, startAt, endAt });
    else if (endAt > tail.endAt) Object.assign(tail, { end, endAt });
  }
  return intervals;
}

function withoutAwake(intervals: Interval[], awake: Interval[]): Interval[] {
  return awake.reduce((remaining, wake) => remaining.flatMap((sleep) => {
    if (sleep.endAt <= wake.startAt || sleep.startAt >= wake.endAt) return [sleep];
    const parts: Interval[] = [];
    if (sleep.startAt < wake.startAt) parts.push({ ...sleep, end: wake.start, endAt: wake.startAt });
    if (sleep.endAt > wake.endAt) parts.push({ ...sleep, start: wake.end, startAt: wake.endAt });
    return parts;
  }), intervals);
}

/** Same-source spans belong to one session when they touch or their recorded in-bed window connects them. */
function sessions(spans: CachedBridgeSleepSpan[]): CachedBridgeSleepSpan[][] {
  const groups: CachedBridgeSleepSpan[][] = [];
  let end = -Infinity;
  for (const span of spans.sort((a, b) => a.startAt - b.startAt || a.endAt - b.endAt)) {
    if (span.startAt > end) groups.push([]);
    groups.at(-1)!.push(span);
    end = Math.max(end, span.endAt);
  }
  return groups;
}

function measuredWindow(spans: CachedBridgeSleepSpan[], source: string): MeasuredWindow | undefined {
  const asleep = union(spans.filter((span) => span.stage !== 'inBed' && span.stage !== 'awake'));
  const intervals = withoutAwake(asleep, union(spans.filter((span) => span.stage === 'awake')));
  const first = intervals[0], last = intervals.at(-1);
  if (!first || !last) return undefined;
  return {
    asleepAt: first.start,
    wokeAt: last.end,
    asleepMinutes: intervals.reduce((minutes, span) => minutes + (span.endAt - span.startAt) / 60_000, 0),
    source,
    importedAt: Math.max(...spans.map((span) => span.importedAt)),
  };
}

/** Attribute a session to its local wake date and choose the longest measured session without combining providers. */
export function bridgeSleepNight(day: DayKey, spans: CachedBridgeSleepSpan[]) {
  const bySource = new Map<string, CachedBridgeSleepSpan[]>();
  for (const span of spans) {
    const fromSource = bySource.get(span.source);
    if (fromSource) fromSource.push(span);
    else bySource.set(span.source, [span]);
  }
  const windows = [...bySource].flatMap(([source, rows]) =>
    sessions(rows).flatMap((group) => {
      const window = measuredWindow(group, source);
      return window?.wokeAt.slice(0, 10) === day ? [window] : [];
    }),
  ).sort((a, b) => b.asleepMinutes - a.asleepMinutes || Date.parse(a.asleepAt) - Date.parse(b.asleepAt) || a.source.localeCompare(b.source));
  const [main, ...others] = windows;
  if (!main) return undefined;
  return { main, otherSessions: others.filter((window) => window.source === main.source).sort((a, b) => Date.parse(a.asleepAt) - Date.parse(b.asleepAt)) };
}
