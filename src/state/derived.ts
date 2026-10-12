import { addDays, dayKey, weekStart, type DayKey } from '../domain/dates';
import { lowerFirst } from '../domain/format';
import { buildSession, findExercise, findSession, nextSessionId, type FlagDef, type PlanDef, type Swap } from '../domain/plan';
import { exerciseStatus, triggerMet, type ExerciseStatus } from '../domain/progression';
import { savedThisWeek } from '../domain/foods';
import { ringsFor, targetsOn, totalsFor, type Rings, type Totals } from '../domain/rings';
import { maintenanceKcal, stepStreakOf, trainingWeeksOf, withOccasion } from '../domain/occasions';
import type { Day, FoodEntry, SetEntry, Settings, Targets, TrainingSession } from '../domain/types';
import { isEased, placeFor } from '../domain/places';

export const FALLBACK_TARGETS: Targets = {
  kcalMin: 2000,
  kcalMax: 2400,
  proteinG: 120,
  steps: 10000,
  waterMl: 3000,
  sleepMin: 420,
  sessionsPerWeek: 3,
};

export function targetsFor(s: Settings, date: DayKey): Targets {
  return withOccasion(s, date, targetsOn(s.targets, date) ?? FALLBACK_TARGETS);
}

export function doneSessions(sessions: TrainingSession[]): TrainingSession[] {
  return sessions.filter((s) => s.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
}

interface FlagEvent {
  flag: FlagDef;
  at: number;
  date: DayKey;
}

/** Every time a joint flag was raised, after a session or in a morning log. */
export function flagEvents(plan: PlanDef | undefined, sessions: TrainingSession[], days: Day[]): FlagEvent[] {
  if (!plan) return [];
  const byId = new Map(plan.flags.map((f) => [f.id, f]));
  const out: FlagEvent[] = [];
  for (const s of sessions) {
    if (s.status !== 'done') continue;
    for (const id of s.flags ?? []) {
      const flag = byId.get(id);
      if (flag) out.push({ flag, at: s.endedAt ?? s.startedAt, date: s.date });
    }
  }
  for (const d of days) {
    for (const [id, yes] of Object.entries(d.answers ?? {})) {
      const flag = byId.get(id);
      if (flag && yes) out.push({ flag, at: d.morning?.at ?? 0, date: d.date });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** A flag's swap applies to the next session of its kind after the flag. */
export function pendingSwaps(plan: PlanDef | undefined, sessions: TrainingSession[], days: Day[]): (Swap & { flag: FlagDef; date: DayKey })[] {
  if (!plan) return [];
  const events = flagEvents(plan, sessions, days);
  const out: (Swap & { flag: FlagDef; date: DayKey })[] = [];
  const seen = new Set<string>();
  for (const ev of [...events].reverse()) {
    const sw = ev.flag.swap;
    if (!sw || seen.has(`${sw.from}>${sw.to}`)) continue;
    const since = sessions.some((s) => s.status === 'done' && s.session === sw.session && s.startedAt > ev.at);
    seen.add(`${sw.from}>${sw.to}`);
    if (!since) out.push({ from: sw.from, to: sw.to, reason: ev.flag.label, flag: ev.flag, date: ev.date });
  }
  return out;
}

/** Morning questions to ask today, such as swelling after yesterday's leg work. */
export function morningQuestions(plan: PlanDef | undefined, sessions: TrainingSession[], sets: SetEntry[], today: DayKey): FlagDef[] {
  if (!plan) return [];
  const yesterday = addDays(today, -1);
  const ySessions = new Set(sessions.filter((s) => s.status === 'done' && s.date === yesterday).map((s) => s.id));
  const yExercises = new Set(sets.filter((s) => ySessions.has(s.sessionId)).map((s) => s.exerciseId));
  return plan.flags.filter((f) => f.when === 'morning' && (!f.after?.length || f.after.some((id) => yExercises.has(id))));
}

/** Any flag raised in the last couple of days switches every voice to plain speech. */
export function recentFlag(plan: PlanDef | undefined, sessions: TrainingSession[], days: Day[], today: DayKey): FlagEvent | undefined {
  const events = flagEvents(plan, sessions, days).filter((e) => e.date >= addDays(today, -1));
  return events[events.length - 1];
}

export interface NextUp {
  sessionId: string;
  lastDone?: TrainingSession;
  swaps: (Swap & { flag: FlagDef; date: DayKey })[];
  exercises: { id: string; status: ExerciseStatus }[];
}

export function nextUp(settings: Settings, sessions: TrainingSession[], sets: SetEntry[], days: Day[], short = false): NextUp | undefined {
  const plan = settings.plan;
  if (!plan) return undefined;
  const done = doneSessions(sessions);
  const lastDone = done[done.length - 1];
  const sessionId = nextSessionId(plan, lastDone?.session);
  const swaps = pendingSwaps(plan, sessions, days).filter((s) => plan.flags.find((f) => f.id === s.flag.id)?.swap?.session === sessionId);
  const exs = buildSession(plan, sessionId, { short, swaps });
  return {
    sessionId,
    lastDone,
    swaps,
    exercises: exs.map((ex) => ({ id: ex.id, status: exerciseStatus(ex, settings.planState, settings.equipment, sets, plan.bigJump ?? 0.25) })),
  };
}

export function triggersMet(plan: PlanDef | undefined, sets: SetEntry[]) {
  return (plan?.triggers ?? []).filter((t) => triggerMet(t, sets) && findExercise(plan!, t.exercise));
}

export function dayRings(settings: Settings, date: DayKey, day: Day | undefined | null, entries: FoodEntry[]): { totals: Totals; rings: Rings; targets: Targets } {
  const base = targetsFor(settings, date);
  // A status lifts calories to maintenance; a place, status or night out eases the step goal.
  const targets = day?.status ? { ...base, kcalMax: Math.max(base.kcalMax, maintenanceKcal(settings, base)) } : base;
  const totals = { ...totalsFor(day ?? undefined, entries), eased: isEased(day ?? undefined, placeFor(day ?? undefined, settings)) };
  return { totals, rings: ringsFor(totals, targets), targets };
}

export function stepStreakFor(settings: Settings, days: Day[], today: DayKey) {
  return stepStreakOf(settings, days, today, FALLBACK_TARGETS.steps);
}

export function weeksFor(settings: Settings, sessions: TrainingSession[], today: DayKey, days: Day[] = []) {
  const perWeek = targetsFor(settings, today).sessionsPerWeek;
  return { ...trainingWeeksOf(settings, doneSessions(sessions).map((s) => s.date), perWeek, today, days), perWeek };
}

export interface Slot {
  key: string;
  itemId: string;
  name: string;
  slot: string;
}

export function checklistSlots(s: Settings): Slot[] {
  return s.checklist
    .filter((i) => i.active)
    .flatMap((i) => (i.slots.length ? i.slots : ['Daily']).map((slot, n) => ({ key: `${i.id}:${n}`, itemId: i.id, name: i.name, slot })));
}

/** Free meals used this week (Monday to Sunday). */
export function freeMealsThisWeek(entries: FoodEntry[], today: DayKey): number {
  const from = weekStart(today);
  const to = addDays(from, 6);
  return new Set(entries.filter((e) => e.kind === 'free' && e.date >= from && e.date <= to).map((e) => e.date)).size;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 23) return 'Good evening';
  return 'Good night';
}

export function isNightTime(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 23 || h < 4;
}

export const todayKey = () => dayKey();

/** "Your next Session B swaps split squat for goblet squat." */
export function swapSentence(plan: PlanDef | undefined, swap?: { from: string; to: string; session: string }): string | undefined {
  if (!swap || !plan) return undefined;
  const from = findExercise(plan, swap.from)?.name;
  const to = findExercise(plan, swap.to)?.name;
  const session = findSession(plan, swap.session)?.name ?? 'session';
  if (!from || !to) return undefined;
  return `Your next ${session} swaps ${lowerFirst(from)} for ${lowerFirst(to)}.`;
}

/** This week's calories saved for the free meal, when save-up is switched on. */
export function freeMealSaved(settings: Settings, entries: FoodEntry[], today: DayKey): number {
  const from = weekStart(today);
  const rows = [];
  for (let d = from; d < today; d = addDays(d, 1)) {
    const es = entries.filter((e) => e.date === d);
    const t = targetsFor(settings, d);
    rows.push({
      date: d,
      kcal: es.reduce((n, e) => n + e.kcal, 0),
      logged: es.length > 0,
      free: es.some((e) => e.kind === 'free'),
      kcalMin: t.kcalMin,
      kcalMax: t.kcalMax,
    });
  }
  return savedThisWeek(rows);
}
