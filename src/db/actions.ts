import { addDays, atOn, dayKey, type DayKey } from '../domain/dates';
import { eatenAtFor, mealTimesFor } from '../domain/foods';
import { placeFor } from '../domain/places';
import type { Swap } from '../domain/plan';
import type {
  Day,
  Food,
  FoodEntry,
  Measurement,
  SetEntry,
  Settings,
  Sleep,
  Status,
  TargetsRecord,
  Targets,
  TrainingSession,
} from '../domain/types';
import { db, uid } from './db';
import { recordEdit } from './edits';
import { logUsage } from './usage';
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
  void logUsage('log', 'steps');
  await patchDay(date, { steps: Math.max(0, Math.round(steps)), stepsAt: Date.now(), ...(final ? { stepsFinal: true } : {}) });
  if (date === dayKey() && new Date().getHours() < 12 && steps > 9000) await bump('steps-9000-by-noon', { day: date });
}

export interface MorningInput {
  weightKg?: number;
  sleep?: Sleep;
  yesterdaySteps?: number;
  /** Where the day starts. Also written to the v1 `home` so older readers follow. */
  place?: string;
  answers?: Record<string, boolean>;
  /** Readiness: energy 1–5, stomach settled, soreness by muscle. */
  energy?: number;
  stomach?: boolean;
  soreness?: Day['soreness'];
}

/** Saves the morning log. Only what was given is written; nothing is carried over silently. */
export async function saveMorningLog(date: DayKey, input: MorningInput, yesterday: DayKey): Promise<void> {
  void logUsage('log', 'morning');
  await db.transaction('rw', db.days, async () => {
    const now = Date.now();
    const cur = (await db.days.get(date)) ?? { date };
    await db.days.put({
      ...cur,
      date,
      ...(input.weightKg !== undefined ? { weightKg: input.weightKg, weighedAt: now } : {}),
      ...(input.sleep ? { sleep: input.sleep } : {}),
      ...(input.place ? { place: input.place, home: input.place } : {}),
      ...(input.energy !== undefined ? { energy: input.energy } : {}),
      ...(input.stomach !== undefined ? { stomach: input.stomach } : {}),
      ...(input.soreness ? { soreness: input.soreness } : {}),
      answers: { ...cur.answers, ...input.answers },
      morning: { at: cur.morning?.at ?? now },
    });
    if (input.yesterdaySteps !== undefined) {
      const y = (await db.days.get(yesterday)) ?? { date: yesterday };
      await db.days.put({ ...y, date: yesterday, steps: input.yesterdaySteps, stepsFinal: true, stepsAt: now });
    }
  });
}

/** Ticks or unticks a checklist slot. A tick clears "missed"; `at` records when it was really taken. */
export async function setTick(date: DayKey, key: string, on: boolean, at = Date.now()) {
  void logUsage('tick', key);
  await patchDay(date, (d) => {
    const ticks = { ...d.ticks };
    const missed = { ...d.missed };
    if (on) {
      ticks[key] = at;
      delete missed[key];
    } else delete ticks[key];
    return { ticks, missed };
  });
}

/** Marks a slot as missed, which also clears its tick. */
export async function setMissed(date: DayKey, key: string, on: boolean) {
  await patchDay(date, (d) => {
    const ticks = { ...d.ticks };
    const missed: Record<string, true> = { ...d.missed };
    if (on) {
      missed[key] = true;
      delete ticks[key];
    } else delete missed[key];
    return { ticks, missed };
  });
}

/** When an entry was eaten, from the day's place at the time it was logged. */
async function plannedEatenAt(date: DayKey, meal: FoodEntry['meal'], at: number, live: boolean): Promise<number> {
  const [day, settings] = await Promise.all([db.days.get(date), getSettings()]);
  const place = placeFor(day, settings, at);
  return live ? eatenAtFor(date, meal, place, settings, at) : atOn(date, mealTimesFor(settings, place)[meal]);
}

/** Adds an entry. Without an eatenAt, it is worked out from the day's place and the meal. */
export async function addEntry(e: Omit<FoodEntry, 'id'> & { id?: string }): Promise<FoodEntry> {
  const eatenAt = e.eatenAt ?? (await plannedEatenAt(e.date, e.meal, e.at, true));
  const entry: FoodEntry = { ...e, id: e.id ?? uid(), eatenAt };
  await db.entries.put(entry);
  void logUsage('log', 'food');
  return entry;
}

/** Adds a plate of entries at once. Entries for the same day and meal share one eaten-at time. */
export async function addEntries(batch: (Omit<FoodEntry, 'id'> & { id?: string })[]): Promise<FoodEntry[]> {
  const times = new Map<string, number>();
  const out: FoodEntry[] = [];
  for (const e of batch) {
    const k = `${e.date}|${e.meal}`;
    if (!times.has(k)) times.set(k, e.eatenAt ?? (await plannedEatenAt(e.date, e.meal, e.at, true)));
    out.push({ ...e, id: e.id ?? uid(), eatenAt: times.get(k)! });
  }
  await db.entries.bulkPut(out);
  void logUsage('log', 'food');
  return out;
}

/** Updates an entry. Moving it to another meal moves its eaten-at time to that meal's time. */
export async function updateEntry(id: string, patch: Partial<FoodEntry>) {
  const before = await db.entries.get(id);
  const full = { ...patch };
  if (before && patch.meal && patch.meal !== before.meal && patch.eatenAt === undefined) {
    full.eatenAt = await plannedEatenAt(patch.date ?? before.date, patch.meal, before.at, false);
  }
  await db.entries.update(id, full);
  if (before) await recordEdit('entries', id, before, { ...before, ...full });
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
  readinessX?: Partial<Record<string, number>>;
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
    readinessX: opts.readinessX,
  };
  await db.sessions.put(s);
  return s;
}

export async function patchSession(id: string, patch: Partial<TrainingSession>) {
  await db.sessions.update(id, patch);
}

export async function logSet(set: Omit<SetEntry, 'id'> & { id?: string }): Promise<SetEntry> {
  void logUsage('log', 'set');
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

export async function finishSession(id: string, flags: string[], notes: string, quality?: number) {
  await db.sessions.update(id, { status: 'done', endedAt: Date.now(), flags, notes: notes.trim() || undefined, ...(quality !== undefined ? { quality } : {}) });
}

/** Throws away a session and its sets. */
export async function discardSession(id: string) {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}

/** Moves an entry to another meal; its eaten-at time moves to that meal's time. */
export async function moveEntry(id: string, meal: FoodEntry['meal']) {
  await updateEntry(id, { meal });
}

/** Marks a day's food complete (or not). Works for any date. */
export async function closeDay(date: DayKey, done: boolean) {
  await patchDay(date, { foodDone: done });
}

/** Puts a status on every day from..to, or takes it off when status is undefined. */
export async function setStatusRange(from: DayKey, to: DayKey, status: Status | undefined) {
  await db.transaction('rw', db.days, async () => {
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const cur = (await db.days.get(d)) ?? { date: d };
      const next = { ...cur, date: d };
      if (status) next.status = status;
      else delete next.status;
      await db.days.put(next);
    }
  });
}

/** Before noon, or on a day with no place yet, sets where the day is; later it records a mid-day change. */
export async function changePlace(date: DayKey, place: string, at = Date.now()) {
  await patchDay(date, (d) => {
    if (!d.place || new Date(at).getHours() < 12) return { place, home: place, placeChanges: undefined };
    return { placeChanges: [...(d.placeChanges ?? []), { at, place }] };
  });
}
