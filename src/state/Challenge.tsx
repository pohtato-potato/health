import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { pickChallenge, type DaySummary } from '../domain/challenges';
import { addDays, dayRange, daysBetween, type DayKey } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { sleepMinutes } from '../domain/rings';
import type { Day, FoodEntry, Settings } from '../domain/types';
import { bump } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useEntriesBetween, useSettings, useToday } from '../db/hooks';
import { useMoments } from '../ui/Moments';
import { checklistSlots, dayRings } from './derived';

const monthEnd = (month: string): DayKey => {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return addDays(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`, -1);
};
const prevMonth = (month: string) => addDays(`${month}-01`, -1).slice(0, 7);

export function summaries(settings: Settings, days: Day[], entries: FoodEntry[], from: DayKey, to: DayKey): DaySummary[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const byEntries = new Map<DayKey, FoodEntry[]>();
  for (const e of entries) byEntries.set(e.date, [...(byEntries.get(e.date) ?? []), e]);
  const slots = checklistSlots(settings);
  return dayRange(from, to).map((date) => {
    const day = byDate.get(date);
    const es = byEntries.get(date) ?? [];
    const { rings, targets } = dayRings(settings, date, day, es);
    const sleep = day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : 0;
    return {
      date,
      logged: es.length > 0,
      perfect: rings.perfect,
      proteinOk: rings.protein.closed,
      sleepOk: sleep >= targets.sleepMin,
      waterSpread: day?.waterParts === 7,
      morning: !!day?.morning,
      checklist: slots.length > 0 && slots.every((s) => day?.ticks?.[s.key]),
      steps: day?.steps ?? 0,
    };
  });
}

export function useChallenge() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const month = today.slice(0, 7);
  const from = addDays(`${month}-01`, -30);
  const entries = useEntriesBetween(from, today);
  if (!settings || !days || !entries) return undefined;
  // Chosen from the thirty days before the month began, so it holds still all month.
  const all = summaries(settings, days, entries, from, today);
  const def = pickChallenge(month, all, { checklist: checklistSlots(settings).length > 0 });
  const list = all.filter((d) => d.date >= `${month}-01`);
  const last = prevMonth(month);
  const lastMonthSteps = days.filter((d) => d.date.startsWith(last)).reduce((n, d) => n + (d.steps ?? 0), 0);
  const progress = def.progress(list, { lastMonthSteps, month });
  return { def, month, progress, done: progress >= def.goal, daysLeft: daysBetween(today, monthEnd(month)), lastMonthSteps };
}

/** Celebrates the month's challenge the moment it's done, once. */
export function ChallengeWatcher() {
  const c = useChallenge();
  const { show } = useMoments();
  const key = c ? `challenge:${c.month}` : '';
  const seen = useLiveQuery(async () => (key ? !!(await db.seen.get(key)) : true), [key]);
  useEffect(() => {
    if (!c || !c.done || seen !== false) return;
    void bump('challenge-done', { value: c.month });
    show({ kind: 'milestone', key, value: c.def.unit === '%' ? `${c.progress}%` : String(c.progress), unit: c.def.unit === '%' ? undefined : c.def.unit, title: `${c.def.title}: done.`, text: `${c.def.text} Challenge complete, with ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'} of the month to spare.` });
  }, [c?.done, seen, key]);
  return null;
}

export function ChallengeCard() {
  const c = useChallenge();
  if (!c) return null;
  const pct = Math.min(1, c.progress / c.def.goal);
  const monthName = new Date(Number(c.month.slice(0, 4)), Number(c.month.slice(5, 7)) - 1, 1).toLocaleString('en-IN', { month: 'long' });
  return (
    <div className="card">
      <div className="row base">
        <div className="lbl sage">{monthName} challenge</div>
        <div className="t12 q">{c.done ? 'Done' : `${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'} left`}</div>
      </div>
      <div className="sf" style={{ fontSize: 22 }}>
        {c.def.title}
      </div>
      <div className="t14 q lh">{c.def.text}</div>
      <div className="bar lg">
        <i style={{ width: `${pct * 100}%`, background: c.done ? 'var(--gold)' : 'var(--sage)' }} />
      </div>
      <div className="t13 tn">
        {c.def.unit === '%' ? `${c.progress}% of last month's ${fmtInt(c.lastMonthSteps)} steps` : `${Math.min(c.progress, c.def.goal)} of ${c.def.goal} ${c.def.unit}`}
      </div>
    </div>
  );
}
