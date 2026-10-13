import { fmtDayMonth } from '../domain/format';
import type { DayKey } from '../domain/dates';
import type { Day, TrainingSession } from '../domain/types';
import { CHAPTERS, chapterAt, kmFromSteps, positionAt } from '../domain/walk';

export type StructureKind = 'lamp post' | 'well' | 'footbridge' | 'shelter' | 'rest house';
const KINDS: StructureKind[] = ['lamp post', 'well', 'footbridge', 'shelter', 'rest house'];

export interface Structure {
  kind: StructureKind;
  name: string;
  date: DayKey;
  km: number;
  x: number;
  y: number;
  chapter: number;
}

/** What a finished session builds by the road: bigger for better sessions, a step up for a record. */
export function buildFor(s: Pick<TrainingSession, 'session' | 'date'>, quality: number | undefined, record: boolean): { kind: StructureKind; name: string } {
  const q = quality ?? 60;
  let i = q >= 90 ? 4 : q >= 80 ? 3 : q >= 65 ? 2 : q >= 50 ? 1 : 0;
  if (record) i = Math.min(4, i + 1);
  const kind = KINDS[i];
  return { kind, name: `${kind.charAt(0).toUpperCase()}${kind.slice(1)} · Session ${s.session} · ${fmtDayMonth(s.date)}` };
}

/** Every structure built so far, each at the walk's position at the end of its session's day. */
export function structuresFrom(days: Pick<Day, 'date' | 'steps'>[], sessions: Pick<TrainingSession, 'date' | 'session' | 'status' | 'quality' | 'id'>[], recordSessions: Set<string>): Structure[] {
  const kmBy = new Map<DayKey, number>();
  let km = 0;
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    km += kmFromSteps(d.steps ?? 0);
    kmBy.set(d.date, km);
  }
  const at = (date: DayKey) => {
    const known = [...kmBy.entries()].filter(([d]) => d <= date).pop();
    return known ? known[1] : 0;
  };
  return sessions
    .filter((s) => s.status === 'done')
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const k = at(s.date);
      const p = positionAt(k);
      return { ...buildFor(s, s.quality, recordSessions.has(s.id)), date: s.date, km: k, x: p.x, y: p.y, chapter: chapterAt(k).n };
    });
}

/** Map distance that counts as "the same place" when a later chapter passes by. */
const NEAR = 3;

/** Things you built in an earlier chapter that the road passes again here. */
export function meetBuilt(kmNow: number, built: Structure[]): Structure[] {
  const here = positionAt(kmNow);
  const chapter = chapterAt(kmNow).n;
  return built.filter((b) => b.chapter < chapter && Math.hypot(b.x - here.x, b.y - here.y) <= NEAR);
}

/** The camp's night, from sleep: starry for a long regular night, rainy for a short one. A picture, never a penalty. */
export function nightCamp(sleepMin: number | undefined, sri: number | undefined): 'starry' | 'calm' | 'rainy' {
  if (sleepMin === undefined) return 'calm';
  if (sleepMin < 360) return 'rainy';
  return sleepMin >= 420 && (sri ?? 0) >= 80 ? 'starry' : 'calm';
}

export const CHAPTER_COUNT = CHAPTERS.length;
