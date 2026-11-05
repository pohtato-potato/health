import type { DayKey } from './dates';
import { fmtDayMonth, fmtInt } from './format';
import type { Day, FoodEntry, Settings, TrainingSession } from './types';

export type CheckupKind = 'empty-day' | 'double-entry' | 'weight-off' | 'unfinished-session' | 'steps-high' | 'double-dose';
export interface CheckupFix { label: string; table: 'days' | 'entries' | 'sessions'; rowId: string; remove?: true; patch?: Record<string, unknown> }
export interface CheckupFinding { id: string; kind: CheckupKind; date: DayKey; text: string; fix: CheckupFix }
export interface CheckupInput { today: DayKey; settings: Settings; days: Day[]; entries: FoodEntry[]; sessions: TrainingSession[] }

const DOUBLE_ENTRY_MS = 5 * 60_000;
const DOUBLE_DOSE_MS = 30 * 60_000;
const WEIGHT_WINDOW = 10;
const WEIGHT_MIN_NEIGHBOURS = 3;
const WEIGHT_OFF_KG = 3;
const STEPS_MIN_DAYS = 7;
const STEPS_TIMES = 4;
const STEPS_FLOOR = 25000;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const gapDays = (a: DayKey, b: DayKey) => Math.abs(new Date(`${a}T12:00`).getTime() - new Date(`${b}T12:00`).getTime()) / 86_400_000;

function emptyDays(i: CheckupInput): CheckupFinding[] {
  const used = new Set([...i.entries.map((e) => e.date), ...i.sessions.map((s) => s.date)]);
  return i.days.filter((d) => !used.has(d.date) && Object.entries(d).every(([k, v]) => k === 'date' || v === undefined)).map((d) => ({
    id: `empty-day:${d.date}`, kind: 'empty-day', date: d.date, text: `${fmtDayMonth(d.date)} is saved with nothing on it.`,
    fix: { label: 'Remove the empty day', table: 'days', rowId: d.date, remove: true },
  }));
}

function doubleEntries(i: CheckupInput): CheckupFinding[] {
  const out: CheckupFinding[] = [];
  const sorted = [...i.entries].sort((a, b) => a.at - b.at);
  sorted.forEach((e, n) => {
    const twin = sorted.slice(0, n).find((x) => x.date === e.date && x.name === e.name && x.kcal === e.kcal && e.at - x.at <= DOUBLE_ENTRY_MS);
    if (twin) out.push({
      id: `double-entry:${e.id}`, kind: 'double-entry', date: e.date, text: `${e.name || 'A food'} is logged twice within minutes on ${fmtDayMonth(e.date)}.`,
      fix: { label: 'Delete the second one', table: 'entries', rowId: String(e.id), remove: true },
    });
  });
  return out;
}

function weightsOff(i: CheckupInput): CheckupFinding[] {
  const weighed = i.days.filter((d) => d.weightKg !== undefined);
  return weighed.flatMap<CheckupFinding>((d) => {
    const near = weighed.filter((o) => o.date !== d.date && gapDays(o.date, d.date) <= WEIGHT_WINDOW).map((o) => o.weightKg!);
    if (near.length < WEIGHT_MIN_NEIGHBOURS || Math.abs(d.weightKg! - median(near)) <= WEIGHT_OFF_KG) return [];
    return [{
      id: `weight-off:${d.date}`, kind: 'weight-off', date: d.date, text: `The weight on ${fmtDayMonth(d.date)} is far from the days around it. It may be a typing slip.`,
      fix: { label: 'Clear this weight', table: 'days', rowId: d.date, patch: { weightKg: undefined } },
    }];
  });
}

function unfinished(i: CheckupInput): CheckupFinding[] {
  return i.sessions.filter((s) => s.status === 'active' && s.date < i.today).map((s) => ({
    id: `unfinished-session:${s.id}`, kind: 'unfinished-session', date: s.date, text: `A session from ${fmtDayMonth(s.date)} was never finished.`,
    fix: { label: 'Mark it finished', table: 'sessions', rowId: String(s.id), patch: { status: 'done', endedAt: s.startedAt } },
  }));
}

function stepsHigh(i: CheckupInput): CheckupFinding[] {
  const logged = i.days.filter((d) => d.steps !== undefined && d.steps > 0);
  if (logged.length < STEPS_MIN_DAYS) return [];
  const usual = median(logged.map((d) => d.steps!));
  return logged.filter((d) => d.steps! > usual * STEPS_TIMES && d.steps! > STEPS_FLOOR).map((d) => ({
    id: `steps-high:${d.date}`, kind: 'steps-high', date: d.date, text: `${fmtInt(d.steps!)} steps on ${fmtDayMonth(d.date)}, against a usual ${fmtInt(usual)}.`,
    fix: { label: 'Clear these steps', table: 'days', rowId: d.date, patch: { steps: undefined } },
  }));
}

function doubleDoses(i: CheckupInput): CheckupFinding[] {
  const meds = i.settings.checklist.filter((c) => c.med);
  return i.days.flatMap((d) => meds.flatMap<CheckupFinding>((m) => {
    const ticks = Object.entries(d.ticks ?? {}).filter(([k]) => k.startsWith(`${m.id}:`)).sort((a, b) => a[1] - b[1]);
    const second = ticks.find(([, at], n) => n > 0 && at - ticks[n - 1][1] <= DOUBLE_DOSE_MS);
    if (!second) return [];
    const rest = { ...d.ticks };
    delete rest[second[0]];
    return [{
      id: `double-dose:${d.date}:${m.id}`, kind: 'double-dose', date: d.date, text: `${m.name} was ticked twice within minutes on ${fmtDayMonth(d.date)}.`,
      fix: { label: 'Remove the second tick', table: 'days', rowId: d.date, patch: { ticks: rest } },
    }];
  }));
}

/** Things in the data that look like slips. Each comes with a fix, and "that's right" keeps it quiet. */
export function dataCheckup(i: CheckupInput): CheckupFinding[] {
  const ok = new Set(i.settings.checkupOk ?? []);
  return [...emptyDays(i), ...doubleEntries(i), ...weightsOff(i), ...unfinished(i), ...stepsHigh(i), ...doubleDoses(i)].filter((f) => !ok.has(f.id));
}
