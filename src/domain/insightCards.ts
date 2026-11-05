import type { AskInput } from './askData';
import type { TrendRow } from './momentum';
import { addDays, dayRange, weekStart, type DayKey } from './dates';
import { fmtDayMonth, fmtDuration, fmtInt } from './format';
import { drinkNights, morningAfter } from './insights';
import { placeFor } from './places';
import { sleepMinutes } from './rings';
import { bestWeekday, placeSplit } from './trackStats';
import { compareSeries, moveTogether } from './trackRules';
import type { Day, ForecastRecord, Settings } from './types';
import { kmFromSteps, setStride } from './walk';

export function confidenceWord(n: number): string {
  if (n < 7) return 'Early days';
  if (n < 21) return 'Some evidence';
  if (n < 60) return 'Fair evidence';
  return 'Solid';
}

export interface InsightCard { id: string; title: string; text?: string; working?: string; needed?: string; confidence?: string }
const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const NEED_WEEKDAY = 14;
const NEED_SHARED = 14;
const NEED_PLACE = 5;
const NEED_NIGHTS = 2;
const more = (have: number, need: number, one: string, many: string) => `Needs ${need - have} more ${need - have === 1 ? one : many}.`;

/** Each insight either speaks, with its working and a confidence in words, or says what it still needs. */
export function insightCards(i: AskInput): InsightCard[] {
  const stepDays = i.days.filter((d) => d.steps !== undefined && d.date <= i.today);
  const out: InsightCard[] = [];

  const best = stepDays.length >= NEED_WEEKDAY ? bestWeekday(new Map(stepDays.map((d) => [d.date, d.steps!]))) : undefined;
  out.push(best
    ? { id: 'weekday', title: 'Your best weekday', text: `${WEEKDAYS[best.weekday]}, about ${fmtInt(best.avg)} steps.`, working: `The average of each weekday across ${stepDays.length} logged days.`, confidence: confidenceWord(stepDays.length) }
    : { id: 'weekday', title: 'Your best weekday', needed: more(stepDays.length, NEED_WEEKDAY, 'day of steps', 'days of steps') });

  const pair = compareSeries('sleep', 'steps', i);
  const link = moveTogether(pair.a, pair.b);
  const WORDS = { together: 'Better-slept days tend to be bigger step days.', opposite: 'Longer nights tend to come with fewer steps.', apart: 'Sleep and steps show no clear link yet.' };
  out.push(link
    ? { id: 'sleep-steps', title: 'Sleep and steps', text: WORDS[link], working: `Compared across ${pair.days.length} days with both, in the last 60. A pattern, not a cause.`, confidence: confidenceWord(pair.days.length) }
    : { id: 'sleep-steps', title: 'Sleep and steps', needed: more(pair.days.length, NEED_SHARED, 'day with both', 'days with both') });

  const kind = (d: DayKey) => placeFor(i.days.find((x) => x.date === d), i.settings).kind;
  const split = placeSplit(stepDays.map((d) => d.date), (d) => i.days.find((x) => x.date === d)?.steps, kind);
  const officeN = stepDays.filter((d) => kind(d.date) === 'office').length;
  const homeN = stepDays.filter((d) => kind(d.date) === 'home').length;
  const fewest = Math.min(officeN, homeN);
  out.push(split.diff !== undefined && fewest >= NEED_PLACE
    ? { id: 'place', title: 'Office days and home days', text: `Office days run ${fmtInt(Math.abs(split.diff))} steps ${split.diff < 0 ? 'lower' : 'higher'} than home days.`, working: `${officeN} office days against ${homeN} home days.`, confidence: confidenceWord(fewest * 2) }
    : { id: 'place', title: 'Office days and home days', needed: more(fewest, NEED_PLACE, 'day of each', 'days of each') });

  const nights = drinkNights(i.entries);
  const after = morningAfter(nights, i.days, i.today, NEED_NIGHTS);
  out.push(after && nights.length >= NEED_NIGHTS
    ? { id: 'drinks', title: 'The morning after', text: 'Your morning-after numbers are ready on the Drinks page.', working: `From ${nights.length} nights with drinks.`, confidence: confidenceWord(nights.length * 3) }
    : { id: 'drinks', title: 'The morning after', needed: more(nights.length, NEED_NIGHTS, 'night with drinks', 'nights with drinks') });
  return out;
}

export interface NaturalEvent { name: string; from: DayKey; to: DayKey; line?: string; needed?: string }
const MIN_EVENT_DAYS = 2;
const COMPARE_BEFORE = 7;
const MIN_SIDE = 2;

/** Things that happened on their own, a sick spell or days away, set against the week before them. */
export function naturalEvents(days: Day[], settings: Settings, today: DayKey): NaturalEvent[] {
  const by = new Map(days.map((d) => [d.date, d]));
  const dates = [...by.keys()].filter((d) => d <= today).sort();
  if (!dates.length) return [];
  const labelOf = (d: Day | undefined): string | undefined => {
    if (!d) return undefined;
    if (d.status === 'sick') return 'Sick';
    const k = placeFor(d, settings).kind;
    return k === 'home' || k === 'office' ? undefined : 'Away';
  };
  const out: NaturalEvent[] = [];
  let run: { name: string; from: DayKey; to: DayKey } | undefined;
  const close = () => {
    if (run && dayRange(run.from, run.to).length >= MIN_EVENT_DAYS) out.push(describe(run, by));
    run = undefined;
  };
  for (const d of dayRange(dates[0], today)) {
    const name = labelOf(by.get(d));
    if (run && name === run.name) run.to = d;
    else {
      close();
      if (name) run = { name, from: d, to: d };
    }
  }
  close();
  return out.reverse();
}

function describe(run: { name: string; from: DayKey; to: DayKey }, by: Map<DayKey, Day>): NaturalEvent {
  const avg = (ds: DayKey[]) => {
    const v = ds.flatMap((d) => (by.get(d)?.steps === undefined ? [] : [by.get(d)!.steps!]));
    return { n: v.length, v: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0 };
  };
  const during = avg(dayRange(run.from, run.to));
  const before = avg(dayRange(addDays(run.from, -COMPARE_BEFORE), addDays(run.from, -1)));
  if (during.n < MIN_SIDE || before.n < MIN_SIDE) return { ...run, needed: 'Not enough logged days either side to compare.' };
  return { ...run, line: `${fmtInt(during.v)} steps a day, against ${fmtInt(before.v)} the week before.` };
}

/** One number from last full week. Nothing without a week. */
export function statOfWeek(i: AskInput): { big: string; small: string } | undefined {
  const to = addDays(weekStart(i.today), -1);
  const from = addDays(to, -6);
  const steps = i.days.filter((d) => d.date >= from && d.date <= to).reduce((n, d) => n + (d.steps ?? 0), 0);
  const done = i.sessions.filter((s) => s.status === 'done' && s.date >= from && s.date <= to).length;
  setStride(i.settings.strideM);
  if (steps) return { big: fmtInt(kmFromSteps(steps)), small: `km walked last week${done ? `, with ${done} session${done === 1 ? '' : 's'}` : ''}.` };
  if (done) return { big: String(done), small: `session${done === 1 ? '' : 's'} last week.` };
  const nights = i.days.filter((d) => d.sleep && d.date >= from && d.date <= to);
  if (nights.length) return { big: fmtDuration(Math.round(nights.reduce((n, d) => n + sleepMinutes(d.sleep!.asleep, d.sleep!.woke), 0) / nights.length)), small: 'asleep a night, last week.' };
  return undefined;
}

/** How the app's own forecasts did. It keeps score of itself. */
export function trackRecord(list: ForecastRecord[]): { hit: number; total: number } | undefined {
  const scored = list.filter((f) => f.outcome !== undefined);
  if (!scored.length) return undefined;
  return { hit: scored.filter((f) => f.outcome! >= f.low && f.outcome! <= f.high).length, total: scored.length };
}

export const eventDates = (e: NaturalEvent) => `${fmtDayMonth(e.from)} to ${fmtDayMonth(e.to)}`;

/** The working behind a trend row, in words. */
export function trendWorking(row: TrendRow): string {
  if (!row.was) return `Now: ${row.now}, measured over 14 days. There is nothing to compare it with yet.`;
  return `Now: ${row.now}. Four weeks ago: ${row.was}. Each is measured over 14 days, and only logged days count.`;
}
