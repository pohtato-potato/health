import { useMemo, type MouseEvent } from 'react';
import { addDays, weekStart } from '../domain/dates';
import { headlines, RICKROLL, type HeadlineCtx } from '../domain/headlines';
import { sleepMinutes } from '../domain/rings';
import type { Day, FoodEntry, SetEntry, Settings, TrainingSession } from '../domain/types';
import { arrivals, kmFromSteps, positionAt } from '../domain/walk';
import { bump } from '../db/actions';
import { dayRings, doneSessions, stepStreakFor, targetsFor } from '../state/derived';
import { useToast } from './Toasts';

/** The inputs for today's headlines, all from your own numbers. */
export function tickerContext(
  settings: Settings,
  today: string,
  days: Day[],
  entries: FoodEntry[],
  sessions: TrainingSession[],
  sets: SetEntry[],
  measurements: { date: string; waistStanding?: number }[],
  unlocked: number,
): HeadlineCtx {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const steps = new Map(days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const totalSteps = [...steps.values()].reduce((a, b) => a + b, 0);
  const km = kmFromSteps(totalSteps);
  const pos = positionAt(km);
  const week = (from: string) => Array.from({ length: 7 }, (_, i) => steps.get(addDays(from, i)) ?? 0).reduce((a, b) => a + b, 0);
  const thisWeek = week(addDays(today, -6));
  const lastWeek = week(addDays(today, -13));
  const pace = kmFromSteps(thisWeek) / 7;
  const counts = new Map<string, number>();
  for (const e of entries) if (e.kind === 'food' && e.date >= addDays(today, -30)) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
  const topFoods = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  const waists = measurements.filter((m) => m.waistStanding !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  const recentWaists = waists.filter((m) => m.date >= addDays(today, -35));
  const done = doneSessions(sessions);
  const yesterday = addDays(today, -1);
  const yRings = dayRings(settings, yesterday, byDate.get(yesterday), entries.filter((e) => e.date === yesterday));
  const tRings = dayRings(settings, today, byDate.get(today), entries.filter((e) => e.date === today));
  const monthStart = today.slice(0, 8) + '01';
  let perfectThisMonth = 0;
  for (let d = monthStart; d <= today; d = addDays(d, 1)) {
    if (dayRings(settings, d, byDate.get(d), entries.filter((e) => e.date === d)).rings.perfect) perfectThisMonth++;
  }
  const lastNights = days.filter((d) => d.sleep && d.date >= addDays(today, -6));
  const sleepAvg = lastNights.length >= 3 ? lastNights.reduce((n, d) => n + sleepMinutes(d.sleep!.asleep, d.sleep!.woke), 0) / lastNights.length : undefined;
  const waterDays = days.filter((d) => d.date >= addDays(today, -6) && d.waterMl);
  const waterTarget = targetsFor(settings, today).waterMl;
  const lastSleep = byDate.get(today)?.sleep;
  const streak = stepStreakFor(settings, days, today);
  const ws = weekStart(today);
  const reached = arrivals(steps);
  const plan = settings.plan;
  return {
    today,
    laps: settings.loopSteps ? Math.round(totalSteps / settings.loopSteps) : undefined,
    waistChange: recentWaists.length >= 2 ? recentWaists[recentWaists.length - 1].waistStanding! - recentWaists[0].waistStanding! : undefined,
    stepsChangePct: lastWeek > 0 && thisWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : undefined,
    topFoods,
    nextCity: pos.to?.name,
    nextCityEta: pos.to && pace > 0.1 ? addDays(today, Math.ceil((pos.to.km - km) / pace)) : undefined,
    road: pos.to && pace > 0.1 && reached.length ? { from: pos.from.name, to: pos.to.name, kmPerDay: pace } : undefined,
    sessions: done.length,
    sessionNames: plan && plan.sessions.length >= 2 ? [plan.sessions[0].name, plan.sessions[1].name] : undefined,
    perfectToday: tRings.rings.perfect,
    perfectThisMonth,
    proteinYesterday: yRings.totals.protein,
    proteinClosedYesterday: yRings.rings.protein.closed,
    sleepAvg,
    waterL: waterDays.length >= 3 ? waterDays.reduce((n, d) => n + d.waterMl!, 0) / waterDays.length / 1000 : undefined,
    waterHitRecently: days.some((d) => d.date >= yesterday && (d.waterMl ?? 0) >= waterTarget),
    bedBeforeMidnight: !!lastSleep && lastSleep.asleep >= 1200 && lastSleep.asleep < 1440,
    streak: streak.current,
    shields: streak.shields,
    recordsThisWeek: sets.filter((x) => x.mark === '!!' && x.date >= ws).length,
    morningBest: settings.morningBest,
    unlocked,
    benchSessions: settings.equipment.bench ? done.length : undefined,
    season: ['11', '12', '01', '02'].includes(today.slice(5, 7)) ? 'wedding' : 'other',
  };
}

/** A slow news ticker across the top of Today. Tap it. You know you want to. */
export function Ticker({ ctx }: { ctx: HeadlineCtx }) {
  const toast = useToast();
  const items = useMemo(() => headlines(ctx), [ctx]);
  const onTap = (e: MouseEvent) => {
    void bump('ticker-tap');
    const el = (e.target as HTMLElement).closest('[data-rick]');
    if (el) {
      void bump('rickroll');
      toast({ kicker: 'Never gonna give you up', text: 'You just got rickrolled.', sub: 'Some headlines are traps.', tone: 'lavender' });
    }
  };
  const row = (hidden: boolean) =>
    items.map((h, i) => (
      <span key={`${hidden}${i}`} aria-hidden={hidden || undefined} data-rick={h === RICKROLL ? '1' : undefined}>
        {h}
      </span>
    ));
  return (
    <div className="ticker" role="marquee" aria-label="News ticker" onClick={onTap}>
      <div className="tick">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
