import { addDays, dayRange, weekStart, type DayKey, dayOfLogging } from '../domain/dates';
import { fmtTime } from '../domain/format';
import { findExercise, targetText } from '../domain/plan';
import { ringsFor, sleepMinutes, targetsOn, totalsFor } from '../domain/rings';
import { weightTrend } from '../domain/streaks';
import { stepStreakOf, targetsAt, trainingWeeksOf } from '../domain/occasions';
import type { Day, Food, FoodEntry, Measurement, SetEntry, Settings, TrackValue, TrainingSession } from '../domain/types';
import { kmFromSteps, positionAt } from '../domain/walk';
import type { Cell, Sheet } from './xlsx';
import { slotStatus } from '../domain/checklist';
import { entryTime } from '../domain/foods';
import { dayFoodLabel } from '../domain/logged';
import { checklistSlots } from '../state/derived';

export interface ExportData {
  settings: Settings;
  days: Day[];
  foods: Food[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  measurements: Measurement[];
  trackValues?: TrackValue[];
}

const r1 = (n: number | undefined | null) => (n === undefined || n === null ? null : Math.round(n * 10) / 10);
const r2 = (n: number | undefined | null) => (n === undefined || n === null ? null : Math.round(n * 100) / 100);

/** Every log as its own sheet, one row per day, entry or set, for Claude or a spreadsheet. */
export function workbookSheets(d: ExportData, now = new Date()): Sheet[] {
  const today = dayOfLogging(now.getTime());
  const s = d.settings;
  const done = d.sessions.filter((x) => x.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
  const byDay = new Map(d.days.map((x) => [x.date, x]));
  const entriesByDay = new Map<DayKey, FoodEntry[]>();
  for (const e of d.entries) entriesByDay.set(e.date, [...(entriesByDay.get(e.date) ?? []), e]);
  const weighIns = d.days.filter((x) => x.weightKg !== undefined).map((x) => ({ date: x.date, kg: x.weightKg! }));
  const trend = new Map(weightTrend(weighIns).map((p) => [p.date, p.trend]));
  const allDates = [...new Set([...d.days.map((x) => x.date), ...d.entries.map((e) => e.date), ...done.map((x) => x.date)])].sort();
  const first = allDates[0];
  const dates = first ? dayRange(first, today > allDates[allDates.length - 1] ? today : allDates[allDates.length - 1]) : [];
  const slots = s.checklist.filter((i) => i.active).flatMap((i) => (i.slots.length ? i.slots : ['Daily']).map((_, n) => `${i.id}:${n}`));
  const plan = s.plan;

  // Daily
  const daily: Cell[][] = [
    [
      'date',
      'weight_kg',
      'trend_kg',
      'steps',
      'steps_final',
      'water_ml',
      'asleep',
      'woke',
      'sleep_hours',
      'rested_1_5',
      'kcal',
      'protein_g',
      'kcal_min',
      'kcal_max',
      'protein_target_g',
      'steps_target',
      'rings_closed',
      'perfect_day',
      'free_meal',
      'drinks',
      'trained',
      'checklist_done',
      'checklist_total',
      'home',
      'morning_log_seconds',
      'food_status',
    ],
  ];
  for (const date of dates) {
    const day = byDay.get(date);
    const es = entriesByDay.get(date) ?? [];
    const t = targetsAt(s, date);
    const totals = totalsFor(day, es);
    const rings = t ? ringsFor(totals, t) : undefined;
    const sleepMin = day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : undefined;
    const ticks = slots.filter((k) => day?.ticks?.[k]).length;
    daily.push([
      date,
      r1(day?.weightKg),
      r2(trend.get(date)),
      day?.steps ?? null,
      day?.steps !== undefined ? !!day.stepsFinal : null,
      day?.waterMl ?? null,
      day?.sleep ? clock(day.sleep.asleep) : null,
      day?.sleep ? clock(day.sleep.woke) : null,
      sleepMin !== undefined ? r2(sleepMin / 60) : null,
      day?.sleep?.rested ?? null,
      es.length ? Math.round(totals.kcal) : null,
      es.length ? r1(totals.protein) : null,
      t?.kcalMin ?? null,
      t?.kcalMax ?? null,
      t?.proteinG ?? null,
      t?.steps ?? null,
      rings?.closed ?? null,
      rings?.perfect ?? null,
      totals.freeMeal || null,
      es.filter((e) => e.kind === 'drink').reduce((n, e) => n + (e.drink?.count ?? 1), 0) || null,
      done.some((x) => x.date === date) || null,
      slots.length ? ticks : null,
      slots.length || null,
      s.homes.find((h) => h.id === day?.home)?.name ?? null,
      day?.morning?.seconds ?? null,
      dayFoodLabel(day, es.length).replace('-', ' '),
    ]);
  }

  // Food log
  const food: Cell[][] = [['date', 'time', 'meal', 'kind', 'food', 'portion', 'kcal', 'protein_g']];
  for (const e of [...d.entries].sort((a, b) => a.date.localeCompare(b.date) || entryTime(a) - entryTime(b))) {
    food.push([e.date, fmtTime(entryTime(e)), e.meal, e.kind, e.name, e.portion, Math.round(e.kcal), r1(e.protein)]);
  }

  // My foods
  const foods: Cell[][] = [['food', 'measured_in', 'values_per', 'kcal', 'protein_g', 'usual_amount', 'serving_or_piece', 'note', 'home', 'archived']];
  for (const f of [...d.foods].sort((a, b) => a.name.localeCompare(b.name))) {
    foods.push([
      f.name,
      f.unit,
      f.per,
      f.kcal,
      f.protein,
      f.defaultAmount,
      f.servingDesc ?? f.unitName ?? null,
      f.note ?? null,
      s.homes.find((h) => h.id === f.home)?.name ?? null,
      !!f.archived,
    ]);
  }

  // Sets: the plan's own schema, plus a few extras at the end.
  const setsSheet: Cell[][] = [['date', 'session', 'exercise', 'set', 'side', 'load_kg', 'reps', 'seconds', 'notes', 'tempo_3s', 'drop_set', 'mark', 'exercise_id']];
  const doneIds = new Set(done.map((x) => x.id));
  for (const x of [...d.sets].filter((x) => doneIds.has(x.sessionId)).sort((a, b) => a.at - b.at)) {
    setsSheet.push([x.date, x.session, x.exercise, x.setNo, x.side, x.loadKg, x.reps ?? null, x.seconds ?? null, x.band ?? null, !!x.tempo, !!x.drop, x.mark ?? null, x.exerciseId]);
  }

  // Sessions
  const sessions: Cell[][] = [['date', 'session', 'start', 'end', 'minutes', 'short', 'sets', 'reps', 'kg_moved', 'records', 'joint_flags', 'swaps', 'notes']];
  for (const x of done) {
    const mine = d.sets.filter((y) => y.sessionId === x.id);
    const kg = mine.reduce((n, y) => n + (y.loadKg ?? 0) * (y.reps ?? 0) * (plan && findExercise(plan, y.exerciseId)?.load === 'pair' ? 2 : 1), 0);
    sessions.push([
      x.date,
      x.session,
      fmtTime(x.startedAt),
      x.endedAt ? fmtTime(x.endedAt) : null,
      x.endedAt ? Math.round((x.endedAt - x.startedAt) / 60000) : null,
      x.short,
      mine.filter((y) => !y.drop).length,
      mine.reduce((n, y) => n + (y.reps ?? 0), 0),
      Math.round(kg),
      new Set(mine.filter((y) => y.mark === '!!').map((y) => y.exerciseId)).size,
      (x.flags ?? []).map((id) => plan?.flags.find((f) => f.id === id)?.label ?? id).join('; ') || null,
      (x.swapped ?? []).map((w) => `${w.from} → ${w.to ?? 'skipped'} (${w.reason})`).join('; ') || null,
      x.notes ?? null,
    ]);
  }

  // Weekly
  const weekly: Cell[][] = [['week_start', 'avg_weight_kg', 'trend_kg_end', 'avg_steps', 'avg_kcal', 'avg_protein_g', 'avg_sleep_hours', 'sessions', 'perfect_days', 'days_logged']];
  if (dates.length) {
    for (let w = weekStart(dates[0]); w <= today; w = addDays(w, 7)) {
      const ds = dayRange(w, addDays(w, 6)).filter((x) => x <= today);
      const avg = (xs: (number | undefined | null)[]) => {
        const v = xs.filter((x): x is number => x !== undefined && x !== null);
        return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
      };
      const rows = daily.slice(1).filter((row) => ds.includes(row[0] as string));
      const lastTrend = [...ds].reverse().map((x) => trend.get(x)).find((v) => v !== undefined);
      weekly.push([
        w,
        r2(avg(ds.map((x) => byDay.get(x)?.weightKg))),
        r2(lastTrend),
        avg(ds.map((x) => byDay.get(x)?.steps)) !== null ? Math.round(avg(ds.map((x) => byDay.get(x)?.steps))!) : null,
        avg(rows.map((row) => row[10] as number | null)) !== null ? Math.round(avg(rows.map((row) => row[10] as number | null))!) : null,
        r1(avg(rows.map((row) => row[11] as number | null))),
        r2(avg(rows.map((row) => row[8] as number | null))),
        done.filter((x) => x.date >= w && x.date <= addDays(w, 6)).length,
        rows.filter((row) => row[17] === true).length,
        rows.filter((row) => row.slice(1, 12).some((v) => v !== null)).length,
      ]);
    }
  }

  // Measurements
  const heightIn = s.heightCm ? s.heightCm / 2.54 : undefined;
  const measures: Cell[][] = [['date', 'waist_standing_in', 'waist_slouched_in', 'shoulders_in', 'shoulder_to_waist', 'waist_to_height', 'note']];
  let lastShoulders: number | undefined;
  for (const m of [...d.measurements].sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at)) {
    if (m.shoulders !== undefined) lastShoulders = m.shoulders;
    measures.push([
      m.date,
      m.waistStanding ?? null,
      m.waistSlouched ?? null,
      m.shoulders ?? null,
      lastShoulders && m.waistStanding ? r2(lastShoulders / m.waistStanding) : null,
      heightIn && m.waistStanding ? Math.round((m.waistStanding / heightIn) * 1000) / 1000 : null,
      m.note ?? null,
    ]);
  }

  // Records: the best set for each exercise, heaviest first, then most reps.
  const records: Cell[][] = [['exercise', 'best_load_kg', 'best_reps_or_seconds', 'side', 'date', 'sessions_done', 'first_date']];
  const byEx = new Map<string, SetEntry[]>();
  for (const x of d.sets) if (doneIds.has(x.sessionId) && !x.drop) byEx.set(x.exercise, [...(byEx.get(x.exercise) ?? []), x]);
  for (const [name, xs] of [...byEx.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const best = [...xs].sort((a, b) => (b.loadKg ?? 0) - (a.loadKg ?? 0) || (b.reps ?? b.seconds ?? 0) - (a.reps ?? a.seconds ?? 0))[0];
    const dates2 = xs.map((x) => x.date).sort();
    records.push([name, best.loadKg, best.reps ?? best.seconds ?? null, best.side, best.date, new Set(xs.map((x) => x.sessionId)).size, dates2[0]]);
  }

  // Targets history
  const targets: Cell[][] = [['from', 'kcal_min', 'kcal_max', 'protein_g', 'steps', 'water_ml', 'sleep_hours', 'sessions_per_week']];
  for (const t of s.targets) targets.push([t.from, t.targets.kcalMin, t.targets.kcalMax, t.targets.proteinG, t.targets.steps, t.targets.waterMl, r2(t.targets.sleepMin / 60), t.targets.sessionsPerWeek]);

  // Plan
  const planRows: Cell[][] = [['session', 'order', 'exercise', 'target', 'load', 'start_kg', 'rest_seconds', 'notes']];
  if (plan) {
    for (const sess of plan.sessions) {
      for (const ex of sess.exercises) {
        planRows.push([sess.name, ex.order, ex.name, targetText(ex), ex.load === 'single' ? 'one dumbbell' : ex.load === 'pair' ? 'pair, per dumbbell' : ex.load, ex.startKg ?? null, ex.restSec ?? null, ex.note ?? null]);
      }
    }
  }

  // Summary
  const stepsMap = new Map(d.days.filter((x) => x.steps !== undefined).map((x) => [x.date, x.steps!]));
  const t = targetsOn(s.targets, today);
  const streak = t ? stepStreakOf(s, d.days, today, t.steps) : undefined;
  const weeks = t ? trainingWeeksOf(s, done.map((x) => x.date), t.sessionsPerWeek, today) : undefined;
  const last7 = daily.slice(1).filter((row) => (row[0] as string) > addDays(today, -7));
  const avg7 = (i: number) => {
    const v = last7.map((row) => row[i]).filter((x): x is number => typeof x === 'number');
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const km = kmFromSteps([...stepsMap.values()].reduce((a, b) => a + b, 0));
  const pos = positionAt(km);
  const latestTrend = weightTrend(weighIns).pop();
  const lastWaist = [...d.measurements].reverse().find((m) => m.waistStanding !== undefined);
  const summary: Cell[][] = [
    ['measure', 'value', 'note'],
    ['exported', `${today} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, 'Phone time'],
    ['first day logged', first ?? null, null],
    ['weight trend, kg', r2(latestTrend?.trend), latestTrend ? `Smoothed; last weigh-in ${latestTrend.kg} kg on ${latestTrend.date}` : null],
    ['waist standing, in', lastWaist?.waistStanding ?? null, lastWaist?.date ?? null],
    ['steps, 7-day average', avg7(3) !== null ? Math.round(avg7(3)!) : null, t ? `Target ${t.steps}` : null],
    ['kcal, 7-day average', avg7(10) !== null ? Math.round(avg7(10)!) : null, t ? `Target ${t.kcalMin}–${t.kcalMax}` : null],
    ['protein g, 7-day average', r1(avg7(11)), t ? `Target ${t.proteinG}` : null],
    ['sleep hours, 7-day average', r2(avg7(8)), null],
    ['step streak, days', streak?.current ?? null, streak ? `${streak.shields} shields; best ${streak.best}` : null],
    ['training weeks in a row', weeks?.streak ?? null, weeks ? `${weeks.thisWeek} this week` : null],
    ['sessions logged', done.length, null],
    ['walk across India, km', Math.round(km), pos.to ? `Between ${pos.from.name} and ${pos.to.name}` : `At ${pos.from.name}`],
    ['plan', plan?.name ?? null, plan ? `From ${plan.from}; next alternates ${plan.rotation.join('/')}` : null],
  ];

  const readme: Cell[][] = [
    ['Health export'],
    ['Everything logged in the Health app, one sheet per log. Dates are YYYY-MM-DD in phone time. Weights in kg, waist and shoulders in inches.'],
    [''],
    ['Summary: the headline numbers at export time.'],
    ['Daily: one row per day. Rings close when kcal lands between kcal_min and kcal_max, protein reaches its target, and steps reach theirs. trend_kg smooths daily weigh-ins.'],
    ['Food log: every entry. kind is food, quick (a typed estimate), free (the weekly free meal) or drink.'],
    ['My foods: saved foods. kcal and protein are for values_per of the measured_in unit.'],
    ['Sets: one row per set, in the training plan’s own schema (date, session, exercise, set, side, load_kg, reps, seconds, notes). load_kg is per dumbbell. mark: !! record, ! beat last time, = matched.'],
    ['Sessions: one row per session, with joint flags and any swaps.'],
    ['Weekly: Monday-to-Sunday averages.'],
    ['Measurements: waist standing and slouched, shoulders, and the shoulder-to-waist ratio (it should rise).'],
    ['Records: the best set per exercise.'],
    ['Targets history: the targets in force from each date.'],
    ['Plan: the training plan as it stands.'],
  ];

  return [
    { name: 'README', rows: readme, header: false, widths: [120] },
    { name: 'Summary', rows: summary },
    { name: 'Daily', rows: daily },
    { name: 'Food log', rows: food },
    { name: 'My foods', rows: foods },
    { name: 'Sets', rows: setsSheet },
    { name: 'Sessions', rows: sessions },
    { name: 'Weekly', rows: weekly },
    { name: 'Measurements', rows: measures },
    { name: 'Records', rows: records },
    { name: 'Targets history', rows: targets },
    { name: 'Plan', rows: planRows },
    ...(slots.length
      ? [
          {
            name: 'Checklist',
            rows: [
              ['date', ...checklistSlots(s).map((x) => `${x.name} (${x.slot})`)],
              ...dates.map((date) => [
                date,
                ...slots.map((k) => {
                  const st = slotStatus(byDay.get(date), k);
                  if (st.kind === 'missed') return 'missed';
                  if (st.kind === 'not-logged') return 'not logged';
                  const t = new Date(st.at);
                  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
                }),
              ]),
            ] as Cell[][],
          },
        ]
      : []),
    ...(s.customTracks?.length && d.trackValues?.length
      ? [
          {
            name: 'Own tracks',
            rows: [
              ['date', 'track', 'value', 'unit', 'kind'],
              ...[...d.trackValues]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((v) => {
                  const t = s.customTracks!.find((x) => x.id === v.trackId);
                  return [v.date, t?.name ?? v.trackId, v.value, t?.unit ?? null, t?.kind ?? null] as Cell[];
                }),
            ] as Cell[][],
          },
        ]
      : []),
  ];
}

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

