import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { applyBridgeDayFiles } from '../src/db/bridgeApply';
import { db, HealthDB, setDatabase } from '../src/db/db';
import { deleteEntry, setSteps, updateEntry } from '../src/db/actions';
import type { FoodEntry } from '../src/domain/types';

let index = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`bridge-apply-${++index}`));
  await db.open();
});
afterEach(async () => { await db.delete(); });

const day = '2026-11-24';
const prev = '2026-11-23';
const ts = (time: string) => `${day}T${time}:00+05:30`;
const hours = (start: number, count: number) => ({ start: ts(`${String(start).padStart(2, '0')}:00`), end: ts(`${String(start + 1).padStart(2, '0')}:00`), source: 'Google Health', count });
const file = (kcal = 250, late = false) => JSON.stringify({
  schema: 1, date: day, readAt: ts(late ? '19:00' : '18:00'), status: { steps: 'ok', meals: 'ok', sleep: 'ok' },
  steps: [hours(2, 120), hours(4, 300), hours(10, late ? 600 : 500)],
  meals: [{ id: 'meal', at: ts('12:00'), source: 'Bevel', uuids: ['sample'], kcal, nutrients: { protein_g: 15 } }],
  sleep: [{ uuid: 'span', start: ts('01:00'), end: ts('05:00'), source: 'Google Health', stage: 'core' }],
});
const manual: FoodEntry = { id: 'manual', date: day, at: Date.parse(ts('12:05')), meal: 'lunch', kind: 'quick', name: 'Manual quick add', portion: '', kcal: 245, protein: 15 };

it('applies steps, sleep and meals once and protects edits and deletions', async () => {
  expect(await applyBridgeDayFiles([file()], 100)).toMatchObject({ steps: 1, sleep: 1, meals: 1 });
  expect(await db.days.get(day)).toMatchObject({ steps: 800, sleep: { asleep: 60, woke: 300 } });
  expect(await db.days.get(prev)).toBeUndefined();
  const entry = await db.entries.toCollection().first();
  expect(entry).toMatchObject({ name: 'Bevel entry', meal: 'lunch', protein: 15 });
  expect(entry!.eatenAt).toBeUndefined();
  expect(await applyBridgeDayFiles([file()], 200)).toMatchObject({ steps: 0, sleep: 0, meals: 0 });
  await setSteps(day, 100);
  await updateEntry(entry!.id, { name: 'My name', meal: 'dinner' });
  await applyBridgeDayFiles([file(275, true)], 300);
  expect((await db.days.get(day))?.steps).toBe(100);
  expect(await db.entries.get(entry!.id)).toMatchObject({ name: 'My name', meal: 'dinner', kcal: 275 });
  await deleteEntry(entry!.id);
  await applyBridgeDayFiles([file(275, true)], 400);
  expect(await db.entries.count()).toBe(0);
});

it('keeps manual zero, manual sleep, and a possible duplicate pending', async () => {
  await db.days.put({ date: day, steps: 0, sleep: { asleep: 5, woke: 505, rested: 4 }, foodDone: true });
  await db.entries.put(manual);
  expect(await applyBridgeDayFiles([file()], 100)).toMatchObject({ steps: 0, sleep: 0, meals: 0, pendingMeals: 1 });
  expect(await db.entries.toArray()).toEqual([manual]);
  expect(await db.days.get(day)).toEqual({ date: day, steps: 0, sleep: { asleep: 5, woke: 505, rested: 4 }, foodDone: true });
});

it('moves the after-midnight hours to the prior Health day without counting them twice', async () => {
  const beforeMidnight = { start: `${prev}T23:00:00+05:30`, end: ts('00:00'), count: 1000, source: 'Google Health' };
  const priorFile = JSON.stringify({
    schema: 1, date: prev, readAt: ts('01:00'), status: { steps: 'ok', meals: 'none', sleep: 'none' },
    steps: [beforeMidnight],
  });
  await applyBridgeDayFiles([priorFile], 100);
  expect((await db.days.get(prev))?.steps).toBe(1000);
  await applyBridgeDayFiles([priorFile, file()], 200);
  expect((await db.days.get(prev))?.steps).toBe(1120);
  expect((await db.days.get(day))?.steps).toBe(800);
  expect(await applyBridgeDayFiles([priorFile, file()], 300)).toMatchObject({ steps: 0, meals: 0, sleep: 0 });
});

it('reconciles a possible duplicate only after a decision and preserves the manual row', async () => {
  await db.entries.put(manual);
  await applyBridgeDayFiles([file()], 100);
  const [source] = await db.bridgeMeals.toArray();
  const { resolveBridgeMeal } = await import('../src/db/bridgeApply');
  await resolveBridgeMeal(source.id, 'keep-manual');
  expect(await applyBridgeDayFiles([file()], 200)).toMatchObject({ meals: 0, pendingMeals: 0 });
  await resolveBridgeMeal(source.id, 'include');
  expect(await db.entries.count()).toBe(2);
  expect(await db.entries.get(manual.id)).toEqual(manual);
});
