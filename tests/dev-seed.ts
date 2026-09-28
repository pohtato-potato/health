/**
 * A made-up world for trying the app in a browser during development.
 * In the dev server's console: (await import('/tests/dev-seed.ts')).seed()
 * Every number here is invented; none belongs to anyone.
 */
import { addDays, dayKey, dayRange } from '../src/domain/dates';
import type { Day, Food, FoodEntry, Measurement, SetEntry, Settings, TrainingSession } from '../src/domain/types';
import { defaultSettings } from '../src/db/actions';
import Dexie from 'dexie';
import { db as appDb, HealthDB, uid } from '../src/db/db';
import { EQ, PLAN } from './fixtures';

export async function seed(opts: { days?: number; perfectToday?: boolean; waistCross?: boolean } = {}) {
  const today = dayKey();
  const n = opts.days ?? 7;
  // Close the running app's database first, so it can't react to the data half-written.
  appDb.close();
  await Dexie.delete('health');
  const db = new HealthDB();
  await db.open();

  const settings: Settings = {
    ...defaultSettings(),
    setupDone: true,
    name: 'Alex',
    heightCm: 178,
    voice: 'gremlin',
    targets: [{ from: addDays(today, -60), targets: { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 4 } }],
    checklist: [{ id: 'vit-d', name: 'Vitamin D', slots: ['Morning'], active: true }],
    homes: [
      { id: 'home-1', name: 'Flat' },
      { id: 'home-2', name: 'Family home' },
    ],
    equipment: EQ,
    plan: {
      ...PLAN,
      phases: [
        { from: addDays(today, -n), to: addDays(today, 30), title: 'The early climb', text: 'Lifts go up fast while the habits settle in.' },
        { from: addDays(today, 31), to: addDays(today, 150), title: 'The long middle', text: 'Progress slows down; this is where consistency pays.' },
      ],
    },
    goalDate: addDays(today, 240),
    loopSteps: 30,
    backup: { nudgeDays: 2, lastQuick: Date.now() },
    createdAt: Date.parse(addDays(today, -n)),
  };
  await db.settings.put(settings);

  const days: Day[] = dayRange(addDays(today, -n), today).map((d, i) => ({
    date: d,
    steps: d === today ? 10400 : 11000 + ((i * 1733) % 4000),
    stepsFinal: d !== today,
    weightKg: 80 - i * 0.05,
    waterMl: 2500,
    sleep: { asleep: 30 + (i % 3) * 15, woke: 450, rested: 3 + (i % 3) },
    home: 'home-1',
    morning: { at: Date.parse(`${d}T07:50:00`), seconds: 14 + (i % 5) },
  }));
  await db.days.bulkPut(days);

  const foods: Food[] = [
    { id: 'f-chicken', name: 'Chicken breast', note: 'cooked', unit: 'g', per: 100, kcal: 165, protein: 31, defaultAmount: 150, presets: [100, 150, 200], createdAt: 0 },
    { id: 'f-dal', name: 'Dal and rice', unit: 'serving', servingDesc: '1 katori each', per: 1, kcal: 420, protein: 14, defaultAmount: 1, createdAt: 0 },
    { id: 'f-shake', name: 'Protein shake', unit: 'piece', unitName: 'bottle', per: 1, kcal: 160, protein: 25, defaultAmount: 1, createdAt: 0 },
    { id: 'f-eggs', name: 'Eggs, boiled', unit: 'piece', unitName: 'egg', per: 1, kcal: 78, protein: 6.5, defaultAmount: 3, createdAt: 0 },
  ];
  await db.foods.bulkPut(foods);

  const entries: FoodEntry[] = [];
  for (const d of dayRange(addDays(today, -n), today)) {
    const full = d !== today || opts.perfectToday;
    const items: [Food, number, FoodEntry['meal']][] = [
      [foods[3], 3, 'breakfast'],
      [foods[0], 250, 'lunch'],
      [foods[1], 1, 'lunch'],
      [foods[2], 1, 'snacks'],
      ...(full ? ([[foods[0], 200, 'dinner'], [foods[1], 1, 'dinner'], [foods[2], 1, 'dinner']] as [Food, number, FoodEntry['meal']][]) : []),
    ];
    for (const [f, amount, meal] of items) {
      const k = amount / f.per;
      entries.push({ id: uid(), date: d, meal, at: Date.parse(`${d}T${meal === 'breakfast' ? '09' : meal === 'lunch' ? '13' : meal === 'snacks' ? '17' : '21'}:00:00`), kind: 'food', foodId: f.id, name: f.name, amount, portion: `${amount}`, kcal: Math.round(f.kcal * k), protein: Math.round(f.protein * k * 10) / 10 });
    }
  }
  await db.entries.bulkPut(entries);

  const sessions: TrainingSession[] = [];
  const sets: SetEntry[] = [];
  dayRange(addDays(today, -n), addDays(today, -1)).forEach((d, i) => {
    if (i % 2) return;
    const id = uid();
    const kind = i % 4 === 0 ? 'A' : 'B';
    sessions.push({ id, date: d, session: kind, planName: PLAN.name, startedAt: Date.parse(`${d}T18:30:00`), endedAt: Date.parse(`${d}T19:25:00`), status: 'done', short: false, exercises: [] });
    const ex = kind === 'A' ? 'row' : 'press';
    for (let s = 1; s <= 3; s++) {
      for (const side of kind === 'A' ? (['L', 'R'] as const) : (['both'] as const)) {
        sets.push({ id: uid(), sessionId: id, date: d, session: kind, exerciseId: ex, exercise: kind === 'A' ? 'Row' : 'Press', setNo: s, side, loadKg: 10, reps: 11 + (i % 3), at: Date.parse(`${d}T18:${30 + s * 4}:00`) });
      }
    }
  });
  await db.sessions.bulkPut(sessions);
  await db.sets.bulkPut(sets);

  const ms: Measurement[] = [
    { id: uid(), date: addDays(today, -40), at: 1, waistStanding: 40, waistSlouched: 41.5 },
    { id: uid(), date: addDays(today, -12), at: 2, waistStanding: 38.4, waistSlouched: 40 },
    ...(opts.waistCross ? [{ id: uid(), date: addDays(today, -1), at: 3, waistStanding: 37.8, waistSlouched: 39.4 }] : []),
  ];
  await db.measurements.bulkPut(ms);
  location.reload();
}
