import { useAllDays, useAllSets, useEntries, useSessions, useSettings } from '../db/hooks';
import { addDays, parseDay } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { dayDoses } from '../domain/medicines';
import { findSession, realSets } from '../domain/plan';
import { placeFor } from '../domain/places';
import { tonightTarget, usualWake } from '../domain/sleepRegularity';
import type { DaySummary } from '../domain/usualDay';
import { voiceFor, voiceLine } from '../domain/voice';
import { kmFromSteps, positionAt } from '../domain/walk';
import { back } from '../router';
import { nextStopLine } from '../walk/lines';
import { dayWalk } from '../walk/dayWalk';
import { stepsByDay } from '../walk/runs';
import { DayWalker } from './walk/DayWalker';
import { dayRings, nextUp, targetsFor } from '../state/derived';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Day closed (s19): the totals against targets, training and the walk, a Gremlin line, tomorrow, and a star for a perfect day. */
export function DayClosed({ date, summary: s, onDone }: { date: string; summary: DaySummary; onDone: () => void }) {
  const settings = useSettings();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const entries = useEntries(date);
  if (!settings || !days || !sessions || !sets || !entries) return <div className="page dayclosed" />;
  const day = days.find((d) => d.date === date);
  const { rings } = dayRings(settings, date, day, entries);
  const done = sessions.filter((x) => x.status === 'done' && x.date === date);
  const rec = realSets(sets)
    .filter((x) => x.date === date && x.mark === '!!')
    .sort((a, b) => (b.reps ?? 0) - (a.reps ?? 0))[0];
  const meds = settings.checklist.filter((i) => i.active && i.med);
  const doses = dayDoses(meds, day ?? { date }, settings);
  const walkedToday = day?.steps !== undefined ? kmFromSteps(day.steps) : undefined;
  const total = kmFromSteps(days.filter((d) => d.date <= date).reduce((n, d) => n + (d.steps ?? 0), 0));
  const pos = positionAt(total);
  const recentKm = days.filter((d) => d.date <= date && d.date > addDays(date, -14) && d.steps !== undefined).map((d) => kmFromSteps(d.steps!));
  const typicalKm = recentKm.length ? recentKm.reduce((a, b) => a + b, 0) / recentKm.length : undefined;
  const tomorrow = addDays(date, 1);
  const tomorrowPlace = placeFor(days.find((d) => d.date === tomorrow) ?? day, settings);
  const up = nextUp(settings, sessions, sets, days);
  const upName = up && settings.plan ? findSession(settings.plan, up.sessionId)?.name : undefined;
  const bed = tonightTarget(usualWake(days, tomorrowPlace.id, date) ?? 450, targetsFor(settings, date).sleepMin);
  const line = voiceLine(voiceFor(settings.voice, false, date), rings.perfect ? 'perfect' : done.length ? 'trained' : 'evening', date, {});
  const month = MONTHS[parseDay(date).getMonth()];

  const stat = (big: string, small: string, color: string, good: boolean) => (
    <span className="col" style={{ alignItems: 'center', gap: 2 }}>
      <b className="serif tn" style={{ fontSize: 26, color: good ? color : 'var(--quiet)' }}>
        {big}
      </b>
      <span className="t12 q">{small}</span>
    </span>
  );
  const row = (k: string, v: string) => (
    <div className="diary-row" style={{ textAlign: 'left' }}>
      <span className="t14 q">{k}</span>
      <span className="t14 right">{v}</span>
    </div>
  );

  return (
    <div className="page dayclosed closed-sky">
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 6, paddingTop: 24 }}>
        {rings.perfect && <span className="closed-star" aria-hidden="true" />}
        <h1 className="h1">{WEEKDAYS[parseDay(date).getDay()]}, closed</h1>
        <div className="t14 q">{rings.perfect ? `A perfect day. Its star is in ${month}’s sky.` : 'Closed and counted. The week evens it out.'}</div>
      </div>
      <div className="grid3" style={{ padding: '6px 0' }}>
        {stat(fmtInt(s.kcal), s.kcalInRange ? 'kcal · in range' : 'kcal', 'var(--kcal)', s.kcalInRange)}
        {stat(`${s.protein} g`, s.proteinClosed ? 'protein · met' : 'protein', 'var(--protein)', s.proteinClosed)}
        {stat(s.steps === undefined ? '—' : fmtInt(s.steps), s.steps === undefined ? 'steps' : s.stepsLeft ? `steps · ${fmtInt(s.stepsLeft)} short` : day?.eased ? 'steps · eased goal' : 'steps · goal', 'var(--steps)', s.steps !== undefined && !s.stepsLeft)}
      </div>
      <div className="card" style={{ gap: 0, padding: '4px 16px' }}>
        {done.length > 0 && row(findSession(settings.plan!, done[0].session)?.name ?? `Session ${done[0].session}`, rec ? `${rec.exercise.toLowerCase()} record, ${rec.reps ?? rec.seconds}` : 'done')}
        {s.checklist.total > 0 && row('Checklist', `${s.checklist.done} of ${s.checklist.total}${meds.length ? ` · ${doses.onTime} on time` : ''}`)}
        <DayWalker d={dayWalk(date, stepsByDay(days))} line={`${walkedToday !== undefined ? `${walkedToday.toFixed(1)} km today` : 'no steps logged'}${pos.to ? ` · ${nextStopLine(pos.to.name, pos.to.km - total, typicalKm)}` : ''}`} />
      </div>
      <div className="voice center">“{line}”</div>
      <div className="card" style={{ gap: 2 }}>
        <span className="t15">
          Tomorrow · {tomorrowPlace.name}
          {upName ? ` · ${upName}` : ''}
        </span>
        <span className="t13 q">{bed.text}</span>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn ghost grow" onClick={onDone}>
          Edit the day
        </button>
        <button type="button" className="btn grow" onClick={() => back('/today')}>
          Done
        </button>
      </div>
    </div>
  );
}
