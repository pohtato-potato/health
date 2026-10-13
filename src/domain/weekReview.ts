import { addDays, dayRange, parseDay, type DayKey } from './dates';
import { fmtDuration, fmtInt } from './format';
import { basisLabel } from './logged';
import { placeFor } from './places';
import { targetsAt } from './occasions';
import { weekBudget } from './budgets';
import { headline, weekStats } from './weekly';
import type { Day, FoodEntry, SetEntry, Settings, TrainingSession } from './types';

export interface ReviewCard {
  id: string;
  kicker: string;
  big: string;
  lines: string[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

/**
 * The weekly review as story cards: the chapter title, food against the budget, steps,
 * training, sleep, office against home and weekend against weekday. Missing data says so.
 */
export function weekReview(settings: Settings, from: DayKey, days: Pick<Day, 'date' | 'steps' | 'sleep' | 'place' | 'foodDone'>[], entries: FoodEntry[], sessions: TrainingSession[], sets: SetEntry[], weekNo: number): { title: string; cards: ReviewCard[] } {
  const range = dayRange(from, addDays(from, 6));
  const w = weekStats(settings, from, days as Day[], entries, sessions, sets);
  const t = targetsAt(settings, from);
  const title = `Week ${weekNo} · ${headline(w, undefined, [w], t?.sessionsPerWeek ?? 4).replace(/\.$/, '')}`;
  const byDate = new Map(days.map((d) => [d.date, d]));
  const cards: ReviewCard[] = [];

  const budget = t ? weekBudget(t, byDate, entries, from, addDays(from, 7)) : undefined;
  cards.push({
    id: 'food',
    kicker: 'Food',
    big: w.kcalAvg !== undefined ? `${fmtInt(w.kcalAvg)} kcal` : 'Not logged',
    lines:
      w.kcalAvg !== undefined
        ? [`${basisLabel(w.foodDays, w.foodBasis)}, ${w.proteinAvg ?? 0} g protein a day.`, ...(budget ? [`${budget.kcal.left >= 0 ? `${fmtInt(budget.kcal.left)} kcal under` : `${fmtInt(-budget.kcal.left)} kcal over`} the week's budget.`] : [])]
        : ['No food logged this week. Close the day helps fill a past day in two minutes.'],
  });

  const stepDays = range.map((d) => byDate.get(d)?.steps).filter((s): s is number => s !== undefined);
  cards.push({
    id: 'steps',
    kicker: 'Steps',
    big: stepDays.length ? fmtInt(Math.round(avg(stepDays)!)) : 'Not logged',
    lines: stepDays.length ? [`A day on average over ${stepDays.length} logged day${stepDays.length === 1 ? '' : 's'}.`] : ['No steps logged this week.'],
  });

  cards.push({
    id: 'training',
    kicker: 'Training',
    big: `${w.sessions} of ${t?.sessionsPerWeek ?? 4}`,
    lines: [w.sessions ? `${w.sets} sets, ${w.records.length} record${w.records.length === 1 ? '' : 's'}.` : 'No sessions this week. Rest weeks happen.'],
  });

  cards.push({
    id: 'sleep',
    kicker: 'Sleep',
    big: w.sleepAvg !== undefined ? fmtDuration(Math.round(w.sleepAvg)) : 'Not logged',
    lines: [w.sleepAvg !== undefined ? 'A night on average.' : 'No sleep logged this week.'],
  });

  const office = range.filter((d) => byDate.has(d) && placeFor(byDate.get(d), settings).kind === 'office');
  const home = range.filter((d) => byDate.has(d) && placeFor(byDate.get(d), settings).kind === 'home');
  const stepsOn = (ds: DayKey[]) => avg(ds.map((d) => byDate.get(d)?.steps).filter((s): s is number => s !== undefined));
  if (office.length && home.length) {
    const o = stepsOn(office);
    const h = stepsOn(home);
    cards.push({
      id: 'places',
      kicker: 'Office against home',
      big: o !== undefined && h !== undefined ? `${fmtInt(Math.abs(Math.round(h - o)))} steps` : '—',
      lines: [o !== undefined && h !== undefined ? `${o < h ? 'Fewer' : 'More'} on office days (${office.length}) than at home (${home.length}).` : 'Not enough steps logged to compare.'],
    });
  }

  const weekend = range.filter((d) => [0, 6].includes(parseDay(d).getDay()));
  const weekday = range.filter((d) => !weekend.includes(d));
  const we = stepsOn(weekend);
  const wd = stepsOn(weekday);
  cards.push({
    id: 'weekend',
    kicker: 'Weekend against weekdays',
    big: we !== undefined && wd !== undefined ? `${we >= wd ? '+' : '−'}${fmtInt(Math.abs(Math.round(we - wd)))} steps` : '—',
    lines: [we !== undefined && wd !== undefined ? `The weekend averaged ${fmtInt(Math.round(we))}, weekdays ${fmtInt(Math.round(wd))}.` : 'Not enough logged on both to compare the weekend with weekdays.'],
  });

  return { title, cards };
}
