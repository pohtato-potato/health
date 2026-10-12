import { parseDay, type DayKey } from './dates';
import { MEALS, type Day, type FoodEntry, type Meal, type Targets, type TrainingSession } from './types';

/** A suggested entry for a draft day; nothing is saved until the owner confirms it. */
export interface DraftEntry {
  meal: Meal;
  kind: FoodEntry['kind'];
  foodId?: string;
  name: string;
  amount?: number;
  portion: string;
  kcal: number;
  protein: number;
}

/** How many matching days a usual day is drawn from. */
export const USUAL_DAY_SAMPLE = 6;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * A typical day for this place and weekday: from the last six such days with food logged,
 * every food eaten on more than half of them, at its median amount.
 */
export function usualDay(place: string, weekday: number, days: Map<DayKey, Pick<Day, 'place' | 'home'>>, entries: FoodEntry[], before: DayKey): DraftEntry[] {
  const logged = new Set(entries.map((e) => e.date));
  const matching = [...days.entries()]
    .filter(([d, day]) => d < before && (day.place ?? day.home) === place && parseDay(d).getDay() === weekday && logged.has(d))
    .map(([d]) => d)
    .sort()
    .slice(-USUAL_DAY_SAMPLE);
  if (!matching.length) return [];
  const pick = new Set(matching);
  const groups = new Map<string, FoodEntry[]>();
  for (const e of entries) {
    if (!pick.has(e.date) || e.kind === 'free') continue;
    const k = `${e.meal}|${e.foodId ?? e.name}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const out: (DraftEntry & { seen: number })[] = [];
  for (const es of groups.values()) {
    const seen = new Set(es.map((e) => e.date)).size;
    if (seen * 2 <= matching.length) continue;
    const last = es[es.length - 1];
    const amounts = es.map((e) => e.amount).filter((a): a is number => a !== undefined);
    out.push({
      meal: last.meal,
      kind: last.kind,
      foodId: last.foodId,
      name: last.name,
      amount: amounts.length ? median(amounts) : undefined,
      portion: last.portion,
      kcal: Math.round(median(es.map((e) => e.kcal))),
      protein: Math.round(median(es.map((e) => e.protein)) * 10) / 10,
      seen,
    });
  }
  return out.sort((a, b) => MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal) || b.seen - a.seen).map(({ seen: _seen, ...d }) => d);
}

export interface DaySummary {
  kcal: number;
  protein: number;
  kcalInRange: boolean;
  proteinClosed: boolean;
  steps?: number;
  stepsLeft?: number;
  checklist: { done: number; total: number };
  trained: boolean;
}

/** The day's totals against its targets, for the day-closed screen. */
export function daySummary(day: Pick<Day, 'steps' | 'ticks'> | undefined, entries: Pick<FoodEntry, 'kcal' | 'protein'>[], sessions: Pick<TrainingSession, 'status'>[], targets: Targets, checklistTotal: number): DaySummary {
  const kcal = Math.round(entries.reduce((n, e) => n + e.kcal, 0));
  const protein = Math.round(entries.reduce((n, e) => n + e.protein, 0));
  return {
    kcal,
    protein,
    kcalInRange: kcal >= targets.kcalMin && kcal <= targets.kcalMax,
    proteinClosed: protein >= targets.proteinG,
    steps: day?.steps,
    stepsLeft: day?.steps === undefined ? undefined : Math.max(0, targets.steps - day.steps),
    checklist: { done: Math.min(checklistTotal, Object.keys(day?.ticks ?? {}).length), total: checklistTotal },
    trained: sessions.some((s) => s.status === 'done'),
  };
}
