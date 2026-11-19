import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { achievementById } from '../domain/achievements';
import { parseDay, dayKey, type DayKey } from '../domain/dates';
import { festivalOn } from '../domain/festivals';
import { fmt1, fmtDayMonth, fmtDayShort, fmtInt } from '../domain/format';
import { findSession } from '../domain/plan';
import { weightTrend } from '../domain/streaks';
import { arrivals } from '../domain/walk';
import { bump } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useSessions, useSettings, useToday } from '../db/hooks';
import { dayRings } from '../state/derived';
import { TodayPanel } from './today/TodayLayout';

/** The same date a year, six months, three months or a month back: the oldest one with something in it. */
export function memoryDates(today: DayKey): { date: DayKey; label: string }[] {
  const back = (months: number) => {
    const d = parseDay(today);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() - months);
    // Skip dates that don't exist, like 31 June.
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (day > last) return undefined;
    d.setDate(day);
    return dayKey(d);
  };
  return [
    { m: 12, label: 'A year ago today' },
    { m: 6, label: 'Six months ago today' },
    { m: 3, label: 'Three months ago today' },
    { m: 1, label: 'A month ago today' },
  ].flatMap((x) => {
    const date = back(x.m);
    return date ? [{ date, label: x.label }] : [];
  });
}

const HIDDEN_KEY = 'health.onthisday.hidden';
function readHidden(): string | null {
  try {
    return localStorage.getItem(HIDDEN_KEY);
  } catch {
    return null;
  }
}

export function OnThisDayCard() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const wins = useLiveQuery(() => db.wins.toArray(), []);
  const unlocks = useLiveQuery(() => db.achievements.toArray(), []);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => readHidden() === today);
  if (!settings || !days || !entries || !sessions || !wins || !unlocks) return null;

  const has = (d: DayKey) => days.some((x) => x.date === d && (x.steps !== undefined || x.morning)) || entries.some((e) => e.date === d);
  const pick = memoryDates(today).find((m) => has(m.date));
  if (!pick || hidden) return null;
  const d = pick.date;
  const day = days.find((x) => x.date === d);
  const es = entries.filter((e) => e.date === d);
  const { rings } = dayRings(settings, d, day, es);
  const trend = weightTrend(days.filter((x) => x.weightKg !== undefined).map((x) => ({ date: x.date, kg: x.weightKg! })));
  const then = [...trend].reverse().find((t) => t.date <= d)?.trend;
  const now = trend[trend.length - 1]?.trend;
  const session = sessions.find((s) => s.status === 'done' && s.date === d);
  const steps = new Map(days.filter((x) => x.steps !== undefined).map((x) => [x.date, x.steps!]));
  const city = arrivals(steps).find((a) => a.date === d && a.km > 0)?.name;
  const lines = [
    day?.steps !== undefined && `${fmtInt(day.steps)} steps`,
    rings.perfect && 'a perfect day',
    session && `${(settings.plan && findSession(settings.plan, session.session)?.name) ?? `Session ${session.session}`}`,
    city && `you walked into ${city}`,
    festivalOn(d)?.day === d && festivalOn(d)!.name,
    day?.nightOut && 'a night out',
  ].filter(Boolean) as string[];
  const dayWins = wins.filter((w) => w.date === d);
  const dayAch = unlocks.filter((u) => u.date === d && !u.quiet).map((u) => achievementById(u.id)?.name).filter(Boolean) as string[];

  const todaySteps = days.find((x) => x.date === today)?.steps;
  const rows: MemoryRow[] = [
    ...(then !== undefined && now !== undefined ? [{ name: 'Weight', then: fmt1(then), now: `${fmt1(now)} kg` }] : []),
    ...(day?.steps !== undefined && todaySteps !== undefined ? [{ name: 'Steps', then: fmtInt(day.steps), now: fmtInt(todaySteps) }] : []),
  ];
  const extras = [
    ...dayWins.map((w) => `Win: ${w.text}`),
    ...(dayAch.length ? [`Unlocked: ${dayAch.join(', ')}.`] : []),
    ...(es.length ? [`Ate: ${[...new Set(es.filter((e) => e.kind === 'food').map((e) => e.name))].slice(0, 5).join(', ') || 'quick adds'}.`] : []),
  ];
  return (
    <MemoryCard
      when={`${pick.label.replace(/ today$/, '')}, on ${fmtDayMonth(d)}.`}
      dateLabel={fmtDayShort(d)}
      line={lines.length ? `${lines.join(', ')}.` : 'A quiet day, logged all the same.'}
      rows={rows}
      extras={extras}
      open={open}
      onHide={() => {
        setHidden(true);
        try {
          localStorage.setItem(HIDDEN_KEY, today);
        } catch {
          /* storage can be unavailable; it stays hidden until reload */
        }
      }}
      onToggle={() => {
        if (!open) void bump('onthisday', { day: today });
        setOpen(!open);
      }}
    />
  );
}

export interface MemoryRow { name: string; then: string; now: string }

/**
 * On this day (board 10 `h10-onthis`), on Home on a memory date only: a taped snapshot of that day drops in, with the
 * date and the day's line in text, then that day's numbers against today's. More (wins, unlocks, what was eaten) opens
 * under it.
 */
export function MemoryCard({ when, dateLabel, line, rows, extras, open, onToggle, onHide }: { when: string; dateLabel: string; line: string; rows: MemoryRow[]; extras: string[]; open: boolean; onToggle: () => void; onHide?: () => void }) {
  return (
    <TodayPanel id="onthis" title="On this day" chip={when.replace(/, on .*$/, '')} className="otd" action={onHide && (
      <button type="button" className="otd-close" onClick={onHide}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        Close
      </button>
    )}>
      <div className="otd-snap">
        <i className="otd-tape" aria-hidden="true" />
        <span className="otd-date">{dateLabel}</span>
        <p className="otd-line">{line}</p>
      </div>
      {rows.length > 0 && (
        <dl className="otd-rows">
          {rows.map((r) => (
            <div key={r.name} className="otd-row">
              <dt>{r.name}</dt>
              <dd><span className="otd-then tn">{r.then}</span> <span aria-hidden="true">→</span><span className="sr-only">, now</span> <b className="tn">{r.now}</b></dd>
            </div>
          ))}
        </dl>
      )}
      {open && extras.map((x) => <p key={x} className="otd-x">{x}</p>)}
      {extras.length > 0 && (
        <div className="otd-acts">
          <button type="button" className="otd-more" aria-expanded={open} onClick={onToggle}>{open ? 'Less' : 'Remember more'}</button>
        </div>
      )}
    </TodayPanel>
  );
}
