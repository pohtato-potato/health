import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { achievementById } from '../domain/achievements';
import { parseDay, dayKey, type DayKey } from '../domain/dates';
import { festivalOn } from '../domain/festivals';
import { fmt1, fmtDayShort, fmtInt } from '../domain/format';
import { findSession } from '../domain/plan';
import { weightTrend } from '../domain/streaks';
import { arrivals } from '../domain/walk';
import { bump } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useSessions, useSettings, useToday } from '../db/hooks';
import { dayRings } from '../state/derived';

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

export function OnThisDayCard() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const wins = useLiveQuery(() => db.wins.toArray(), []);
  const unlocks = useLiveQuery(() => db.achievements.toArray(), []);
  const [open, setOpen] = useState(false);
  if (!settings || !days || !entries || !sessions || !wins || !unlocks) return null;

  const has = (d: DayKey) => days.some((x) => x.date === d && (x.steps !== undefined || x.morning)) || entries.some((e) => e.date === d);
  const pick = memoryDates(today).find((m) => has(m.date));
  if (!pick) return null;
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

  return (
    <button
      type="button"
      className="card"
      style={{ textAlign: 'left' }}
      onClick={() => {
        if (!open) void bump('onthisday', { day: today });
        setOpen(!open);
      }}
      aria-expanded={open}
    >
      <div className="row base">
        <div className="lbl lav">On this day</div>
        <div className="t12 q">{fmtDayShort(d)}</div>
      </div>
      <div className="sf" style={{ fontSize: 20 }}>
        {pick.label}
      </div>
      <div className="t14 lh">{lines.length ? `${lines.join(', ')}.` : 'A quiet day, logged all the same.'}</div>
      {open && (
        <div className="col gap6">
          {then !== undefined && now !== undefined && (
            <div className="t14 lh">
              Your trend was {fmt1(then)} kg. Today it’s {fmt1(now)} kg{Math.abs(now - then) >= 0.1 ? `: ${fmt1(Math.abs(now - then))} kg ${now < then ? 'down' : 'up'} since` : ''}.
            </div>
          )}
          {dayWins.map((w) => (
            <div key={w.id} className="t14 gold lh">
              Win: {w.text}
            </div>
          ))}
          {dayAch.length > 0 && <div className="t14 q lh">Unlocked: {dayAch.join(', ')}.</div>}
          {es.length > 0 && <div className="t13 q lh">Ate: {[...new Set(es.filter((e) => e.kind === 'food').map((e) => e.name))].slice(0, 5).join(', ') || 'quick adds'}.</div>}
        </div>
      )}
      {!open && <div className="t12 q">Tap to remember more</div>}
    </button>
  );
}

