import { addDays, type DayKey } from '../domain/dates';
import { DEFAULT_MEAL_TIMES, MEALS, type Day, type FoodEntry } from '../domain/types';
import { decodeBridgeStream, timestamp } from '../sources/bridgeFile';
import { importBridgeDayFiles } from './bridgeDayFiles';
import { readBridgeMeals, type CachedBridgeMeal } from './bridgeMeals';
import { readBridgeSleepNight } from './bridgeSleep';
import { readBridgeStepDay } from './bridgeSteps';
import { db } from './db';

export interface BridgeMealReview {
  id: string;
  date: DayKey;
  loggedAt: string;
  kcal: number;
  manualName: string;
}

function matchingManual(meal: CachedBridgeMeal, kcal: number, entries: FoodEntry[]) {
  const loggedAt = Date.parse(meal.loggedAt);
  return entries.find((entry) => !entry.bridgeMealId && entry.kind !== 'drink' &&
    Math.abs(entry.kcal - kcal) <= Math.max(35, kcal * 0.15) &&
    [entry.at, entry.eatenAt].some((at) => at !== undefined && Math.abs(at - loggedAt) <= 90 * 60_000));
}

async function applyMeals(date: DayKey, pending: BridgeMealReview[], write = true) {
  const entries = await db.entries.where('date').equals(date).toArray();
  let changed = 0;
  for (const meal of await readBridgeMeals(date)) {
    if (meal.source.toLowerCase() !== 'bevel' || meal.kcal === undefined) continue;
    const id = `bridge-meal:${meal.id}`;
    const prior = await db.entries.get(id);
    if (prior && prior.bridgeMealId !== meal.id) continue;
    if (!prior && meal.details?.decision === 'keep-manual') continue;
    if (!prior && meal.details?.decision !== 'include') {
      const duplicate = matchingManual(meal, meal.kcal, entries);
      if (duplicate) {
        pending.push({ id: meal.id, date, loggedAt: meal.loggedAt, kcal: meal.kcal, manualName: duplicate.name });
        continue;
      }
    }
    if (!write || prior?.own) continue;
    const at = timestamp(meal.loggedAt)!;
    const bucket = MEALS.reduce((best, key) =>
      Math.abs(DEFAULT_MEAL_TIMES.home[key] - at.minute) < Math.abs(DEFAULT_MEAL_TIMES.home[best] - at.minute) ? key : best);
    const protein = meal.nutrients.protein_g;
    const values = { kcal: meal.kcal, protein: protein ?? 0, proteinUnknown: protein === undefined || undefined };
    if (prior) {
      if (prior.kcal === values.kcal && prior.protein === values.protein && prior.proteinUnknown === values.proteinUnknown) continue;
      await db.entries.put({ ...prior, ...values });
    } else {
      await db.entries.add({
        id, date, kind: 'bevel', bridgeMealId: meal.id, at: at.at,
        name: meal.details?.name ?? 'Bevel entry', portion: 'Bevel · logged time',
        meal: meal.details?.meal ?? bucket, eatenAt: meal.details?.eatenAt, ...values,
      });
    }
    changed++;
  }
  return changed;
}

export async function reviewBridgeMeals() {
  const pending: BridgeMealReview[] = [];
  for (const date of await db.bridgeMeals.orderBy('day').uniqueKeys()) await applyMeals(date as DayKey, pending, false);
  return pending;
}

export async function resolveBridgeMeal(id: string, decision: 'keep-manual' | 'include') {
  await db.transaction('rw', db.bridgeMeals, db.entries, async () => {
    const meal = await db.bridgeMeals.get(id);
    if (!meal) return;
    await db.bridgeMeals.update(id, { details: { ...meal.details, decision } });
    await applyMeals(meal.day, []);
  });
}

export async function applyBridgeDayFiles(files: readonly string[], importedAt = Date.now()) {
  const fileDays = new Set(files.map((file) => decodeBridgeStream(file, 'steps').date));
  const dates = new Set([...fileDays].flatMap((date) => [addDays(date, -1), date, addDays(date, 1)]));
  return db.transaction('rw', [
    db.days, db.entries, db.bridgeStepReads, db.bridgeStepHours, db.bridgeMeals, db.bridgeMealReads,
    db.bridgeSleepSpans, db.bridgeSleepReads,
  ], async () => {
    await importBridgeDayFiles(files, importedAt);
    const result = { steps: 0, sleep: 0, meals: 0, pendingMeals: 0 };
    const pending: BridgeMealReview[] = [];
    for (const date of [...dates].sort()) {
      const day = (await db.days.get(date)) ?? { date };
      const next: Partial<Day> = {};
      if (!day.stepsFinal && (day.bridgeSteps || (day.steps === undefined && day.bridgeSteps !== false))) {
        // An adjacent file can extend a known Health day. Its early hours alone don't establish a day total.
        const source = await db.bridgeStepReads.get(date);
        const step = source && await readBridgeStepDay(date);
        if (step && (day.steps !== Math.round(step.count) || !day.bridgeSteps || day.bridgeSteps.through !== step.latestBucketEnd || day.stepsAt !== step.observedThrough)) {
          next.steps = Math.round(step.count);
          next.stepsAt = step.observedThrough;
          next.bridgeSteps = { through: step.latestBucketEnd, importedAt: step.importedAt };
          result.steps++;
        }
      }
      if (day.bridgeSleep || (!day.sleep && day.bridgeSleep !== false)) {
        const sleep = (await readBridgeSleepNight(date))?.main;
        if (sleep && (!day.bridgeSleep || sleep.asleepAt !== day.bridgeSleep.asleepAt || sleep.wokeAt !== day.bridgeSleep.wokeAt ||
          sleep.asleepMinutes !== day.bridgeSleep.asleepMinutes || sleep.source !== day.bridgeSleep.source)) {
          next.sleep = { ...day.sleep, asleep: timestamp(sleep.asleepAt)!.minute, woke: timestamp(sleep.wokeAt)!.minute };
          next.bridgeSleep = sleep;
          result.sleep++;
        }
      }
      if (Object.keys(next).length) await db.days.put({ ...day, ...next });
      result.meals += await applyMeals(date, pending);
    }
    result.pendingMeals = pending.length;
    return result;
  });
}
