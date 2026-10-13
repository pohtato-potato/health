import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { benchmarkOn, benchmarkProgress } from '../domain/benchmark';
import { addDays } from '../domain/dates';
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
