import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { benchmarkOn, benchmarkProgress, whtr, whtrWaists, WHTR_GOALS } from '../domain/benchmark';
import { addDays, daysBetween } from '../domain/dates';
import { recordLine, trackRecord } from '../domain/forecastStore';
import { db } from '../db/db';
import { saveForecast } from '../db/forecasts';
import { fmtDayMonthFrom } from '../domain/format';
import type { Measurement } from '../domain/types';

/** The main body goal: waist-to-height under 0.5, then 0.45, with the trend's date. */
export function BenchmarkCard({ measurements, heightCm, today, reveal }: { measurements: Measurement[]; heightCm: number; today: string; reveal?: string }) {
  const b = benchmarkProgress(measurements, heightCm, today);
  const record = useLiveQuery(async () => trackRecord(await db.forecasts.toArray(), 'whtr'), []);
  // Each day's view of where the ratio will be in four weeks is kept, to be checked later.
  const in4 = b?.slope !== undefined ? b.current + b.slope * 28 : undefined;
  useEffect(() => {
    if (in4 !== undefined) void saveForecast({ kind: 'whtr', targetDate: addDays(today, 28), low: Math.round((in4 - 0.006) * 1000) / 1000, high: Math.round((in4 + 0.006) * 1000) / 1000 }, today);
  }, [in4, today]);
  if (!b) return null;
  const line = record ? recordLine(record) : undefined;
  const pct = Math.min(1, Math.max(0, (0.6 - b.current) / (0.6 - b.goal)));
  return (
    <div className="card">
      <div className="row base">
        <div className="lbl">Athletic benchmark · waist ÷ height</div>
        <div className="t13 q">goal {b.goal.toFixed(2)}</div>
      </div>
      <div className="num tn" style={{ fontSize: 30 }}>
        {b.current.toFixed(3)}
      </div>
      <BenchmarkChart measurements={measurements} heightCm={heightCm} today={today} reveal={reveal} b={b} />
      <div className="bar" role="img" aria-label={`${Math.round(pct * 100)}% of the way from 0.6 to ${b.goal}`}>
        <i style={{ width: `${pct * 100}%`, background: 'var(--steps)' }} />
      </div>
      <div className="t13 q lh">
        {b.current < b.goal
          ? 'Under the goal. Weight is context; this is the number that matters.'
          : b.projected
            ? `At this rate, under ${b.goal} around ${fmtDayMonthFrom(b.projected, today)}.`
            : 'A date appears once three waist readings show a trend.'}
      </div>
      {reveal && reveal > today && (() => {
        const f = benchmarkOn(b, today, reveal);
        return f ? (
          <div className="t13 lh">
            Reveal day: <span className="tn">{f.range[0].toFixed(2)}–{f.range[1].toFixed(2)}</span>
          </div>
        ) : null;
      })()}
      {line && <div className="t12 q">{line}.</div>}
    </div>
  );
}

/** Waist ÷ height readings as dots, the trend carried on to reveal day inside a widening cone, and the goal lines. */
function BenchmarkChart({ measurements, heightCm, today, reveal, b }: { measurements: Measurement[]; heightCm: number; today: string; reveal?: string; b: { current: number; slope?: number; goal: number } }) {
  const pts = whtrWaists(measurements)
    .filter((m) => m.date <= today)
    .map((m) => ({ date: m.date, r: whtr(m.waist, heightCm) }));
  if (pts.length < 2) return null;
  const end = reveal && reveal > today ? reveal : addDays(today, 28);
  const start = pts[0].date;
  const span = Math.max(1, daysBetween(start, end));
  const cone = Array.from({ length: 13 }, (_, i) => addDays(today, Math.round((daysBetween(today, end) * i) / 12))).map((d) => ({ d, f: benchmarkOn(b, today, d) }));
  const values = [...pts.map((p) => p.r), ...cone.flatMap((c) => (c.f ? c.f.range : [])), WHTR_GOALS[0]];
  const lo = Math.min(...values, b.goal) - 0.01;
  const hi = Math.max(...values) + 0.01;
  const W = 320;
  const H = 120;
  const x = (d: string) => 6 + (daysBetween(start, d) / span) * (W - 12);
  const y = (r: number) => 8 + ((hi - r) / (hi - lo)) * (H - 24);
  const fs = cone.filter((c) => c.f);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Waist to height from ${pts[0].r.toFixed(3)} to ${b.current.toFixed(3)}${fs.length ? `, heading for ${fs[fs.length - 1].f!.value.toFixed(2)} by ${end}` : ''}`}>
      {WHTR_GOALS.filter((g) => g > lo && g < hi).map((g) => (
        <g key={g}>
          <line x1="0" x2={W} y1={y(g)} y2={y(g)} stroke="var(--steps)" strokeOpacity="0.5" strokeDasharray="3 4" />
          <text x={W - 2} y={y(g) - 4} textAnchor="end" fontSize="10" fill="var(--steps)" fontFamily="var(--sans)">
            {g.toFixed(2)}
          </text>
        </g>
      ))}
      {fs.length > 1 && (
        <>
          <path
            d={`M${fs.map((c) => `${x(c.d)} ${y(c.f!.range[1])}`).join(' L')} L${[...fs].reverse().map((c) => `${x(c.d)} ${y(c.f!.range[0])}`).join(' L')} Z`}
            fill="var(--steps)"
            opacity="0.14"
          />
          <path d={`M${fs.map((c) => `${x(c.d)} ${y(c.f!.value)}`).join(' L')}`} fill="none" stroke="var(--steps)" strokeWidth="1.4" strokeDasharray="4 3" />
        </>
      )}
      <path d={`M${pts.map((p) => `${x(p.date)} ${y(p.r)}`).join(' L')}`} fill="none" stroke="var(--steps)" strokeOpacity="0.5" strokeWidth="1.2" />
      {pts.map((p) => (
        <circle key={p.date} cx={x(p.date)} cy={y(p.r)} r="3" fill="var(--steps)" />
      ))}
      <line x1={x(today)} x2={x(today)} y1="4" y2={H - 14} stroke="var(--dim)" strokeOpacity="0.5" />
      <text x={x(today)} y={H - 2} textAnchor="middle" fontSize="10" fill="var(--dim)" fontFamily="var(--sans)">
        today
      </text>
      {reveal && reveal > today && (
        <>
          <line x1={x(reveal) - 0.5} x2={x(reveal) - 0.5} y1="4" y2={H - 14} stroke="var(--gold)" strokeOpacity="0.7" />
          <text x={x(reveal) - 2} y={H - 2} textAnchor="end" fontSize="10" fill="var(--gold)" fontFamily="var(--sans)">
            reveal
          </text>
        </>
      )}
    </svg>
  );
}
