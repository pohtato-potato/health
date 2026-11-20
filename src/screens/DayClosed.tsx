import { Suspense, lazy, useEffect, useState } from 'react';
import { useAllDays, useAllEntries, useAllSets, useEntries, useSessions, useSettings } from '../db/hooks';
import { keepMomentOnce } from '../db/moments';
import { dayRecords, type DayRecord, type RecordKind } from '../domain/dayRecords';
import { addDays, dayKey, dayOfLogging, parseDay } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { dayDoses } from '../domain/medicines';
import { findSession, realSets } from '../domain/plan';
import { placeFor } from '../domain/places';
import { tonightTarget, usualWake } from '../domain/sleepRegularity';
import type { DaySummary } from '../domain/usualDay';
import { spokenLine } from '../domain/voice';
import { kmFromSteps, positionAt } from '../domain/walk';
import { back, go } from '../router';
import { storyWeek, weekNumber } from '../domain/weekly';
import { DayCard, breakout, dayTier, tierLine, type DayStat } from './close/DayCard';
import { MonthBinder, type BinderDay } from './close/MonthBinder';
import { WeekCard } from './close/WeekCard';
import { nextStopLine } from '../walk/lines';
import { dayWalk } from '../walk/dayWalk';
import { stepsByDay } from '../walk/runs';
import { DayWalker } from './walk/DayWalker';
import { dayRings, nextUp, targetsFor } from '../state/derived';

// Football's kick-off loads with Football's data.
const DayKickOff = lazy(() => import('./today/FootballCard').then((m) => ({ default: m.DayKickOff })));

const totalsOf = (es: { kcal: number; protein: number }[]) => es.reduce((t, e) => ({ kcal: t.kcal + e.kcal, protein: t.protein + e.protein }), { kcal: 0, protein: 0 });
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const RECORD_NAME: Record<RecordKind, string> = { steps: 'Steps', sleep: 'Sleep', protein: 'Protein', training: 'Training' };
const RECORD_INK: Record<RecordKind, string> = { steps: 'var(--steps)', sleep: '#93c3dc', protein: 'var(--protein)', training: '#ff9a76' };
/** O41 9 (O42 finding 33): a record gets its own moment on the closed day, gold with its kind named. */
function RecordMoment({ r }: { r: DayRecord }) {
  return (
    <div className="record-moment" role="status" style={{ ['--ink' as string]: RECORD_INK[r.kind] }}>
      <span className="record-k">New record · {RECORD_NAME[r.kind]}</span>
      <b className="record-v">{r.value}</b>
      <span className="t15">{r.sub}</span>
    </div>
  );
}

/** Day closed (s19): the totals against targets, training and the walk, a Gremlin line, tomorrow, and a star for a perfect day. */
export function DayClosed({ date, summary: s, onDone, opp }: { date: string; summary: DaySummary; onDone: () => void; opp?: string }) {
  const settings = useSettings();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const entries = useEntries(date);
  const allEntries = useAllEntries();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const records = days && sets && allEntries ? dayRecords(date, days, allEntries, realSets(sets)) : [];
  const recKey = records.map((r) => r.kind).join(',');
  // Finding 33 (O42): a record is kept on Earned's shelf once, when its day is closed.
  useEffect(() => {
    for (const r of records) void keepMomentOnce(`record-${r.kind}:${date}`, 'record', date, `${RECORD_NAME[r.kind]} record: ${r.line}`);
  }, [recKey, date]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!settings || !days || !sessions || !sets || !entries) return <div className="page dayclosed" />;
  const day = days.find((d) => d.date === date);
  const { rings, targets } = dayRings(settings, date, day, entries);
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
  const place = placeFor(day, settings);
  const tomorrowPlace = placeFor(days.find((d) => d.date === tomorrow) ?? day, settings);
  const up = nextUp(settings, sessions, sets, days);
  const upName = up && settings.plan ? findSession(settings.plan, up.sessionId)?.name : undefined;
  const bed = tonightTarget(usualWake(days, tomorrowPlace.id, date) ?? 450, targetsFor(settings, date).sleepMin);
  const line = spokenLine(settings, date, rings.perfect ? 'perfect' : done.length ? 'trained' : 'evening', date);
  // Finding 19 (O42): a day closed after it has passed speaks in the past tense; "tomorrow" is then today.
  const now = dayOfLogging(Date.now());
  const past = date < now;
  const dayName = WEEKDAYS[parseDay(date).getDay()];
  const nextLabel = past && tomorrow <= now ? (tomorrow === now ? 'Today' : WEEKDAYS[parseDay(tomorrow).getDay()]) : 'Tomorrow';
  const month = MONTHS[parseDay(date).getMonth()];

  const row = (k: string, v: string) => (
    <div className="diary-row" style={{ textAlign: 'left' }}>
      <span className="t14 q">{k}</span>
      <span className="t14 right">{v}</span>
    </div>
  );
  const recCount = realSets(sets).filter((x) => x.date === date && x.mark === '!!').length;
  const sessionName = done.length ? findSession(settings.plan!, done[0].session)?.name ?? `Session ${done[0].session}` : undefined;
  const ringList = [rings.kcal.progress, rings.protein.progress, rings.steps.progress, rings.sleep.progress].slice(0, rings.of);
  const where = place.kind === 'home' ? 'at home' : place.kind === 'office' ? 'at the office' : `at ${place.name}`;
  const prevDay = days.find((d) => d.date === addDays(date, -1));
  const brk = breakout({
    debut: done.length > 0 && !sessions.some((x) => x.status === 'done' && x.date < date),
    records: records.map((r) => ({ line: r.line })),
    prevOpen: !!prevDay && !(prevDay.foodDone || prevDay.partial),
    status: day?.status,
  });
  const stats: DayStat[] = [
    { name: 'Calories', value: fmtInt(s.kcal), ink: 'var(--kcal)' },
    { name: 'Protein', value: `${s.protein} g`, ink: 'var(--protein)' },
    { name: 'Steps', value: s.steps === undefined ? '—' : fmtInt(s.steps), ink: 'var(--steps)' },
    ...(sessionName ? [{ name: sessionName, value: recCount ? `${recCount} record${recCount === 1 ? '' : 's'}` : 'done', ink: 'var(--dc-train)' }] : []),
  ];

  // The month (c5-binder): one small card per closed day; a day not closed stays empty.
  const d0 = parseDay(date);
  const monthDays = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
  const byDate = new Map<string, typeof allEntries>();
  for (const e of allEntries ?? []) (byDate.get(e.date) ?? byDate.set(e.date, []).get(e.date)!).push(e);
  const cardOf = (k: string) => {
    const dd = days.find((x) => x.date === k);
    if (!dd || !(dd.foodDone || dd.partial)) return undefined;
    const r = dayRings(settings, k, dd, byDate.get(k) ?? []).rings;
    const prev = days.find((x) => x.date === addDays(k, -1));
    const b = breakout({ debut: sessions.some((x) => x.status === 'done' && x.date === k) && !sessions.some((x) => x.status === 'done' && x.date < k), records: [], prevOpen: !!prev && !(prev.foodDone || prev.partial), status: dd.status });
    return { tier: dayTier(r.closed, r.of), rings: [r.kcal.progress, r.protein.progress, r.steps.progress, r.sleep.progress].slice(0, r.of), ribbon: b, tot: totalsOf(byDate.get(k) ?? []), steps: dd.steps, place: placeFor(dd, settings) };
  };
  const cellOf = (k: string): BinderDay => {
    const c = k === date ? { tier: dayTier(rings.closed, rings.of), rings: ringList, ribbon: brk } : cardOf(k);
    return c ? { date: k, tier: c.tier, rings: c.rings, ribbon: c.ribbon?.ink } : { date: k };
  };
  const monthCells = Array.from({ length: monthDays }, (_, i) => cellOf(dayKey(new Date(d0.getFullYear(), d0.getMonth(), i + 1))));
  // The week (c6-week): closing a Sunday also deals the week's card, Monday to today.
  const weekKeys = d0.getDay() === 0 ? Array.from({ length: 7 }, (_, i) => addDays(date, i - 6)) : [];
  const weekTot = weekKeys.reduce((t, k) => {
    const x = totalsOf(byDate.get(k) ?? []);
    return { kcal: t.kcal + x.kcal, protein: t.protein + x.protein, steps: t.steps + (days.find((d) => d.date === k)?.steps ?? 0) };
  }, { kcal: 0, protein: 0, steps: 0 });
  const picked = openDay && openDay !== date ? cardOf(openDay) : undefined;

  return (
    <div className="page dayclosed closed-sky">
      <h1 className="dc-h1">{dayName}’s card</h1>
      <DayCard reveal tier={dayTier(rings.closed, rings.of)} dateLabel={`${parseDay(date).getDate()} ${month.slice(0, 3)}`} title={`${dayName} ${where}`} rings={ringList} stats={stats} ribbon={brk} foot={brk ? brk.foot : opp ? `Shape sealed for ${opp}` : tierLine({ kcal: rings.kcal.closed, protein: rings.protein.closed, steps: rings.steps.closed, sleep: rings.sleep.closed }, rings.of, { kcal: rings.kcal.state, proteinG: targets.proteinG - s.protein, steps: s.stepsLeft ?? targets.steps, sleepMin: targets.sleepMin - rings.sleep.value })} />
      {rings.perfect && <p className="k-q dc-perfect">A perfect day. Its star is in {month}’s sky.</p>}
      <div className="dc-acts">
        <button type="button" className="k-act quiet" onClick={() => go('/reports/week', { w: storyWeek(date) })}>
          The week
        </button>
        <button type="button" className="k-act" onClick={() => back('/today')}>
          Good night
        </button>
      </div>
      {/* Under the buttons, so they stay on the first screen of the owner's phone on a Sunday too (360 × 745). */}
      {weekKeys.length > 0 && (
        <WeekCard days={weekKeys.map(cellOf)} week={weekNumber(date)} today={now} onOpen={(k) => setOpenDay(k === date ? null : k)} stats={[
          { name: 'Calories', value: fmtInt(weekTot.kcal), ink: 'var(--kcal)' },
          { name: 'Protein', value: `${fmtInt(weekTot.protein)} g`, ink: 'var(--protein)' },
          { name: 'Steps', value: fmtInt(weekTot.steps), ink: 'var(--steps)' },
        ]} />
      )}
      {picked && openDay && (
        <div className="mb-open">
          <DayCard tier={picked.tier} dateLabel={`${parseDay(openDay).getDate()} ${month.slice(0, 3)}`} title={`${WEEKDAYS[parseDay(openDay).getDay()]} ${picked.place.kind === 'home' ? 'at home' : picked.place.kind === 'office' ? 'at the office' : `at ${picked.place.name}`}`} rings={picked.rings} ribbon={picked.ribbon} foot={picked.ribbon?.foot} stats={[
            { name: 'Calories', value: fmtInt(Math.round(picked.tot.kcal)), ink: 'var(--kcal)' },
            { name: 'Protein', value: `${Math.round(picked.tot.protein)} g`, ink: 'var(--protein)' },
            { name: 'Steps', value: picked.steps === undefined ? '—' : fmtInt(picked.steps), ink: 'var(--steps)' },
          ]} />
          <button type="button" className="k-act quiet" onClick={() => setOpenDay(null)}>Back to the month</button>
        </div>
      )}
      <MonthBinder month={month} days={monthCells} total={monthDays} today={now} onOpen={(k) => setOpenDay(k === date ? null : k)} />
      {records.map((r) => <RecordMoment key={r.kind} r={r} />)}
      <div className="card" style={{ gap: 0, padding: '4px 16px' }}>
        {done.length > 0 && row(findSession(settings.plan!, done[0].session)?.name ?? `Session ${done[0].session}`, rec ? `${rec.exercise.toLowerCase()} record, ${rec.reps ?? rec.seconds}` : 'done')}
        {s.checklist.total > 0 && row('Checklist', `${s.checklist.done} of ${s.checklist.total}${meds.length ? ` · ${doses.onTime} on time` : ''}`)}
        <DayWalker d={dayWalk(date, stepsByDay(days))} start={past ? `${dayName} morning` : undefined} line={`${walkedToday !== undefined ? `${walkedToday.toFixed(1)} km ${past ? `on ${dayName}` : 'today'}` : 'no steps logged'}${pos.to ? ` · ${nextStopLine(pos.to.name, pos.to.km - total, typicalKm)}` : ''}`} />
      </div>
      {line && <div className="voice center">“{line}”</div>}
      <div className="card" style={{ gap: 2 }}>
        <span className="t15">
          {nextLabel} · {tomorrowPlace.name}
          {upName ? ` · ${upName}` : ''}
        </span>
        <span className="t13 q">{bed.text}</span>
      </div>
      <Suspense fallback={null}><DayKickOff date={date} /></Suspense>
      <button type="button" className="link dc-edit" onClick={onDone}>
        Edit the day
      </button>
    </div>
  );
}
