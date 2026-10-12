import { dayKey, type DayKey } from '../domain/dates';
import type { Swap } from '../domain/plan';
import type {
  Day,
  Food,
  FoodEntry,
  Measurement,
  SetEntry,
  Settings,
  Sleep,
  TargetsRecord,
  Targets,
  TrainingSession,
} from '../domain/types';
import { db, uid } from './db';
import { recordEdit } from './edits';
import { DEFAULT_EQUIPMENT, DEFAULT_PLAN } from '../domain/defaultPlan';

export function defaultSettings(): Settings {
  return {
    id: 'app',
    setupDone: false,
    name: '',
    voice: 'zen',
    targets: [],
    checklist: [],
    homes: [
      { id: 'home-1', name: 'Home' },
      { id: 'home-2', name: 'Other home' },
    ],
    equipment: DEFAULT_EQUIPMENT,
    prefs: { ding: true, wakeLock: true, nightMode: true, buzz: true, confirmSteps: true },
    backup: { nudgeDays: 2 },
    plan: DEFAULT_PLAN,
    planState: { variants: {}, band: {} },
    createdAt: Date.now(),
  };
}

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('app')) ?? defaultSettings();
}

export async function patchSettings(patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) {
  await db.transaction('rw', db.settings, async () => {
    const cur = await getSettings();
    const next = typeof patch === 'function' ? patch(cur) : patch;
    await db.settings.put({ ...cur, ...next, id: 'app' });
  });
}

/** Records new targets from today onward, keeping the history intact. */
export async function setTargets(targets: Targets, from: DayKey = dayKey()) {
  await patchSettings((s) => {
    const kept = s.targets.filter((r) => r.from < from);
    const rec: TargetsRecord = { from, targets };
    return { targets: [...kept, rec].sort((a, b) => a.from.localeCompare(b.from)) };
  });
}

export async function patchDay(date: DayKey, patch: Partial<Day> | ((d: Day) => Partial<Day>)) {
  await db.transaction('rw', db.days, async () => {
    const cur = (await db.days.get(date)) ?? { date };
    const next = typeof patch === 'function' ? patch(cur) : patch;
    await db.days.put({ ...cur, ...next, date });
  });
}

export async function addWater(date: DayKey, ml: number) {
  const h = new Date().getHours();
  const part = h < 12 ? 1 : h < 17 ? 2 : 4;
  let total = 0;
  await patchDay(date, (d) => {
    total = Math.max(0, (d.waterMl ?? 0) + ml);
    return { waterMl: total, waterParts: ml > 0 && date === dayKey() ? (d.waterParts ?? 0) | part : d.waterParts };
  });
  if (ml > 0 && date === dayKey() && h < 10 && total >= 1000) await bump('water-1l-by-10', { day: date });
}

/** Counts an in-app action for achievements, remembering distinct days and values. */
export async function bump(id: string, opts: { day?: DayKey; value?: string; by?: number } = {}) {
  await db.transaction('rw', db.counters, async () => {
    const cur = (await db.counters.get(id)) ?? { id, n: 0 };
    const days = opts.day && !cur.days?.includes(opts.day) ? [...(cur.days ?? []), opts.day] : cur.days;
    const values = opts.value && !cur.values?.includes(opts.value) ? [...(cur.values ?? []), opts.value] : cur.values;
    await db.counters.put({ ...cur, n: cur.n + (opts.by ?? 1), days, values, at: Date.now() });
  });
}

export async function setSteps(date: DayKey, steps: number, final = false) {
  await patchDay(date, { steps: Math.max(0, Math.round(steps)), stepsAt: Date.now(), ...(final ? { stepsFinal: true } : {}) });
  if (date === dayKey() && new Date().getHours() < 12 && steps > 9000) await bump('steps-9000-by-noon', { day: date });
}

export interface MorningInput {
  weightKg?: number;
  sleep?: Sleep;
  yesterdaySteps?: number;
  home?: string;
  answers?: Record<string, boolean>;
  seconds?: number;
}

export async function saveMorningLog(date: DayKey, input: MorningInput, yesterday: DayKey): Promise<{ newBest: boolean }> {
  let newBest = false;
  await db.transaction('rw', db.days, db.settings, async () => {
    const now = Date.now();
    const cur = (await db.days.get(date)) ?? { date };
    const morning = { at: cur.morning?.at ?? now, seconds: cur.morning?.seconds ?? input.seconds };
    await db.days.put({
      ...cur,
      date,
      ...(input.weightKg !== undefined ? { weightKg: input.weightKg, weighedAt: now } : {}),
      ...(input.sleep ? { sleep: input.sleep } : {}),
      ...(input.home ? { home: input.home } : {}),
      answers: { ...cur.answers, ...input.answers },
      morning,
    });
    if (input.yesterdaySteps !== undefined) {
      const y = (await db.days.get(yesterday)) ?? { date: yesterday };
      await db.days.put({ ...y, date: yesterday, steps: input.yesterdaySteps, stepsFinal: true, stepsAt: now });
    }
    // Only a first save of the day can set a speed record.
    if (!cur.morning && input.seconds !== undefined) {
      const s = await getSettings();
      if (s.morningBest === undefined || input.seconds < s.morningBest) {
        newBest = s.morningBest !== undefined;
        await db.settings.put({ ...s, morningBest: input.seconds });
      }
    }
  });
  return { newBest };
}

export async function setTick(date: DayKey, key: string, on: boolean) {
  await patchDay(date, (d) => {
    const ticks = { ...d.ticks };
    if (on) ticks[key] = Date.now();
    else delete ticks[key];
    return { ticks };
  });
}

export async function addEntry(e: Omit<FoodEntry, 'id'> & { id?: string }): Promise<FoodEntry> {
  const entry: FoodEntry = { ...e, id: e.id ?? uid() };
  await db.entries.put(entry);
  return entry;
}

export async function updateEntry(id: string, patch: Partial<FoodEntry>) {
  const before = await db.entries.get(id);
  await db.entries.update(id, patch);
  if (before) await recordEdit('entries', id, before, { ...before, ...patch });
}

export async function deleteEntry(id: string): Promise<FoodEntry | undefined> {
  const e = await db.entries.get(id);
  await db.entries.delete(id);
  if (e) await recordEdit('entries', id, e, undefined);
  return e;
}

export async function saveFood(f: Omit<Food, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<Food> {
  const food: Food = { ...f, id: f.id ?? uid(), createdAt: f.createdAt ?? Date.now() };
  await db.foods.put(food);
  return food;
}

export async function archiveFood(id: string, archived = true) {
  await db.foods.update(id, { archived });
}

export async function saveMeasurement(m: Omit<Measurement, 'id' | 'at'> & { id?: string }) {
  const rec: Measurement = { ...m, id: m.id ?? uid(), at: Date.now() };
  await db.measurements.put(rec);
  return rec;
}

export async function deleteMeasurement(id: string) {
  await db.measurements.delete(id);
}

export async function activeSession(): Promise<TrainingSession | undefined> {
  return db.sessions.where('status').equals('active').first();
}

export async function startSession(opts: {
  session: string;
  planName: string;
  exercises: string[];
  short: boolean;
  swaps: Swap[];
  tempo: Record<string, boolean>;
  readiness?: number;
}): Promise<TrainingSession> {
  const existing = await activeSession();
  if (existing) return existing;
  const s: TrainingSession = {
    id: uid(),
    date: dayKey(),
    session: opts.session,
    planName: opts.planName,
    startedAt: Date.now(),
    status: 'active',
    short: opts.short,
    exercises: opts.exercises,
    swapped: opts.swaps.length ? opts.swaps : undefined,
    tempo: opts.tempo,
    readiness: opts.readiness,
  };
  await db.sessions.put(s);
  return s;
}

export async function patchSession(id: string, patch: Partial<TrainingSession>) {
  await db.sessions.update(id, patch);
}

export async function logSet(set: Omit<SetEntry, 'id'> & { id?: string }): Promise<SetEntry> {
  const rec: SetEntry = { ...set, id: set.id ?? uid() };
  const before = set.id ? await db.sets.get(set.id) : undefined;
  await db.sets.put(rec);
  if (before) await recordEdit('sets', rec.id, before, rec);
  return rec;
}

export async function deleteSet(id: string) {
  const before = await db.sets.get(id);
  await db.sets.delete(id);
  if (before) await recordEdit('sets', id, before, undefined);
}

export async function finishSession(id: string, flags: string[], notes: string) {
  await db.sessions.update(id, { status: 'done', endedAt: Date.now(), flags, notes: notes.trim() || undefined });
}

/** Throws away a session and its sets. */
export async function discardSession(id: string) {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}
