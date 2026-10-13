import { useEffect, useState, type ReactNode } from 'react';
import { bump } from '../db/actions';
import { addDays, dayKey, dayRange, daysBetween, weekStart, type DayKey } from '../domain/dates';
import { fmt1, fmtDayMonth, fmtDayShort, fmtDuration, fmtInt, fmtLitres } from '../domain/format';
import { sleepMinutes } from '../domain/rings';
import { weightTrend } from '../domain/streaks';
import type { CheckIn, Day, FoodEntry, Measurement, SetEntry, Settings, TrainingSession } from '../domain/types';
import { useAllDays, useAllEntries, useAllSets, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { back, go, openSheet, useRoute } from '../router';
import { BarChart, MiniBars, Spark, TrendChart, type Point } from '../ui/Charts';
import { Seg } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { DrinksExtras, JointsBody, SleepExtras, SourcesCard, StepsExtras, StrengthCard, WaistExtras, WaterExtras } from './TrackExtras';
import { forecastData } from '../state/forecastData';
import { MiniRing } from '../ui/Rings';
import { WeekGapCard, WeightInsights } from './MaintenanceCards';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { nextCheckInDate } from './Photos';
import { openShakeStat } from '../ui/Shake';
import { doneSessions, flagEvents, stepStreakFor, targetsFor, weeksFor } from '../state/derived';
import { autoMarkers } from '../domain/markers';
import { BenchmarkCard } from './BenchmarkCard';
import { sri } from '../domain/sleepRegularity';

type Kind = 'steps' | 'sleep' | 'weight' | 'waist' | 'calories' | 'protein' | 'water' | 'training' | 'drinks' | 'joints' | 'custom';

interface Data {
  settings: Settings;
  today: DayKey;
  days: Map<DayKey, Day>;
  entries: FoodEntry[];
  sessions: TrainingSession[];
  measurements: Measurement[];
  sets: SetEntry[];
  checkins: CheckIn[];
}

function useData(): Data | undefined {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const measurements = useMeasurements();
  const sets = useAllSets();
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  if (!settings || !days || !entries || !sessions || !measurements || !sets || !checkins) return undefined;
  return { settings, today, days: new Map(days.map((d) => [d.date, d])), entries, sessions, measurements, sets, checkins };
}

function foodByDay(entries: FoodEntry[]) {
  const m = new Map<DayKey, { kcal: number; protein: number; drinks: number }>();
  for (const e of entries) {
    const cur = m.get(e.date) ?? { kcal: 0, protein: 0, drinks: 0 };
    cur.kcal += e.kcal;
    cur.protein += e.protein;
    if (e.kind === 'drink') cur.drinks += e.drink?.count ?? 1;
    m.set(e.date, cur);
  }
  return m;
}

/** The daily value of a measure, or null when nothing was logged. */
function valueOn(kind: Kind, d: DayKey, data: Data, food: ReturnType<typeof foodByDay>): number | null {
  const day = data.days.get(d);
  switch (kind) {
    case 'steps':
      return day?.steps ?? null;
    case 'sleep':
      return day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : null;
    case 'weight':
      return day?.weightKg ?? null;
    case 'water':
      return day?.waterMl ?? null;
    case 'calories':
      return food.get(d)?.kcal ?? null;
    case 'protein':
      return food.get(d) ? Math.round(food.get(d)!.protein) : null;
    case 'drinks':
      return food.get(d)?.drinks ?? null;
    default:
      return null;
  }
}

function avgOf(vals: (number | null)[]): number | null {
  const xs = vals.filter((v): v is number => v !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function Tracks() {
  const data = useData();
  if (!data) return <div className="page" />;
  const { settings, today } = data;
  const food = foodByDay(data.entries);
  const last = (n: number) => dayRange(addDays(today, -(n - 1)), today);
  const week = last(7);
  const two = last(14);
  const series = (k: Kind, ds: DayKey[]) => ds.map((d) => valueOn(k, d, data, food));
  const t = targetsFor(settings, today);
  const weighIns = [...data.days.values()].filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, kg: d.weightKg! }));
  const trend = weightTrend(weighIns);
  const waist = data.measurements.filter((m) => m.waistStanding !== undefined);
  const weeks = weeksFor(settings, data.sessions, today);
  const monthStart = today.slice(0, 8) + '01';
  const drinkNights = [...food.entries()].filter(([d, v]) => d >= monthStart && v.drinks > 0);
  const avgSteps = avgOf(series('steps', week));
  const avgSleep = avgOf(series('sleep', week));
  const avgKcal = avgOf(series('calories', week));
  const avgProtein = avgOf(series('protein', week));
  const avgWater = avgOf(series('water', week));

  const tile = (kind: Kind, name: string, color: string, sub: string, value: ReactNode, chart?: ReactNode) => (
    <button type="button" className="ttile" onClick={() => go('/track', { k: kind })}>
      <div className="row base" style={{ gap: 6, flexWrap: 'wrap', rowGap: 2 }}>
        <span className="nm" style={{ color }}>
          {name}
        </span>
        <span className="sub">{sub}</span>
      </div>
      <div className="row" style={{ alignItems: 'flex-end', gap: 6 }}>
        <span className="v">{value}</span>
        {chart}
      </div>
    </button>
  );

  return (
    <div className="page">
      <div className="col gap6">
        <div className="row">
          <h1 className="h1">Tracks</h1>
          <button type="button" className="chip sm" onClick={() => openShakeStat()}>
            A random stat
          </button>
        </div>
        <div className="t15 q">Everything you measure, and what it's telling you.</div>
      </div>
      <div className="grid2">
        {tile('steps', 'Steps', 'var(--sage)', '7-day avg', avgSteps !== null ? fmtInt(avgSteps) : '—', <MiniBars values={series('steps', two)} color="var(--sage)" target={t.steps} width={50} />)}
        {tile(
          'sleep',
          'Sleep',
          'var(--blue)',
          '7-night avg',
          avgSleep !== null ? (
            <>
              {Math.floor(avgSleep / 60)}h {Math.round(avgSleep % 60)}
              <small>m</small>
            </>
          ) : (
            '—'
          ),
          <Spark values={series('sleep', two)} color="var(--blue)" width={46} />,
        )}
        {tile(
          'weight',
          'Weight',
          'var(--pearl)',
          'trend',
          trend.length ? (
            <>
              {fmt1(trend[trend.length - 1].trend)}
              <small> kg</small>
            </>
          ) : (
            '—'
          ),
          <Spark values={trend.slice(-14).map((p) => p.trend)} color="var(--pearl)" width={46} />,
        )}
        {tile(
          'waist',
          'Waist',
          'var(--pearl)',
          'standing',
          waist.length ? (
            <>
              {waist[waist.length - 1].waistStanding}
              <small> in</small>
            </>
          ) : (
            '—'
          ),
          <Spark values={waist.slice(-8).map((m) => m.waistStanding ?? null)} color="var(--pearl)" width={46} />,
        )}
        {tile('calories', 'Calories', 'var(--apricot)', '7-day avg', avgKcal !== null ? fmtInt(avgKcal) : '—', <MiniBars values={series('calories', two)} color="var(--apricot)" width={50} />)}
        {tile(
          'protein',
          'Protein',
          'var(--lavender)',
          '7-day avg',
          avgProtein !== null ? (
            <>
              {Math.round(avgProtein)}
              <small> g</small>
            </>
          ) : (
            '—'
          ),
          <MiniBars values={series('protein', two)} color="var(--lavender)" target={t.proteinG} width={50} />,
        )}
        {tile(
          'water',
          'Water',
          'var(--blue)',
          '7-day avg',
          avgWater !== null ? (
            <>
              {fmtLitres(Math.round(avgWater / 50) * 50)}
              <small> L</small>
            </>
          ) : (
            '—'
          ),
          <MiniBars values={series('water', two)} color="var(--blue)" target={t.waterMl} width={50} />,
        )}
        {tile(
          'training',
          'Training',
          'var(--text)',
          'this week',
          <>
            {Math.min(weeks.thisWeek, weeks.perWeek)}
            <small> of {weeks.perWeek}</small>
          </>,
        )}
        <PhotosTile />
        <ReadinessTile data={data} />
        <JointsTile data={data} />
        {tile(
          'drinks',
          'Drinks',
          'var(--gold)',
          'this month',
          <>
            {drinkNights.length}
            <small> night{drinkNights.length === 1 ? '' : 's'}</small>
          </>,
        )}
      </div>
      <div className="t12 d center lh">Tap a track for its chart, its history and what it's telling you.</div>
    </div>
  );
}

const NAMES: Record<Kind, { title: string; color: string }> = {
  steps: { title: 'Steps', color: 'var(--sage)' },
  sleep: { title: 'Sleep', color: 'var(--blue)' },
  weight: { title: 'Weight', color: 'var(--pearl)' },
  waist: { title: 'Waist and shape', color: 'var(--pearl)' },
  calories: { title: 'Calories', color: 'var(--apricot)' },
  protein: { title: 'Protein', color: 'var(--lavender)' },
  water: { title: 'Water', color: 'var(--blue)' },
  training: { title: 'Training', color: 'var(--text)' },
  drinks: { title: 'Drinks', color: 'var(--gold)' },
  joints: { title: 'Joints', color: 'var(--apricot)' },
  custom: { title: 'Your track', color: 'var(--pearl)' },
};

/** "Knee and wrist", from the plan's flag groups. */
export function jointsTitle(settings: Settings): string {
  const groups = [...new Set(settings.plan?.flags.map((f) => f.group) ?? [])];
  if (!groups.length) return 'Joints';
  const lower = groups.map((g, i) => (i ? g.toLowerCase() : g));
  return lower.length === 1 ? lower[0] : `${lower.slice(0, -1).join(', ')} and ${lower[lower.length - 1]}`;
}

export function TrackPage() {
  const { params } = useRoute();
  const kind = (params.get('k') as Kind) || 'steps';
  useEffect(() => {
    void bump('tracks', { value: `${dayKey()}|${kind}` });
  }, [kind]);
  const data = useData();
  const [span, setSpan] = useState<'7' | '30' | '90'>('30');
  if (!data) return <div className="page bare" />;
  const { settings, today } = data;
  const food = foodByDay(data.entries);
  const n = Number(span);
  const range = dayRange(addDays(today, -(n - 1)), today);
  const t = targetsFor(settings, today);
  const meta = NAMES[kind];
  const label = (d: DayKey) => (n <= 7 ? fmtDayShort(d).slice(0, 3) : fmtDayMonth(d));

  let body: ReactNode;
  if (kind === 'weight') {
    const weighIns = [...data.days.values()].filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, kg: d.weightKg! }));
    const trend = weightTrend(weighIns);
    const byDate = new Map(trend.map((p) => [p.date, p]));
    const markers = new Map(autoMarkers([...data.days.values()], settings).map((m) => [m.date, m.text]));
    const points: Point[] = range.map((d) => ({ label: label(d), value: byDate.get(d)?.kg ?? null, trend: byDate.get(d)?.trend ?? null, marker: markers.get(d) }));
    const shown = range.filter((d) => markers.has(d));
    const latest = trend[trend.length - 1];
    const monthAgo = [...trend].reverse().find((p) => p.date <= addDays(today, -28));
    const weeklies = weeklyAverages(weighIns, today, 8);
    body = (
      <>
        <Headline value={latest ? `${fmt1(latest.trend)} kg` : '—'} sub={latest ? `Trend today · last weigh-in ${fmt1(latest.kg)} kg on ${fmtDayMonth(latest.date)}` : 'Log your weight in the morning log.'} />
        <div className="card">
          <TrendChart points={points} color={meta.color} fmt={(v) => fmt1(v)} />
          {shown.length > 0 && (
            <div className="t12 q lh">
              {shown.map((d) => `${fmtDayMonth(d)}: ${markers.get(d)}`).join(' · ')}
            </div>
          )}
        </div>
        {settings.heightCm ? <BenchmarkCard measurements={data.measurements} heightCm={settings.heightCm} today={today} /> : null}
        {monthAgo && latest && (
          <div className="t14 q lh">
            A month ago your trend was {fmt1(monthAgo.trend)} kg: {latest.trend <= monthAgo.trend ? `${fmt1(monthAgo.trend - latest.trend)} kg down` : `${fmt1(latest.trend - monthAgo.trend)} kg up`} since then. The trend
            smooths out water and salt, so one morning's number never swings it much.
          </div>
        )}
        <WeightInsights settings={settings} days={[...data.days.values()]} entries={data.entries} measurements={data.measurements} today={today} />
        <ListCard title="Weekly averages" rows={weeklies.map((w) => [`Week of ${fmtDayMonth(w.week)}`, w.avg !== null ? `${fmt1(w.avg)} kg` : '—'])} />
      </>
    );
  } else if (kind === 'joints') {
    body = <JointsBody settings={settings} sessions={data.sessions} days={[...data.days.values()]} today={today} />;
  } else if (kind === 'waist') {
    const ms = data.measurements;
    const points: Point[] = ms.filter((m) => m.waistStanding !== undefined).map((m) => ({ label: fmtDayMonth(m.date), value: m.waistStanding!, trend: m.waistStanding! }));
    const last = [...ms].reverse().find((m) => m.waistStanding !== undefined);
    const first = ms.find((m) => m.waistStanding !== undefined);
    const shoulders = [...ms].reverse().find((m) => m.shoulders !== undefined);
    const ratio = shoulders?.shoulders && last?.waistStanding ? shoulders.shoulders / last.waistStanding : undefined;
    body = (
      <>
        <Headline
          value={last ? `${last.waistStanding} in` : '—'}
          sub={last && first && first !== last ? `${fmt1(first.waistStanding! - last.waistStanding!)} in down since ${fmtDayMonth(first.date)}` : 'Standing straight, at the navel'}
        />
        {points.length > 1 && (
          <div className="card">
            <TrendChart points={points} color={meta.color} fmt={(v) => fmt1(v)} />
          </div>
        )}
        {ratio && (
          <div className="card">
            <div className="lbl pearl">Shoulder-to-waist ratio</div>
            <div className="num" style={{ fontSize: 34 }}>
              {ratio.toFixed(2)}
            </div>
            <div className="t13 q lh">The one number that best tracks looking athletic in a t-shirt. It should rise.</div>
          </div>
        )}
        <WaistExtras measurements={ms} settings={settings} checkins={data.checkins} />
        <ListCard
          title="Measurements"
          rows={[...ms].reverse().map((m) => [
            fmtDayMonth(m.date),
            [m.waistStanding !== undefined && `${m.waistStanding} in standing`, m.waistSlouched !== undefined && `${m.waistSlouched} slouched`, m.shoulders !== undefined && `shoulders ${m.shoulders} in`]
              .filter(Boolean)
              .join(' · '),
          ])}
        />
        <button type="button" className="btn block" onClick={() => openSheet('waist')}>
          Measure now
        </button>
      </>
    );
  } else if (kind === 'training') {
    const done = doneSessions(data.sessions);
    const weeks = Array.from({ length: 12 }, (_, i) => addDays(weekStart(today), -7 * (11 - i)));
    const counts = weeks.map((w) => done.filter((s) => s.date >= w && s.date <= addDays(w, 6)).length);
    const wk = weeksFor(settings, data.sessions, today);
    body = (
      <>
        <Headline value={`${wk.streak} week${wk.streak === 1 ? '' : 's'}`} sub={`Weeks in a row with ${wk.perWeek} sessions. Best: ${wk.best}.`} />
        <div className="card">
          <BarChart points={weeks.map((w, i) => ({ label: fmtDayMonth(w), value: counts[i] }))} color="var(--text)" target={wk.perWeek} fmt={(v) => String(v)} />
        </div>
        <div className="t13 q lh">Sessions beyond {wk.perWeek} a week earn nothing extra. Rest is where the muscle gets built.</div>
        <StrengthCard sets={data.sets} today={today} />
        <ListCard title="Sessions" rows={[...done].reverse().slice(0, 20).map((s) => [fmtDayShort(s.date), `Session ${s.session}${s.short ? ' · short' : ''}`])} onRow={(i) => go('/session/view', { id: [...done].reverse()[i].id })} />
      </>
    );
  } else {
    const vals = range.map((d) => valueOn(kind, d, data, food));
    const points: Point[] = range.map((d, i) => ({ label: label(d), value: vals[i] }));
    const avg = avgOf(vals);
    const target = kind === 'steps' ? t.steps : kind === 'sleep' ? t.sleepMin : kind === 'protein' ? t.proteinG : kind === 'water' ? t.waterMl : kind === 'calories' ? t.kcalMin : undefined;
    const fmtV = (v: number) =>
      kind === 'sleep' ? fmtDuration(v) : kind === 'water' ? `${fmtLitres(Math.round(v / 50) * 50)} L` : kind === 'protein' ? `${Math.round(v)} g` : fmtInt(v);
    const hit = vals.filter((v) => v !== null && target !== undefined && (kind === 'calories' ? v >= t.kcalMin && v <= t.kcalMax : v >= target)).length;
    const logged = vals.filter((v) => v !== null).length;
    let extra: ReactNode = null;
    if (kind === 'steps') {
      const streak = stepStreakFor(settings, [...data.days.values()], today);
      extra = (
        <div className="card">
          <div className="row t15">
            <span>Step streak</span>
            <span>
              {streak.current} day{streak.current === 1 ? '' : 's'} · best {streak.best}
            </span>
          </div>
          <div className="row t15">
            <span>Shields</span>
            <span>{streak.shields} of 2</span>
          </div>
          <div className="t13 q lh">
            A shield for every 7 days in a row, spent automatically on a missed day.
          </div>
        </div>
      );
    }
    if (kind === 'calories') {
      extra = <div className="t13 q lh">A day counts when it lands between {fmtInt(t.kcalMin)} and {fmtInt(t.kcalMax)}: the floor matters as much as the ceiling.</div>;
    }
    if (kind === 'drinks') {
      extra = <div className="t13 q lh">Logged quietly. No rings, no judgement: just a record.</div>;
    }
    body = (
      <>
        <Headline value={avg !== null ? fmtV(avg) : '—'} sub={`Average over ${logged} logged day${logged === 1 ? '' : 's'}${target !== undefined && kind !== 'drinks' ? ` · on target ${hit} of ${logged}` : ''}`} />
        <div className="card">
          <BarChart points={points} color={meta.color} target={kind === 'drinks' ? undefined : target} fmt={fmtV} />
        </div>
        {extra}
        {kind === 'steps' && <StepsExtras days={[...data.days.values()]} today={today} range={range} settings={settings} />}
        {kind === 'sleep' && (() => {
          const r = sri([...data.days.values()].filter((d) => d.date <= today && d.date >= addDays(today, -7)));
          return r !== undefined ? (
            <div className="card">
              <div className="row base">
                <div className="lbl blue">Regularity</div>
                <div className="num tn" style={{ fontSize: 24 }}>
                  {r}
                </div>
              </div>
              <div className="t13 q lh">How alike your sleep and wake times were night to night this week, 100 being identical. An approximation of the Sleep Regularity Index from your logged times.</div>
            </div>
          ) : null;
        })()}
        {kind === 'sleep' && <SleepExtras days={[...data.days.values()]} today={today} settings={settings} />}
        {kind === 'calories' && <WeekGapCard entries={data.entries} today={today} />}
        {kind === 'calories' && <SourcesCard entries={data.entries} range={range} kind="kcal" />}
        {kind === 'protein' && <SourcesCard entries={data.entries} range={range} kind="protein" />}
        {kind === 'water' && <WaterExtras days={[...data.days.values()]} range={range} />}
        {kind === 'drinks' && <DrinksExtras entries={data.entries} days={[...data.days.values()]} today={today} />}
        <ListCard
          title="Day by day"
          rows={[...range]
            .reverse()
            .filter((d) => valueOn(kind, d, data, food) !== null)
            .slice(0, 30)
            .map((d) => [fmtDayShort(d), fmtV(valueOn(kind, d, data, food)!)])}
        />
        {kind === 'steps' && (
          <button type="button" className="btn block" onClick={() => openSheet('steps')}>
            Log steps
          </button>
        )}
      </>
    );
  }

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/tracks')}>
        <Icon name="left" size={20} stroke={1.8} />
        Tracks
      </button>
      <div className="row">
        <h1 className="h1" style={{ color: kind === 'training' ? undefined : meta.color }}>
          {kind === 'joints' ? jointsTitle(settings) : meta.title}
        </h1>
        {kind !== 'waist' && kind !== 'training' && kind !== 'joints' && (
          <div style={{ width: 150 }}>
            <Seg
              options={[
                { id: '7', label: '7 d' },
                { id: '30', label: '30 d' },
                { id: '90', label: '90 d' },
              ]}
              value={span}
              onChange={setSpan}
            />
          </div>
        )}
      </div>
      {body}
    </div>
  );
}

function Headline({ value, sub }: { value: string; sub: string }) {
  return (
    <div className="col gap6">
      <div className="num" style={{ fontSize: 44 }}>
        {value}
      </div>
      <div className="t14 q lh">{sub}</div>
    </div>
  );
}

function ListCard({ title, rows, onRow }: { title: string; rows: [string, string][]; onRow?: (i: number) => void }) {
  if (!rows.length) return null;
  return (
    <div className="card" style={{ gap: 0 }}>
      <div className="lbl" style={{ paddingBottom: 6 }}>
        {title}
      </div>
      {rows.map(([a, b], i) =>
        onRow ? (
          <button key={i} type="button" className="sess" style={{ minHeight: 44 }} onClick={() => onRow(i)}>
            <span className="t14">{a}</span>
            <span className="t14 q tn">{b}</span>
          </button>
        ) : (
          <div key={i} className="sess" style={{ minHeight: 44 }}>
            <span className="t14">{a}</span>
            <span className="t14 q tn">{b}</span>
          </div>
        ),
      )}
    </div>
  );
}

function weeklyAverages(points: { date: DayKey; kg: number }[], today: DayKey, n: number) {
  const out: { week: DayKey; avg: number | null }[] = [];
  for (let i = 0; i < n; i++) {
    const w = addDays(weekStart(today), -7 * i);
    const xs = points.filter((p) => p.date >= w && p.date <= addDays(w, 6)).map((p) => p.kg);
    out.push({ week: w, avg: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null });
  }
  return out.filter((w) => w.avg !== null);
}

function PhotosTile() {
  const checkins = useLiveQuery(async () => (await db.checkins.toArray()).sort((a, b) => a.date.localeCompare(b.date)), []);
  if (!checkins) return null;
  const last = checkins[checkins.length - 1];
  const due = nextCheckInDate(checkins);
  return (
    <button type="button" className="ttile" onClick={() => go('/photos')}>
      <div className="row base" style={{ gap: 6 }}>
        <span className="nm" style={{ color: 'var(--pearl)' }}>
          Photos
        </span>
        <Icon name="lock" size={14} color="var(--dim)" />
      </div>
      <div className="col gap2">
        <span className="v" style={{ fontSize: 22 }}>
          {last ? fmtDayMonth(last.date) : 'None yet'}
        </span>
        <span className="sub">{due ? `Next check-in ${fmtDayMonth(due)}` : 'Start your first check-in'}</span>
      </div>
    </button>
  );
}

function ReadinessTile({ data }: { data: Data }) {
  const fd = forecastData(data.settings, data.today, [...data.days.values()], data.entries.filter((e) => e.date >= addDays(data.today, -2)), data.sessions, data.sets);
  const r = fd.readiness;
  return (
    <button type="button" className="ttile" onClick={() => go('/readiness')}>
      <div className="row base" style={{ gap: 6 }}>
        <span className="nm" style={{ color: 'var(--blue)' }}>
          Readiness
        </span>
        <span className="sub">today</span>
      </div>
      <div className="row" style={{ alignItems: 'flex-end', gap: 6 }}>
        <span className="v">
          {r.score}
          <small> {r.label.toLowerCase()}</small>
        </span>
        <MiniRing progress={r.score / 100} size={30} width={3} label={`Readiness ${r.score}`}>
          {''}
        </MiniRing>
      </div>
    </button>
  );
}

function JointsTile({ data }: { data: Data }) {
  const plan = data.settings.plan;
  if (!plan?.flags.length) return null;
  const events = flagEvents(plan, data.sessions, [...data.days.values()]);
  const last = events[events.length - 1];
  const since = last ? daysBetween(last.date, data.today) : undefined;
  return (
    <button type="button" className="ttile" onClick={() => go('/track', { k: 'joints' })}>
      <div className="row base" style={{ gap: 6 }}>
        <span className="nm" style={{ color: 'var(--apricot)' }}>
          {jointsTitle(data.settings)}
        </span>
      </div>
      <div className="col gap2">
        <span className="v" style={{ fontSize: 22 }}>
          {since === undefined ? 'All clear' : since === 0 ? 'Flagged today' : `${since} day${since === 1 ? '' : 's'}`}
        </span>
        <span className="sub">{since === undefined ? 'Nothing flagged yet' : since === 0 ? 'Take it easy' : 'since the last flag'}</span>
      </div>
    </button>
  );
}
