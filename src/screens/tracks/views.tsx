import { useState, type CSSProperties } from 'react';
import { patchDay } from '../../db/actions';
import { addDays, dayRange, type DayKey } from '../../domain/dates';
import { fmtDayMonth, fmtDuration, fmtInt } from '../../domain/format';
import { beforeFlag, drinksAnswer, habitStrength, jointCalendar, NOT_ENOUGH, proteinClock, shapeCone, sleepBalance, socialJetLag, type LiftChange } from '../../domain/trackRules';
import { readinessHits } from '../../domain/trackStats';
import type { Day, FoodEntry, TrainingSession } from '../../domain/types';
import { flagEvents, targetsFor } from '../../state/derived';
import { DrawnLine } from '../../ui/you/DrawnLine';
import { GOLD } from '../../ui/you/palette';
import { Reveal } from '../../ui/you/Reveal';
import type { TrackData } from './data';

const v = (o: Record<string, string | number>) => o as CSSProperties;

export function Bars({ rows }: { rows: { name: string; w: number; val: string; c?: string }[] }) {
  return <Reveal className="yu-bars-l">{rows.map((r, i) => <div key={r.name} style={v({ '--w': `${r.w}%`, '--i': i, ...(r.c ? { '--c': r.c } : {}) })}><span>{r.name}</span><i /><b>{r.val}</b></div>)}</Reveal>;
}

export function SortedDays({ values, goal }: { values: number[]; goal: number }) {
  if (!values.length) return <div className="yu-card"><span className="yu-q">No steps logged in the last 28 days.</span></div>;
  const hi = Math.max(...values, 1);
  return (
    <section className="yu-sec">
      <Reveal className="yu-sorted" >
        {values.map((s, i) => <i key={i} style={v({ '--h': `${Math.max(4, (s / hi) * 100)}%`, '--i': i, background: i === values.length - 1 ? GOLD : s < goal * 0.5 ? '#ff9aa2' : 'var(--c)' })} />)}
      </Reveal>
      <span className="yu-q">Your {values.length} logged days of the last 28, lowest to highest, best in gold. {values.filter((s) => s >= goal).length} reached your goal. Lowest {fmtInt(values[0])}, highest {fmtInt(hi)}.</span>
    </section>
  );
}

const HABIT_DAYS = 90;
export function HabitView({ days, today, goal }: { days: Pick<Day, 'date' | 'steps'>[]; today: DayKey; goal: number }) {
  const by = new Map(days.map((d) => [d.date, d.steps]));
  const series = habitStrength(dayRange(addDays(today, -(HABIT_DAYS - 1)), today).map((d) => (by.get(d) ?? 0) >= goal));
  const now = series[series.length - 1];
  if (!now) return <div className="yu-card"><span className="yu-q">Habit strength shows after the first day you reach your goal.</span></div>;
  return (
    <section className="yu-sec">
      <DrawnLine vals={series} c="var(--c)" c2="#4fd8e6" h={70} />
      <span className="yu-q">{now} of 100. Each day you reach your goal pulls it up, and each day you miss pulls it down a little. It doesn't reset.</span>
    </section>
  );
}

export function ProteinClock({ entries, kindOf }: { entries: FoodEntry[]; kindOf: (d: DayKey) => string }) {
  const c = proteinClock(entries, kindOf);
  if (!c.office.length && !c.home.length) return <div className="yu-card"><span className="yu-q">No protein logged in this range yet.</span></div>;
  const row = (name: string, xs: number[], k: string) => xs.length > 0 && <div><span>{name}</span>{xs.map((x, i) => <i key={i} style={v({ left: `${x}%`, '--c': k, '--i': Math.min(i, 12) })} />)}</div>;
  return (
    <section className="yu-sec"><h2>Protein clock</h2>
      <Reveal className="yu-pclock">{row('Office days', c.office, 'var(--c)')}{row('Other days', c.home, '#ffd27a')}<p><span>6 am</span><span>midnight</span></p></Reveal>
    </section>
  );
}

export function ConeCard({ trend, today }: { trend: { date: DayKey; trend: number }[]; today: DayKey }) {
  const cone = shapeCone(trend, today);
  if (!cone) return <div className="yu-card"><b>Forecast</b><span className="yu-q">The forecast needs at least 5 weigh-ins in four weeks.</span></div>;
  const all = [...cone.series, cone.low, cone.high];
  const [lo, hi] = [Math.min(...all), Math.max(...all)];
  const y = (n: number) => 10 + (1 - (n - lo) / (hi - lo || 1)) * 110;
  const X = 150;
  const line = cone.series.map((s, i) => `${(i / Math.max(1, cone.series.length - 1)) * X},${y(s)}`).join(' ');
  return (
    <section className="yu-sec"><h2>Four weeks on</h2>
      <Reveal className="yu-cone">
        <svg viewBox="0 0 320 130" aria-hidden="true">
          <polygon className="yu-fill" points={`${X},${y(cone.now)} 320,${y(cone.high)} 320,${y(cone.low)}`} fill="var(--c)" fillOpacity=".35" />
          <polyline className="yu-draw2" pathLength={1} points={line} fill="none" stroke="var(--c)" strokeWidth="3" strokeLinecap="round" />
          <line x1={X} x2="320" y1={y(cone.now)} y2={y(cone.mid)} stroke="var(--c)" strokeDasharray="4 5" strokeWidth="2" />
        </svg>
      </Reveal>
      <span className="yu-q">If the last four weeks carry on: about {cone.mid.toFixed(1)} kg, somewhere from {cone.low.toFixed(1)} to {cone.high.toFixed(1)}.</span>
    </section>
  );
}

export function BalanceView({ days, today, target }: { days: Day[]; today: DayKey; target: number }) {
  const short = sleepBalance(days, today, target);
  const lag = socialJetLag(days.filter((d) => d.date >= addDays(today, -27) && d.date <= today));
  const logged = days.some((d) => d.sleep && d.date >= addDays(today, -6) && d.date <= today);
  return (
    <div className="yu-rows">
      <div><span>Sleep balance, this week</span><b>{!logged ? 'Not logged' : short ? `${fmtDuration(short)} behind` : 'On target'}</b></div>
      <div><span>Social jet lag</span><b>{lag === undefined ? 'Needs weekdays and weekends' : lag ? `${fmtDuration(lag)}, weekends` : 'None'}</b></div>
    </div>
  );
}

export function StrengthView({ rows }: { rows: LiftChange[] }) {
  const spoken = rows.filter((r) => r.word !== NOT_ENOUGH);
  const quiet = rows.filter((r) => r.word === NOT_ENOUGH);
  const peak = Math.max(1, ...spoken.map((r) => Math.abs(r.pct ?? 0)));
  if (!rows.length) return <div className="yu-card"><span className="yu-q">Log a session with weights and each lift shows here.</span></div>;
  return (
    <section className="yu-sec"><h2>Each lift, last two weeks against before</h2>
      {spoken.length > 0 && <Bars rows={spoken.map((r) => ({ name: r.name, w: Math.max(6, (Math.abs(r.pct ?? 0) / peak) * 100), val: r.word, c: (r.pct ?? 0) < 0 ? '#ff9aa2' : undefined }))} />}
      {quiet.length > 0 && <span className="yu-q">{NOT_ENOUGH}: {quiet.map((r) => r.name).join(', ')}.</span>}
    </section>
  );
}

export function CallsView({ sessions }: { sessions: TrainingSession[] }) {
  const h = readinessHits(sessions.filter((s) => s.status === 'done'));
  return (
    <div className="yu-rows">
      <div><span>Did readiness call it?</span><b>{h.total ? `${h.agreed} of ${h.total} times` : 'Not enough sessions yet'}</b></div>
    </div>
  );
}

const CAL_DAYS = 28;
export function JointCalendarView({ data }: { data: TrackData }) {
  const { settings, today } = data;
  const all = [...data.days.values()];
  const events = flagEvents(settings.plan, data.sessions, all);
  const logged = [...all.filter((d) => d.answers || d.morning), ...data.sessions.filter((s) => s.status === 'done')];
  const twinges = data.sets.filter((s) => s.discomfort);
  const cal = jointCalendar(today, logged, events, CAL_DAYS, twinges);
  const INK = { blank: '#ede6da1f', fine: '#5fe3b4', twinge: '#ffc27a', flag: '#ff6f7d' };
  const MARK = { blank: '', fine: '', twinge: '~', flag: '!' };
  const lastFlag = events.map((e) => e.date).sort().pop();
  const before = lastFlag ? beforeFlag(lastFlag, all, data.sessions, targetsFor(settings, today).sleepMin) : undefined;
  return (
    <section className="yu-sec"><h2>Last 28 days</h2>
      <Reveal className="yu-cal">{cal.map((c, i) => <i key={c.date} style={v({ '--i': i, background: INK[c.state] })} title={`${fmtDayMonth(c.date)}: ${c.state}`}>{MARK[c.state]}</i>)}</Reveal>
      <div className="yu-key"><span style={v({ '--k': INK.fine })}>Fine</span><span style={v({ '--k': INK.twinge })}>~ Twinge</span><span style={v({ '--k': INK.flag })}>! Flag</span><span style={v({ '--k': INK.blank })}>Blank: not logged</span></div>
      {lastFlag && <div className="yu-card"><b>Before the last flag, {fmtDayMonth(lastFlag)}</b><span className="yu-q">{before ?? 'Nothing stands out in the data.'}</span></div>}
    </section>
  );
}

export function NoDrinks({ data }: { data: TrackData }) {
  const { today } = data;
  const day = data.days.get(today);
  const [saving, setSaving] = useState(false);
  const a = drinksAnswer(today, day, data.entries);
  if (typeof a === 'number') return <div className="yu-card"><b>{a} drink{a === 1 ? '' : 's'} logged today</b></div>;
  return (
    <section className="yu-sec">
      <div className="yu-seg">
        <button type="button" aria-pressed={a === 'none'} disabled={saving} onClick={async () => {
          setSaving(true);
          await patchDay(today, { noDrinks: a !== 'none' });
          setSaving(false);
        }}>No drinks today</button>
      </div>
      <span className="yu-q">{a === 'none' ? 'Answered: none today.' : 'Not logged yet. A blank stays blank, and never reads as none.'}</span>
    </section>
  );
}
