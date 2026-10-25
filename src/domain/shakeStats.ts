import { daysBetween, type DayKey } from './dates';
import { fmt1, fmtDayMonth, fmtDuration, fmtInt } from './format';
import { sleepMinutes } from './rings';
import { weightTrend } from './streaks';
import type { Day, FoodEntry, Measurement, SetEntry, Settings, TrainingSession } from './types';
import { kmFromSteps, positionAt, setStride } from './walk';

export interface Stat {
  text: string;
  sub?: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A deck of true, slightly absurd facts from your own logs. */
export function statDeck(d: {
  today: DayKey;
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  measurements: Measurement[];
}): Stat[] {
  setStride(d.settings.strideM);
  const out: Stat[] = [];
  const done = d.sessions.filter((s) => s.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
  const doneIds = new Set(done.map((s) => s.id));
  const sets = d.sets.filter((x) => doneIds.has(x.sessionId));
  const steps = d.days.filter((x) => x.steps !== undefined);
  const totalSteps = steps.reduce((n, x) => n + x.steps!, 0);
  const km = kmFromSteps(totalSteps);
  const pos = positionAt(km);
  const month = (key: DayKey) => MONTHS[Number(key.slice(5, 7)) - 1];

  const reps = sets.reduce((n, x) => n + (x.reps ?? 0), 0);
  if (reps >= 100) {
    const extraKm = kmFromSteps(reps);
    out.push({
      text: `You've done ${fmtInt(reps)} reps since ${month(done[0].date)}.`,
      sub: pos.to ? `If every rep were a step, you'd be ${fmt1(extraKm)} km further down the road to ${pos.to.name}.` : `If every rep were a step, that's another ${fmt1(extraKm)} km.`,
    });
  }
  const monthKey = d.today.slice(0, 7);
  const water = d.days.filter((x) => x.date.startsWith(monthKey)).reduce((n, x) => n + (x.waterMl ?? 0), 0);
  if (water >= 10000) {
    const tubs = water / 150000;
    out.push({ text: `${fmtInt(water / 1000)} L of water this month.`, sub: tubs >= 1 ? `That would fill ${fmt1(tubs)} bathtubs.` : `That would fill ${Math.round(tubs * 100)}% of a bathtub.` });
  }
  if (d.settings.loopSteps && totalSteps > 0) {
    const laps = Math.round(totalSteps / d.settings.loopSteps);
    out.push({ text: `${fmtInt(laps)} laps of your loop at home.`, sub: `${fmt1(km)} km without leaving the house.` });
  }
  if (totalSteps >= 10000) {
    out.push({ text: `${fmtInt(totalSteps)} steps on record.`, sub: `Enough to climb the Qutub Minar's 379 steps ${fmtInt(Math.floor(totalSteps / 379))} times.` });
    const ch = pos.chapter;
    out.push({ text: `${fmt1(km)} km walked.`, sub: `${Math.round(Math.min(1, (km - ch.start) / (ch.end - ch.start)) * 100)}% of chapter ${ch.n}, ${ch.name.charAt(0).toLowerCase() + ch.name.slice(1)}.` });
  }
  // The longest rest between two sets in one session.
  let longest = 0;
  const bySession = new Map<string, number[]>();
  for (const x of sets) bySession.set(x.sessionId, [...(bySession.get(x.sessionId) ?? []), x.at]);
  for (const ts of bySession.values()) {
    const s = [...ts].sort((a, b) => a - b);
    for (let i = 1; i < s.length; i++) longest = Math.max(longest, s[i] - s[i - 1]);
  }
  if (longest >= 90_000 && longest < 30 * 60_000) {
    const m = Math.floor(longest / 60000);
    const s = Math.round((longest % 60000) / 1000);
    out.push({ text: `Your longest rest ever: ${m} min ${s} s.`, sub: 'And yes, we noticed.' });
  }
  const kg = sets.reduce((n, x) => n + (x.loadKg ?? 0) * (x.reps ?? 0), 0);
  if (done.length >= 3) {
    out.push({ text: `${fmtInt(done.length)} sessions logged.`, sub: kg >= 5000 ? `About ${fmt1(kg / 5000)} elephants moved, give or take a trunk.` : `${fmtInt(kg)} kg moved so far.` });
  }
  const counts = new Map<string, { n: number; days: Set<string> }>();
  for (const e of d.entries) {
    if (e.kind !== 'food') continue;
    const c = counts.get(e.name) ?? { n: 0, days: new Set<string>() };
    c.n++;
    c.days.add(e.date);
    counts.set(e.name, c);
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  if (top && top[1].n >= 5) out.push({ text: `Most logged food: ${top[0].toLowerCase()}, ${fmtInt(top[1].n)} times.`, sub: `On ${top[1].days.size} different days. A loyal customer.` });
  const nights = d.days.filter((x) => x.sleep);
  if (nights.length >= 5) {
    const mins = nights.reduce((n, x) => n + sleepMinutes(x.sleep!.asleep, x.sleep!.woke), 0);
    out.push({ text: `${fmtInt(Math.round(mins / 60))} hours of sleep on record.`, sub: `${fmt1(mins / 1440)} whole days spent asleep, officially.` });
  }
  const trend = weightTrend(d.days.filter((x) => x.weightKg !== undefined).map((x) => ({ date: x.date, kg: x.weightKg! })));
  if (trend.length >= 10) {
    const diff = trend[trend.length - 1].trend - trend[0].trend;
    out.push({ text: `Trend weight ${diff <= 0 ? 'down' : 'up'} ${fmt1(Math.abs(diff))} kg since ${fmtDayMonth(trend[0].date)}.`, sub: 'The smoothed line, not the daily noise.' });
  }
  const waists = d.measurements.filter((m) => m.waistStanding !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  if (waists.length >= 2) {
    const diff = waists[0].waistStanding! - waists[waists.length - 1].waistStanding!;
    if (diff > 0) out.push({ text: `${fmt1(diff)} in off your waist since ${fmtDayMonth(waists[0].date)}.`, sub: 'Your belt has noticed. It has not said anything.' });
  }
  const records = sets.filter((x) => x.mark === '!!');
  if (records.length >= 3) out.push({ text: `${fmtInt(records.length)} record sets so far.`, sub: `The latest: ${records[records.length - 1].exercise.toLowerCase()}, ${fmtDayMonth(records[records.length - 1].date)}.` });
  const first = [...d.days].sort((a, b) => a.date.localeCompare(b.date))[0];
  if (first) {
    const n = daysBetween(first.date, d.today) + 1;
    if (n >= 7) out.push({ text: `Day ${fmtInt(n)} of tracking.`, sub: `Since ${fmtDayMonth(first.date)}. Every one of them counted.` });
  }
  const avgNight = nights.length ? nights.slice(-7).reduce((n, x) => n + sleepMinutes(x.sleep!.asleep, x.sleep!.woke), 0) / Math.min(7, nights.length) : 0;
  if (avgNight) out.push({ text: `${fmtDuration(avgNight)} a night, this week.`, sub: avgNight >= (d.settings.targets.at(-1)?.targets.sleepMin ?? 420) ? 'Above your line. Well rested.' : 'Just under your line. Tonight is a fresh start.' });
  return out;
}
