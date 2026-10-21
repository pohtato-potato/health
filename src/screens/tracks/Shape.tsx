import { useState } from 'react';
import { benchmarkProgress } from '../../domain/benchmark';
import { addDays } from '../../domain/dates';
import { fmt1, fmtDayMonth } from '../../domain/format';
import { autoMarkers } from '../../domain/markers';
import { weightTrend } from '../../domain/streaks';
import { recompVerdict } from '../../domain/trackStats';
import { go, openSheet } from '../../router';
import { strengthIndex } from '../../domain/strength';
import { BenchmarkCard } from '../BenchmarkCard';
import { WeightInsights } from '../MaintenanceCards';
import { nextCheckInDate } from '../Photos';
import { WaistExtras } from '../TrackExtras';
import { dayLabel, spanDays, type Span, type TrackData } from './data';
import { HeroChart, TrackShell } from './Template';

const VERDICT: Record<NonNullable<ReturnType<typeof recompVerdict>>, string> = {
  recomposition: 'Weight is flat while your waist shrinks and lifts climb: that’s recomposition, not a plateau.',
  losing: 'Weight and waist are both coming down.',
  gaining: 'Weight and waist are both creeping up. Worth a look at the food page.',
  steady: 'Holding steady: weight and waist both flat over the last four weeks.',
};

/** Shape: weight, waist and waist ÷ height together, a plain verdict, the t-shirt test and photo compare. */
export function ShapeTrack({ data }: { data: TrackData }) {
  const [span, setSpan] = useState<Span>('90');
  const { settings, today } = data;
  const range = spanDays(today, span);
  const label = dayLabel(range.length);
  const weighIns = [...data.days.values()].filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, kg: d.weightKg! }));
  const trend = weightTrend(weighIns);
  const byDate = new Map(trend.map((p) => [p.date, p]));
  const markers = new Map(autoMarkers([...data.days.values()], settings).map((m) => [m.date, m.text]));
  const waist = data.measurements.filter((m) => m.waistStanding !== undefined);
  const waistOn = new Map(waist.map((m) => [m.date, m.waistStanding!]));
  const b = settings.heightCm ? benchmarkProgress(data.measurements, settings.heightCm, today) : undefined;
  const at = <T,>(xs: { date: string }[], d: string) => [...xs].reverse().find((x) => x.date <= d) as T | undefined;
  const monthAgo = addDays(today, -28);
  const wNow = trend[trend.length - 1];
  const wThen = at<(typeof trend)[number]>(trend, monthAgo);
  const waistNow = waist[waist.length - 1];
  const waistThen = at<(typeof waist)[number]>(waist, monthAgo);
  const strengthNow = strengthIndex(data.sets, today);
  const strengthThen = strengthIndex(data.sets.filter((s) => s.date <= monthAgo), monthAgo);
  const verdict = recompVerdict({
    weightKg: wNow && wThen && wThen !== wNow ? wNow.trend - wThen.trend : undefined,
    waistIn: waistNow && waistThen && waistThen !== waistNow ? waistNow.waistStanding! - waistThen.waistStanding! : undefined,
    strengthPct: strengthNow - strengthThen,
  });
  const sessionDays = new Set(data.sessions.filter((x) => x.status === 'done').map((x) => x.date));
  const due = nextCheckInDate(data.checkins);
  const last = data.checkins.map((c) => c.date).sort().pop();

  return (
    <TrackShell
      title="Shape"
      color="var(--pearl)"
      value={b ? b.current.toFixed(2) : wNow ? `${fmt1(wNow.trend)} kg` : '—'}
      sub={b ? `waist ÷ height · goal ${b.goal.toFixed(2)}` : wNow ? 'weight trend' : 'Log a weigh-in or a waist measure to begin'}
      span={span}
      onSpan={(s) => setSpan(s as Span)}
      hero={
        <HeroChart
          label="Weight with its trend, and waist"
          mode="dots"
          color="var(--pearl)"
          secondColor="var(--apricot)"
          thirdColor="var(--protein)"
          fmt={(n) => fmt1(n)}
          points={range.map((d) => ({ label: label(d), value: byDate.get(d)?.kg ?? null, trend: byDate.get(d)?.trend ?? null, second: waistOn.get(d) ?? null, third: sessionDays.has(d) ? strengthIndex(data.sets.filter((x) => x.date <= d), d) : null, marker: markers.get(d) }))}
        />
      }
      insights={[
        verdict && VERDICT[verdict],
        wNow && wThen && wThen !== wNow && `Weight ${fmt1(wNow.trend)} kg, ${Math.abs(wNow.trend - wThen.trend) < 0.3 ? 'steady' : `${wNow.trend < wThen.trend ? '−' : '+'}${fmt1(Math.abs(wNow.trend - wThen.trend))} kg`} in four weeks; waist${waistNow && waistThen && waistThen !== waistNow ? ` ${waistNow.waistStanding! <= waistThen.waistStanding! ? '−' : '+'}${fmt1(Math.abs(waistNow.waistStanding! - waistThen.waistStanding!))} in` : ' not re-measured'}; strength ${strengthNow - strengthThen >= 0 ? '+' : '−'}${Math.abs(strengthNow - strengthThen)}%.`,
      ]}
      history={{
        title: 'Measurements',
        rows: [...data.measurements].reverse().slice(0, 20).map((m) => [fmtDayMonth(m.date), [m.waistStanding !== undefined && `${m.waistStanding} in waist`, m.shoulders !== undefined && `shoulders ${m.shoulders} in`].filter(Boolean).join(' · ') || '—']),
      }}
    >
      <div className="place-key t12 q">
        <span>
          <i className="key-dot" style={{ borderColor: 'var(--pearl)' }} /> weight
        </span>
        <span>
          <i className="key-dot solid" style={{ background: 'var(--apricot)' }} /> waist
        </span>
        <span>
          <i className="key-dot solid" style={{ background: 'var(--protein)' }} /> strength
        </span>
        <span>
          <i className="key-dot solid" style={{ background: 'var(--gold)' }} /> marker
        </span>
      </div>
      {settings.heightCm ? <BenchmarkCard measurements={data.measurements} heightCm={settings.heightCm} today={today} /> : null}
      <WaistExtras measurements={data.measurements} settings={settings} checkins={data.checkins} />
      <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onClick={() => go('/photos')}>
        <span className="col gap2 grow" style={{ textAlign: 'left' }}>
          <span className="t16">Compare photos</span>
          <span className="t13 q">
            Blurred until you tap{last ? ` · last ${fmtDayMonth(last)}` : ''}
            {due ? ` · next check-in ${fmtDayMonth(due)}` : ''}
          </span>
        </span>
        <span className="btn sm">Open</span>
      </button>
      <WeightInsights settings={settings} days={[...data.days.values()]} entries={data.entries} measurements={data.measurements} today={today} />
      <button type="button" className="btn block" onClick={() => openSheet('waist')}>
        Measure now
      </button>
    </TrackShell>
  );
}
