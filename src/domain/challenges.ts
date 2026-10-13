import { daysBetween, type DayKey } from './dates';
import { FESTIVALS } from './festivals';
import { fmtDayMonth } from './format';

/** One small challenge a month. Nothing in here asks for less food. */

export interface DaySummary {
  date: DayKey;
  logged: boolean;
  perfect: boolean;
  proteinOk: boolean;
  sleepOk: boolean;
  /** Water in the morning, afternoon and evening. */
  waterSpread: boolean;
  morning: boolean;
  /** Every checklist slot ticked; false when there's no checklist. */
  checklist: boolean;
  steps: number;
}

export interface ChallengeDef {
  id: string;
  title: string;
  text: string;
  goal: number;
  unit: string;
  progress: (days: DaySummary[], ctx: { lastMonthSteps: number; month: string }) => number;
}

const count = (f: (d: DaySummary) => boolean) => (days: DaySummary[]) => days.filter(f).length;

const PROTEIN: ChallengeDef = { id: 'protein-20', title: 'Protein, every day', text: 'Close the protein ring on 20 days.', goal: 20, unit: 'days', progress: count((d) => d.proteinOk) };
const STEPS_UP: ChallengeDef = {
  id: 'steps-up',
  title: 'Step it up',
  text: 'Walk more this month than last month.',
  goal: 100,
  unit: '%',
  progress: (days, ctx) => (ctx.lastMonthSteps ? Math.floor((days.reduce((n, d) => n + d.steps, 0) / ctx.lastMonthSteps) * 100) : 0),
};

const BY_MONTH: Record<number, ChallengeDef> = {
  1: { id: 'mornings', title: 'Mornings first', text: 'Do the morning log on 25 days.', goal: 25, unit: 'days', progress: count((d) => d.morning) },
  2: PROTEIN,
  3: { id: 'sleep-20', title: 'Sleep on it', text: 'Reach your sleep target on 20 nights.', goal: 20, unit: 'nights', progress: count((d) => d.sleepOk) },
  4: { id: 'perfect-10', title: 'Ten perfect days', text: 'Close all three rings on 10 days.', goal: 10, unit: 'days', progress: count((d) => d.perfect) },
  5: { id: 'perfect-15', title: 'The final stretch', text: 'Close all three rings on 15 days before reveal day.', goal: 15, unit: 'days', progress: count((d) => d.perfect) },
  6: { id: 'mornings-jun', title: 'Mornings first', text: 'Do the morning log on 25 days.', goal: 25, unit: 'days', progress: count((d) => d.morning) },
  7: { id: 'checklist', title: 'Tick, tick, tick', text: 'Finish the daily checklist on 25 days.', goal: 25, unit: 'days', progress: count((d) => d.checklist) },
  8: STEPS_UP,
  9: { id: 'log-28', title: 'Log it all', text: 'Log food on 28 days.', goal: 28, unit: 'days', progress: count((d) => d.logged) },
  10: { id: 'sleep-oct', title: 'Sleep on it', text: 'Reach your sleep target on 20 nights.', goal: 20, unit: 'nights', progress: count((d) => d.sleepOk) },
  11: PROTEIN,
  12: STEPS_UP,
};

/** The month's challenge. A festival month logs the festival itself instead. */
export function challengeFor(month: string): ChallengeDef {
  const fest = FESTIVALS.find((f) => f.id === 'diwali' && f.day.startsWith(month));
  if (fest) {
    return {
      id: `diwali-${fest.day.slice(0, 4)}`,
      title: 'Diwali, logged',
      text: `Log something every day of Diwali, ${fmtDayMonth(fest.from)} to ${fmtDayMonth(fest.to)}. Sweets count.`,
      goal: daysBetween(fest.from, fest.to) + 1,
      unit: 'days',
      progress: count((d) => d.logged && d.date >= fest.from && d.date <= fest.to),
    };
  }
  return BY_MONTH[Number(month.slice(5, 7))];
}

const MONTH_DAYS = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();

/**
 * The month's challenge from your own last thirty days: the weakest of protein days, sleep nights,
 * morning logs and the checklist, with a goal a little above where it stands. Diwali still takes
 * over its month; with under two weeks of history it falls back to the calendar's challenge.
 */
export function pickChallenge(month: string, history: DaySummary[], has: { checklist: boolean }): ChallengeDef {
  const fixed = challengeFor(month);
  if (fixed.id.startsWith('diwali-')) return fixed;
  const recent = history.filter((d) => d.date < `${month}-01`).slice(-30);
  if (recent.length < 14) return fixed;
  const habits: { id: string; title: string; unit: string; text: (n: number) => string; ok: (d: DaySummary) => boolean }[] = [
    { id: 'protein', title: 'Protein, every day', unit: 'days', text: (n) => `Close the protein ring on ${n} days.`, ok: (d) => d.proteinOk },
    { id: 'sleep', title: 'Sleep on it', unit: 'nights', text: (n) => `Reach your sleep target on ${n} nights.`, ok: (d) => d.sleepOk },
    { id: 'mornings', title: 'Mornings first', unit: 'days', text: (n) => `Do the morning log on ${n} days.`, ok: (d) => d.morning },
    ...(has.checklist ? [{ id: 'checklist', title: 'Tick, tick, tick', unit: 'days', text: (n: number) => `Finish the daily checklist on ${n} days.`, ok: (d: DaySummary) => d.checklist }] : []),
  ];
  const rated = habits.map((h) => ({ h, rate: recent.filter(h.ok).length / recent.length })).sort((a, b) => a.rate - b.rate);
  const { h, rate } = rated[0];
  const days = MONTH_DAYS(month);
  const goal = Math.max(5, Math.min(days - 2, Math.round((rate + 0.15) * days)));
  return { id: `${h.id}-${month}`, title: h.title, text: h.text(goal), goal, unit: h.unit, progress: count(h.ok) };
}
