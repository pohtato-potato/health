import { useEffect, useState, type ReactNode } from 'react';
import { bump } from '../db/actions';
import { benchmarkProgress } from '../domain/benchmark';
import { addDays, dayKey, daysBetween, type DayKey } from '../domain/dates';
import { fmtDayShort, fmtDuration, fmtInt, fmtLitres } from '../domain/format';
import { dayDoses, refillBy } from '../domain/medicines';
import { sleepMinutes } from '../domain/rings';
import { sri } from '../domain/sleepRegularity';
import { prefOn, type Settings } from '../domain/types';
import { back, go, useRoute } from '../router';
import { flagEvents, targetsFor } from '../state/derived';
import { forecastData } from '../state/forecastData';
import { MiniBars, Spark } from '../ui/Charts';
import { Seg } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { strengthIndex } from '../domain/strength';
import { dayLabel, foodByDay, spanDays, useTrackData, type Span, type TrackData } from './tracks/data';
import { DrinksTrack } from './tracks/Drinks';
import { FoodTrack } from './tracks/Food';
import { JointsTrack } from './tracks/Joints';
import { ShapeTrack } from './tracks/Shape';
import { SleepTrack } from './tracks/Sleep';
import { StepsTrack } from './tracks/Steps';
import { HeroChart, TrackShell } from './tracks/Template';
import { TrainingTrack } from './tracks/Training';
import { WaterExtras } from './TrackExtras';
import { readinessText } from '../domain/readiness';

type Kind = 'food' | 'shape' | 'steps' | 'sleep' | 'training' | 'joints' | 'drinks' | 'water';

/** v1 links still land: weight and waist open Shape, calories and protein open Food. */
const LEGACY: Record<string, Kind> = { weight: 'shape', waist: 'shape', calories: 'food', protein: 'food' };

/** "Knee and wrist", from the plan's flag groups. */
export function jointsTitle(settings: Settings): string {
  const groups = [...new Set(settings.plan?.flags.map((f) => f.group) ?? [])];
  if (!groups.length) return 'Joints';
  const lower = groups.map((g, i) => (i ? g.toLowerCase() : g));
  return lower.length === 1 ? lower[0] : `${lower.slice(0, -1).join(', ')} and ${lower[lower.length - 1]}`;
}

/** You › Tracks: small multiples, one tile per measure with its number and a chart in its own colour; Medicines beneath. */
export function Tracks() {
  const data = useTrackData();
  const [span, setSpan] = useState<Span>('7');
  if (!data) return <div className="page" />;
  const { settings, today } = data;
  const range = spanDays(today, span);
  const food = foodByDay(data.entries);
  const all = [...data.days.values()];
  const t = targetsFor(settings, today);
  const avg = (xs: (number | null | undefined)[]) => {
    const v = xs.filter((x): x is number => x !== null && x !== undefined);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
  };
  const steps = range.map((d) => data.days.get(d)?.steps ?? null);
  const sleep = range.map((d) => {
    const s = data.days.get(d)?.sleep;
    return s ? sleepMinutes(s.asleep, s.woke) : null;
  });
  const kcal = range.map((d) => food.get(d)?.kcal ?? null);
  const protein = range.map((d) => food.get(d)?.protein ?? null);
  const b = settings.heightCm ? benchmarkProgress(data.measurements, settings.heightCm, today) : undefined;
  const waists = data.measurements.filter((m) => m.waistStanding !== undefined).slice(-8);
  const strength = strengthIndex(data.sets, today);
  const records = data.sets.filter((s) => s.mark === '!!' && s.date >= range[0]).length;
  const reg = sri(all.filter((d) => d.date <= today && d.date > addDays(today, -7)));
  const fd = forecastData(settings, today, all, data.entries.filter((e) => e.date >= addDays(today, -2)), data.sessions, data.sets);
  const scored = data.sessions.filter((s) => s.readiness !== undefined && s.date >= range[0]);
  const events = settings.plan?.flags.length ? flagEvents(settings.plan, data.sessions, all) : [];
  const lastFlag = events[events.length - 1];
  const drinkNights = range.filter((d) => (food.get(d)?.drinks ?? 0) > 0).length;
  const word = span === '7' ? 'this week' : `last ${span} days`;

  const tile = (kind: string, name: string, color: string, value: ReactNode, sub: string, chart?: ReactNode, path = '/track') => (
    <button type="button" className="ttile" onClick={() => go(path, path === '/track' ? { k: kind } : {})}>
      <span className="nm" style={{ color }}>
        {name}
      </span>
      <span className="v">{value}</span>
      <span className="row" style={{ alignItems: 'flex-end', gap: 6 }}>
        <span className="sub grow">{sub}</span>
        {chart}
      </span>
    </button>
  );

  const avgSteps = avg(steps);
  const avgSleep = avg(sleep);
  const avgK = avg(kcal);
  const avgP = avg(protein);

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>
      <div className="row top">
        <h1 className="h1">Tracks</h1>
        <div style={{ width: 150 }}>
          <Seg
            options={[
              { id: '7', label: '7 d' },
              { id: '30', label: '30 d' },
              { id: '90', label: '90 d' },
            ]}
            value={span}
            onChange={(s) => setSpan(s as Span)}
          />
        </div>
      </div>
      <div className="grid2 tracks-grid">
        {tile(
          'food',
          'Food',
          'var(--apricot)',
          avgK !== undefined ? fmtInt(avgK) : '—',
          avgP !== undefined ? `kcal · ${Math.round(avgP)} g protein` : 'nothing logged',
          <MiniBars values={kcal.slice(-14)} color="var(--apricot)" width={52} />,
        )}
        {tile('shape', 'Shape', 'var(--pearl)', b ? b.current.toFixed(2) : waists.length ? `${waists[waists.length - 1].waistStanding} in` : '—', b ? 'waist ÷ height' : 'waist', <Spark values={waists.map((m) => m.waistStanding ?? null)} color="var(--pearl)" width={48} />)}
        {tile('steps', 'Steps', 'var(--sage)', avgSteps !== undefined ? fmtInt(avgSteps) : '—', `avg ${word}`, <MiniBars values={steps.slice(-14)} color="var(--sage)" target={t.steps} width={52} />)}
        {tile('sleep', 'Sleep', 'var(--blue)', avgSleep !== undefined ? fmtDuration(Math.round(avgSleep)) : '—', reg !== undefined ? `regularity ${reg}` : `avg ${word}`, <Spark values={sleep.slice(-14)} color="var(--blue)" width={48} />)}
        {tile('training', 'Training', 'var(--lavender)', `${strength >= 0 ? '+' : '−'}${Math.abs(strength)}%`, `strength${records ? ` · ${records} record${records === 1 ? '' : 's'}` : ''}`)}
        {tile('readiness', 'Readiness', 'var(--blue)', readinessText(fd.readiness), !fd.readiness.known ? 'not enough data yet' : scored.length ? `${Math.round(avg(scored.map((s) => s.readiness))!)} average` : fd.readiness.label.toLowerCase(), undefined, '/readiness')}
        {settings.plan?.flags.length
          ? tile('joints', jointsTitle(settings), 'var(--apricot)', lastFlag ? `${daysBetween(lastFlag.date, today)} d` : 'Clear', lastFlag ? `since the last flag, ${fmtDayShort(lastFlag.date)}` : 'nothing flagged')
          : null}
        {tile('drinks', 'Drinks', 'var(--gold)', drinkNights ? fmtInt(drinkNights) : 'None', drinkNights ? `night${drinkNights === 1 ? '' : 's'} ${word}` : `${word} · add a past night`)}
        {prefOn(settings.prefs, 'water') &&
          tile('water', 'Water', 'var(--blue)', (() => {
            const w = avg(range.map((d) => data.days.get(d)?.waterMl ?? null));
            return w !== undefined ? `${fmtLitres(Math.round(w / 50) * 50)} L` : '—';
          })(), `avg ${word}`)}
      </div>
      <MedicinesRow data={data} />
    </div>
  );
}

function MedicinesRow({ data }: { data: TrackData }) {
  const { settings, today } = data;
  const meds = settings.checklist.filter((i) => i.active && i.med);
  const s = dayDoses(meds, data.days.get(today) ?? { date: today }, settings);
  const low = meds
    .filter((m) => m.med!.stock)
    .map((m) => ({ m, by: refillBy(m.med!.stock!, m, today) }))
    .sort((a, b) => a.by.localeCompare(b.by))[0];
  return (
    <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onClick={() => go('/medicines')}>
      <Icon name="pill" size={22} color="var(--sage)" />
      <span className="col gap2 grow" style={{ textAlign: 'left' }}>
        <span className="t16">Medicines</span>
        <span className="t13 q">
          {meds.length ? `${s.onTime + s.late} of ${s.planned} today` : 'Courses, stock and appointments'}
          {low && low.by <= addDays(today, 7) ? ` · refill ${low.m.name.toLowerCase()} by ${fmtDayShort(low.by).slice(0, 3)}` : ''}
        </span>
      </span>
      <Icon name="right" size={18} color="var(--dim)" />
    </button>
  );
}

/** One Tracks page, by kind. */
export function TrackPage() {
  const { params } = useRoute();
  const raw = params.get('k') ?? 'steps';
  const kind: Kind = LEGACY[raw] ?? (raw as Kind);
  useEffect(() => {
    void bump('tracks', { value: `${dayKey()}|${kind}` });
  }, [kind]);
  const data = useTrackData();
  if (!data) return <div className="page bare" />;
  switch (kind) {
    case 'food':
      return <FoodTrack data={data} />;
    case 'shape':
      return <ShapeTrack data={data} />;
    case 'sleep':
      return <SleepTrack data={data} />;
    case 'training':
      return <TrainingTrack data={data} />;
    case 'joints':
      return <JointsTrack data={data} title={jointsTitle(data.settings)} />;
    case 'drinks':
      return <DrinksTrack data={data} />;
    case 'water':
      return <WaterTrack data={data} />;
    default:
      return <StepsTrack data={data} />;
  }
}

/** Water, only when it is switched on. */
function WaterTrack({ data }: { data: TrackData }) {
  const [span, setSpan] = useState<Span>('30');
  const { settings, today } = data;
  const range = spanDays(today, span);
  const label = dayLabel(range.length);
  const ml = (d: DayKey) => data.days.get(d)?.waterMl ?? null;
  const logged = range.filter((d) => ml(d) !== null);
  const avg = logged.length ? logged.reduce((n, d) => n + ml(d)!, 0) / logged.length : undefined;
  return (
    <TrackShell
      title="Water"
      color="var(--blue)"
      value={avg !== undefined ? `${fmtLitres(Math.round(avg / 50) * 50)} L` : '—'}
      sub={`daily average · ${logged.length} of ${range.length} days`}
      span={span}
      onSpan={(s) => setSpan(s as Span)}
      hero={<HeroChart label="Water by day" color="var(--blue)" fmt={(n) => `${fmtLitres(Math.round(n / 50) * 50)} L`} target={targetsFor(settings, today).waterMl} points={range.map((d) => ({ label: label(d), value: ml(d) }))} />}
      history={{ title: 'Day by day', rows: [...logged].reverse().slice(0, 30).map((d) => [fmtDayShort(d), `${fmtLitres(ml(d)!)} L`]) }}
    >
      <WaterExtras days={[...data.days.values()]} range={range} />
    </TrackShell>
  );
}
