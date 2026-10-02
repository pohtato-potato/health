import { addDays, dayKey } from '../domain/dates';
import type { CheckIn, Day, TargetsRecord, TrainingSession } from '../domain/types';
import { targetsOn } from '../domain/rings';
import { positionAt } from '../domain/walk';

/* Health's postcard to Logbook: one small summary per finished day, left on the shared "shelf" on this website.
   Health only writes it; Logbook only reads it. The format is pinned by tests/fixtures/postcard-v1.json, the same file in both repos.
   Both apps open the shelf at the same version with the same store, so either may create it. */
export const SHELF_DB = 'shelf', SHELF_VERSION = 1, SHELF_STORE = 'postcards', POSTCARD_VERSION = 1;
export type Postcard = {
  id: string; app: 'health'; version: 1; day: string; writtenAt: number;
  steps: number | null; sleepMin: number | null;
  workout: { name: string; minutes: number } | null;
  checkin: { at: number } | null;
  walk: { km: number; place: string; next?: string } | null;
  rings: { workout: number; sleep: number; steps: number };
  line: string;
};
const num = (x: unknown, min = 0, max = Infinity) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const opt = (x: unknown, ok: (v: Record<string, unknown>) => boolean) => x === null || x === undefined || (typeof x === 'object' && ok(x as Record<string, unknown>));
/* The same rules Logbook's parsePostcard applies. */
export function checkPostcard(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>, r = p.rings as Record<string, unknown> | undefined;
  return p.app === 'health' && p.version === POSTCARD_VERSION && typeof p.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.day) && p.id === `health:${p.day}` && num(p.writtenAt)
    && (p.steps === null || num(p.steps, 0, 500_000)) && (p.sleepMin === null || num(p.sleepMin, 0, 24 * 60))
    && opt(p.workout, w => typeof w.name === 'string' && num(w.minutes, 0, 24 * 60)) && opt(p.checkin, c => num(c.at)) && opt(p.walk, w => num(w.km) && typeof w.place === 'string')
    && !!r && num(r.workout, 0, 1) && num(r.sleep, 0, 1) && num(r.steps, 0, 1) && typeof p.line === 'string';
}
const hm = (m: number) => `${Math.floor(m / 60)} h ${m % 60} m`;
export function buildPostcard(date: string, day: Pick<Day, 'date' | 'steps' | 'sleep'> | undefined, sessions: TrainingSession[], checkins: CheckIn[], targets: TargetsRecord[], kmToDate: number, now = Date.now()): Postcard {
  const t = targetsOn(targets, date), steps = day?.steps ?? null;
  const sleepMin = day?.sleep ? (day.sleep.woke - day.sleep.asleep + 1440) % 1440 : null;
  const done = sessions.filter(s => s.date === date && s.status === 'done' && s.endedAt);
  const workout = done.length ? { name: done[0].session || done[0].planName, minutes: Math.round(done.reduce((a, s) => a + (s.endedAt! - s.startedAt), 0) / 60_000) } : null;
  const ci = checkins.filter(c => c.date === date).sort((a, b) => a.at - b.at)[0];
  const pos = kmToDate > 0 ? positionAt(kmToDate) : null;
  const ring = (v: number | null, goal?: number) => (v == null || !goal ? 0 : Math.min(1, Math.round((v / goal) * 1000) / 1000));
  const parts = [steps != null && `${steps.toLocaleString('en-GB')} steps`, sleepMin != null && `${hm(sleepMin)} of sleep`, workout ? `${workout.name.toLowerCase()} for ${workout.minutes} minutes` : (steps != null || sleepMin != null) && 'a rest day'].filter(Boolean) as string[];
  return {
    id: `health:${date}`, app: 'health', version: 1, day: date, writtenAt: now, steps, sleepMin, workout, checkin: ci ? { at: ci.at } : null,
    walk: pos ? { km: Math.round(pos.km * 10) / 10, place: pos.from.name, ...(pos.to ? { next: pos.to.name } : {}) } : null,
    rings: { workout: workout ? 1 : 0, sleep: ring(sleepMin, t?.sleepMin), steps: ring(steps, t?.steps) },
    line: parts.length ? `${parts.join(', ').replace(/^./, c => c.toUpperCase())}.` : 'Nothing logged that day.',
  };
}
/* The finished days to send: the last week, and yesterday only from noon on (so late entries are in). */
export function daysToSend(now: Date): string[] {
  const today = dayKey(now), out: string[] = [];
  for (let k = 1; k <= 7; k++) out.push(addDays(today, -k));
  return now.getHours() >= 12 ? out : out.slice(1);
}
export function openShelf(): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    const req = indexedDB.open(SHELF_DB, SHELF_VERSION);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(SHELF_STORE)) req.result.createObjectStore(SHELF_STORE, { keyPath: 'id' }); };
    req.onsuccess = () => ok(req.result); req.onerror = () => no(req.error);
  });
}
export async function putPostcards(cards: Postcard[]): Promise<void> {
  if (!cards.length) return;
  const s = await openShelf();
  try { await new Promise<void>((ok, no) => { const tx = s.transaction(SHELF_STORE, 'readwrite'); cards.forEach(c => tx.objectStore(SHELF_STORE).put(c)); tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error); }); }
  finally { s.close(); }
}
