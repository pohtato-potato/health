// The squad from the logs (spec §2, calibration §13.1): every real thing you log is a player in one of six units.
import { addDays, type DayKey } from '../../domain/dates';
import { allExercises } from '../../domain/plan';
import { placeFor } from '../../domain/places';
import type { Meal } from '../../domain/types';
import type { Health } from '../store/gather';
import { artForExercise, artForHabit } from './art';
import type { PlayerDef } from './types';

export const BIG_DAY = 18000;
export const LONG_WALK_KM = 5;
const MEALS: { meal: Meal; name: string; art: string }[] = [
  { meal: 'breakfast', name: 'Breakfast', art: 'breakfast' },
  { meal: 'lunch', name: 'Lunch', art: 'lunch' },
  { meal: 'dinner', name: 'Dinner', art: 'dinner' },
];
const first = (xs: DayKey[]) => xs.reduce<DayKey | undefined>((a, b) => (!a || b < a ? b : a), undefined);

/** Every player signed on or before `date`. A player signs on its first day with real data; nothing is invented. */
export function playersOn(h: Health, date: DayKey): PlayerDef[] {
  const out: PlayerDef[] = [];
  const add = (p: Omit<PlayerDef, 'signed'> & { signed?: DayKey }) => { if (p.signed && p.signed <= date) out.push(p as PlayerDef); };
  const days = [...h.days.values()].filter((d) => d.date <= date);

  // Power: every exercise in the coach's plan, plus any with history (no longer in the plan: active false).
  const plan = h.settings.plan;
  const planned = new Map((plan ? allExercises(plan) : []).map((e) => [e.id, e]));
  const setsBy = new Map<string, typeof h.sets>();
  for (const s of h.sets) if (s.date <= date) setsBy.set(s.exerciseId, [...(setsBy.get(s.exerciseId) ?? []), s]);
  for (const id of new Set([...planned.keys(), ...setsBy.keys()])) {
    const xs = (setsBy.get(id) ?? []).sort((a, b) => a.at - b.at);
    const def = planned.get(id);
    const name = def?.name ?? xs[xs.length - 1]?.exercise ?? id;
    // A planned exercise not trained yet signs at the start of the day after it first shows up (the caller remembers that day).
    add({ id: `ex:${id}`, unit: 'Power', kind: 'exercise', ref: id, name, art: artForExercise(id, name), signed: xs[0]?.date ?? (def ? date : undefined), active: Boolean(def) });
  }

  // Pace
  const stepDays = days.filter((d) => d.steps != null);
  add({ id: 'pace:steps', unit: 'Pace', kind: 'steps', name: 'Steps', art: 'steps', signed: first(stepDays.map((d) => d.date)), active: true });
  add({ id: 'pace:big-days', unit: 'Pace', kind: 'big-days', name: 'Big days', art: 'bigday', signed: first(stepDays.filter((d) => d.steps! >= BIG_DAY).map((d) => d.date)), active: true });
  const travel = stepDays.filter((d) => { const k = placeFor(d, h.settings).kind; return k === 'office' || k === 'trip'; });
  add({ id: 'pace:commuter', unit: 'Pace', kind: 'commuter', name: 'Commuter', art: 'commuter', signed: first(travel.map((d) => d.date)), active: true });
  add({ id: 'pace:long-walk', unit: 'Pace', kind: 'long-walk', name: 'Long walk', art: 'longwalk', signed: first(h.walks.filter((w) => w.km >= LONG_WALK_KM && w.date <= date).map((w) => w.date)), active: true });
  add({ id: 'pace:route-walker', unit: 'Pace', kind: 'route-walker', name: 'Route walker', art: 'route', signed: first(h.routes.flatMap((r) => r.spans.map((s) => s.from)).filter((d) => d <= date)), active: true });

  // Fuel: calories and protein, and the three meals (snacks left out).
  const foodDays = [...h.kcal].filter(([d, k]) => d <= date && k.n > 0).map(([d]) => d);
  add({ id: 'fuel:calories', unit: 'Fuel', kind: 'calories', name: 'Calories', art: 'calories', signed: first(foodDays), active: true });
  add({ id: 'fuel:protein', unit: 'Fuel', kind: 'protein', name: 'Protein', art: 'protein', signed: first(foodDays), active: true });
  for (const m of MEALS) add({ id: `fuel:${m.meal}`, unit: 'Fuel', kind: 'meal', ref: m.meal, name: m.name, art: m.art, signed: first([...h.meals].filter(([d, x]) => d <= date && x[m.meal]).map(([d]) => d)), active: true });

  // Routine: each checklist habit; medicines never move a rating, so they are never players.
  for (const item of h.settings.checklist ?? []) {
    if (item.med) continue;
    const keys = item.slots.map((_, k) => `${item.id}:${k}`);
    const ticked = days.filter((d) => keys.some((k) => d.ticks?.[k] != null)).map((d) => d.date);
    add({ id: `habit:${item.id}`, unit: 'Routine', kind: 'habit', ref: item.id, name: item.name, art: artForHabit(item.name), signed: first(ticked) ?? (item.active ? date : undefined), active: item.active });
  }

  // Shape
  const weighed = days.filter((d) => d.weightKg != null).map((d) => d.date);
  add({ id: 'shape:weigh-in', unit: 'Shape', kind: 'weigh-in', name: 'Weigh-in', art: 'scale', signed: first(weighed), active: true });
  add({ id: 'shape:waist', unit: 'Shape', kind: 'waist', name: 'Waist', art: 'tape', signed: first(h.measures.filter((m) => m.waist != null && m.date <= date).map((m) => m.date)), active: true });
  const w0 = first(weighed);
  add({ id: 'shape:trend', unit: 'Shape', kind: 'trend', name: 'Trend', art: 'trend', signed: w0 && addDays(w0, 13) <= date ? addDays(w0, 13) : undefined, active: true });

  // Rest
  const slept = days.filter((d) => d.sleep).map((d) => d.date);
  add({ id: 'rest:hours', unit: 'Rest', kind: 'hours', name: 'Hours', art: 'moon', signed: first(slept), active: true });
  add({ id: 'rest:bedtime', unit: 'Rest', kind: 'bedtime', name: 'Bedtime', art: 'clock', signed: first(slept), active: true });
  add({ id: 'rest:rested', unit: 'Rest', kind: 'rested', name: 'Rested', art: 'sunrise', signed: first(days.filter((d) => d.sleep?.rested).map((d) => d.date)), active: true });
  return out;
}
