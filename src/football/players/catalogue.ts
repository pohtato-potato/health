// The squad from the logs (spec §2, calibration §13.1): every real thing you log is a player in one of six units.
import { addDays, type DayKey } from '../../domain/dates';
import { allExercises, type ExerciseDef } from '../../domain/plan';
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
  // An entry the coach marks `replaces` or `progressionOf` an earlier one joins that player (calibration §13.2).
  const plan = h.settings.plan;
  const planned = new Map((plan ? allExercises(plan) : []).map((e) => [e.id, e]));
  const setsBy = new Map<string, typeof h.sets>();
  for (const s of h.sets) if (s.date <= date) setsBy.set(s.exerciseId, [...(setsBy.get(s.exerciseId) ?? []), s]);
  const chains = exerciseChains(planned, new Set([...planned.keys(), ...setsBy.keys()]));
  for (const [root, refs] of chains) {
    const xs = refs.flatMap((r) => setsBy.get(r) ?? []).sort((a, b) => a.at - b.at);
    const live = [...refs].reverse().find((r) => planned.has(r));
    const def = live ? planned.get(live) : undefined;
    const name = def?.name ?? xs[xs.length - 1]?.exercise ?? root;
    const switches = refs.slice(1).flatMap((r) => {
      const first = (setsBy.get(r) ?? []).reduce<DayKey | undefined>((a, s) => (!a || s.date < a ? s.date : a), undefined);
      const d = planned.get(r);
      return first ? [{ on: first, id: r, why: (d?.replaces ? 'kit' : 'profile') as 'kit' | 'profile' }] : [];
    });
    // A planned exercise not trained yet signs at the start of the day after it first shows up (the caller remembers that day).
    add({
      id: `ex:${root}`, unit: 'Power', kind: 'exercise', ref: root, name, art: artForExercise(root, planned.get(root)?.name ?? name),
      signed: xs[0]?.date ?? (def ? date : undefined), active: Boolean(def),
      ...(refs.length > 1 ? { refs, switches } : {}),
    });
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

/**
 * Exercise ids grouped into players: each root with every id that `replaces` it or is a `progressionOf` it, oldest
 * link first. A tag naming an id with no plan entry and no history is ignored (the new entry is its own player).
 */
export function exerciseChains(planned: Map<string, ExerciseDef>, known: Set<string>): Map<string, string[]> {
  const parent = (id: string) => { const d = planned.get(id); const p = d?.replaces ?? d?.progressionOf; return p && p !== id && known.has(p) ? p : undefined; };
  const rootOf = (id: string) => { let r = id; const seen = new Set([r]); for (let p = parent(r); p && !seen.has(p); p = parent(r)) { r = p; seen.add(r); } return r; };
  const out = new Map<string, string[]>();
  for (const id of known) { const r = rootOf(id); out.set(r, [...(out.get(r) ?? []), id]); }
  // Root first, then each link in the order it joins (its depth in the chain).
  const depth = (id: string) => { let n = 0; for (let p = parent(id); p && n < 50; p = parent(p)) n++; return n; };
  for (const [r, ids] of out) out.set(r, ids.sort((a, b) => depth(a) - depth(b) || a.localeCompare(b)));
  return out;
}
