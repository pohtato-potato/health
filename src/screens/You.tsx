import { useState } from 'react';
import { benchmarkProgress } from '../domain/benchmark';
import { addDays, daysBetween, dayKey } from '../domain/dates';
import { fmtDayMonth, fmtDayMonthFrom, fmtInt } from '../domain/format';
import { lastFullWeek } from '../domain/weekly';
import { chapterAt, kmFromSteps, positionAt, STRIDE_M } from '../domain/walk';
import { whatIf } from '../domain/whatIf';
import { lastMonth } from '../domain/film';
import { useAllDays, useAllSets, useEntriesBetween, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { Dial } from '../ui/Dial';
import { Icon, type IconName } from '../ui/Icon';
import { BenchmarkCard } from './BenchmarkCard';
import { useLevel, wornTitle } from './Character';
import { Heatmap } from './Heatmap';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The four big doors from s13; everything else sits in the list below them. */
const DOORS: { label: string; sub: string; path: string; icon: IconName }[] = [
  { label: 'Tracks', sub: 'Every measure', path: '/tracks', icon: 'tracks' },
  { label: 'Medicines', sub: 'Courses, stock, visits', path: '/medicines', icon: 'pill' },
  { label: 'Night sky', sub: 'A star per perfect day', path: '/sky', icon: 'night' },
  { label: 'Diary', sub: 'Every day', path: '/diary', icon: 'calendar' },
];
const MORE: { label: string; sub: string; path: string }[] = [
  { label: 'Achievements', sub: 'Sets and progress', path: '/achievements' },
  { label: 'Character', sub: 'Stats, titles and the wardrobe', path: '/character' },
  { label: 'Journey clock', sub: 'The whole journey as one day', path: '/journey' },
  { label: 'Reveal day', sub: 'Sealed until the day', path: '/reveal' },
  { label: 'Experiments', sub: 'Change one thing, see what moves', path: '/experiments' },
];

/** The You tab: the body benchmark first, then doors, every day, the week's review and what-ifs. */
export function You() {
  const settings = useSettings();
  const today = useToday();
  const lv = useLevel();
  const days = useAllDays();
  const measurements = useMeasurements();
  const sessions = useSessions();
  const sets = useAllSets();
  const entries = useEntriesBetween(addDays(today, -62), today);
  if (!settings || !days || !measurements || !sessions || !sets || !entries) return <div className="page" />;
  const title = lv ? wornTitle(settings, lv.unlocked, lv.level) : undefined;
  const start = dayKey(new Date(settings.createdAt));
  const dayN = daysBetween(start, today) + 1;
  const total = settings.goalDate ? daysBetween(start, settings.goalDate) + 1 : undefined;
  const reviewWeek = lastFullWeek(today);
  const hasLastWeek = days.some((d) => d.date >= reviewWeek && d.date <= addDays(reviewWeek, 6));

  return (
    <div className="page">
      <div className="row top">
        <div className="col gap4">
          <h1 className="h1">You</h1>
          <div className="t14 q">
            Day {fmtInt(dayN)}
            {total ? ` of ${fmtInt(total)}` : ''}
            {title ? ` · the ${title}` : ''}
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="Settings" onClick={() => go('/settings')}>
          <Icon name="more" size={22} />
        </button>
      </div>

      {settings.heightCm ? <BenchmarkCard measurements={measurements} heightCm={settings.heightCm} today={today} reveal={settings.goalDate} /> : null}

      <div className="doors">
        {DOORS.map((d) => (
          <button key={d.path} type="button" className="door" onClick={() => go(d.path)}>
            <Icon name={d.icon} size={20} color="var(--quiet)" />
            <span className="t15">{d.label}</span>
            <span className="t12 q">{d.sub}</span>
          </button>
        ))}
      </div>

      <div className="list">
        {MORE.map((m) => (
          <button key={m.path} type="button" className="li" onClick={() => go(m.path)}>
            <span className="s">
              <span>{m.label}</span>
              <small>{m.sub}</small>
            </span>
            <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
          </button>
        ))}
      </div>

      {hasLastWeek && (
        <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onClick={() => go('/review', { w: reviewWeek })}>
          <span className="col gap2 grow" style={{ textAlign: 'left' }}>
            <span className="t16">The week of {fmtDayMonth(reviewWeek)} is ready</span>
            <span className="t13 q">A short review, tap through</span>
          </span>
          <span className="btn sm">Open</span>
        </button>
      )}

      {Number(today.slice(8, 10)) <= 7 && days.some((d) => d.date.startsWith(lastMonth(today))) && (
        <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onClick={() => go('/film')}>
          <span className="col gap2 grow" style={{ textAlign: 'left' }}>
            <span className="t16">Your {MONTH_NAMES[Number(lastMonth(today).slice(5, 7)) - 1]} film</span>
            <span className="t13 q">Last month in big numbers, titled by your workout song</span>
          </span>
          <span className="btn sm">Play</span>
        </button>
      )}

      <Heatmap settings={settings} today={today} days={days} entries={entries} sessions={sessions} sets={sets} />

      <WhatIfCard days={days} measurements={measurements} heightCm={settings.heightCm} today={today} />

    </div>
  );
}

/** Drag average steps or sessions and watch the walk and reveal-day dates move. */
function WhatIfCard({ days, measurements, heightCm, today }: { days: ReturnType<typeof useAllDays> & object; measurements: ReturnType<typeof useMeasurements> & object; heightCm?: number; today: string }) {
  const [steps, setSteps] = useState(0);
  const [sessionsDelta, setSessions] = useState(0);
  const km = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
  const chapter = chapterAt(km);
  const recent = days.filter((d) => d.date >= addDays(today, -14) && d.date < today && d.steps !== undefined);
  const perDay = recent.length ? recent.reduce((n, d) => n + d.steps!, 0) / recent.length : 8000;
  const b = heightCm ? benchmarkProgress(measurements, heightCm, today) : undefined;
  const base = { kmSoFar: km, kmToGo: Math.max(0, chapter.end - km), stepsPerDay: perDay, strideM: STRIDE_M, whtr: b?.current ?? 0, whtrPerDay: b?.slope ?? 0, goal: b?.goal ?? 0.5 };
  const now = whatIf(base, {});
  const then = whatIf(base, { stepsPerDay: steps, sessionsPerWeek: sessionsDelta });
  const end = positionAt(chapter.end).from.name;
  return (
    <div className="card">
      <div className="lbl">What if</div>
      <Dial value={steps} step={500} min={-3000} max={5000} onChange={setSteps} unit="steps a day" label="Change in average steps a day" major={2} />
      <div className="row" style={{ gap: 8, justifyContent: 'flex-start' }} role="radiogroup" aria-label="Extra sessions a week">
        <span className="t13 q">Sessions a week</span>
        {[0, 1, 2].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={sessionsDelta === n} className={`chip sm${sessionsDelta === n ? ' on' : ''}`} onClick={() => setSessions(n)}>
            {n ? `+${n}` : 'as now'}
          </button>
        ))}
      </div>
      <div className="row t15">
        <span>{end}</span>
        <span className="tn">
          {fmtDayMonthFrom(addDays(today, then.walkDays), today)}
          {then.walkDays !== now.walkDays ? <span className="t12 q"> (was {fmtDayMonthFrom(addDays(today, now.walkDays), today)})</span> : null}
        </span>
      </div>
      {then.revealDays !== undefined && now.revealDays !== undefined && (
        <div className="row t15">
          <span>Waist ÷ height under {base.goal}</span>
          <span className="tn">
            {fmtDayMonthFrom(addDays(today, then.revealDays), today)}
            {then.revealDays !== now.revealDays ? <span className="t12 q"> (was {fmtDayMonthFrom(addDays(today, now.revealDays), today)})</span> : null}
          </span>
        </div>
      )}
      <div className="t12 d lh">The walk date is plain arithmetic. The waist's response to steps and sessions is a rough rule of thumb, not a promise.</div>
    </div>
  );
}
