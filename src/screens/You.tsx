import { useState } from 'react';
import { benchmarkProgress } from '../domain/benchmark';
import { addDays, daysBetween, dayKey } from '../domain/dates';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { lastFullWeek } from '../domain/weekly';
import { chapterAt, kmFromSteps, positionAt, STRIDE_M } from '../domain/walk';
import { whatIf } from '../domain/whatIf';
import { useAllDays, useAllSets, useEntriesBetween, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { Dial } from '../ui/Dial';
import { Icon, type IconName } from '../ui/Icon';
import { BenchmarkCard } from './BenchmarkCard';
import { useLevel, wornTitle } from './Character';
import { Heatmap } from './Heatmap';

const DOORS: { label: string; sub: string; path: string; icon: IconName }[] = [
  { label: 'Tracks', sub: 'Every measure', path: '/tracks', icon: 'tracks' },
  { label: 'Medicines', sub: 'Courses, stock, visits', path: '/medicines', icon: 'pill' },
  { label: 'Diary', sub: 'Every day', path: '/diary', icon: 'calendar' },
  { label: 'Achievements', sub: 'Sets and progress', path: '/achievements', icon: 'win' },
  { label: 'Character', sub: 'Stats and titles', path: '/character', icon: 'shield' },
  { label: 'Night sky', sub: 'A star per perfect day', path: '/sky', icon: 'night' },
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

      {settings.heightCm ? <BenchmarkCard measurements={measurements} heightCm={settings.heightCm} today={today} /> : null}

      <div className="doors">
        {DOORS.map((d) => (
          <button key={d.path} type="button" className="door" onClick={() => go(d.path)}>
            <Icon name={d.icon} size={20} color="var(--quiet)" />
            <span className="t15">{d.label}</span>
            <span className="t12 q">{d.sub}</span>
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
          {fmtDayMonth(addDays(today, then.walkDays))}
          {then.walkDays !== now.walkDays ? <span className="t12 q"> (was {fmtDayMonth(addDays(today, now.walkDays))})</span> : null}
        </span>
      </div>
      {then.revealDays !== undefined && now.revealDays !== undefined && (
        <div className="row t15">
          <span>Waist ÷ height under {base.goal}</span>
          <span className="tn">
            {fmtDayMonth(addDays(today, then.revealDays))}
            {then.revealDays !== now.revealDays ? <span className="t12 q"> (was {fmtDayMonth(addDays(today, now.revealDays))})</span> : null}
          </span>
        </div>
      )}
      <div className="t12 d lh">The walk date is plain arithmetic. The waist's response to steps and sessions is a rough rule of thumb, not a promise.</div>
    </div>
  );
}
