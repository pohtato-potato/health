import { benchmarkProgress } from '../domain/benchmark';
import { fmtDayMonth } from '../domain/format';
import type { Measurement } from '../domain/types';

/** The main body goal: waist-to-height under 0.5, then 0.45, with the trend's date. */
export function BenchmarkCard({ measurements, heightCm, today }: { measurements: Measurement[]; heightCm: number; today: string }) {
  const b = benchmarkProgress(measurements, heightCm, today);
  if (!b) return null;
  const pct = Math.min(1, Math.max(0, (0.6 - b.current) / (0.6 - b.goal)));
  return (
    <div className="card">
      <div className="row base">
        <div className="lbl">Waist to height</div>
        <div className="t13 q">goal under {b.goal}</div>
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
            ? `At this rate, under ${b.goal} around ${fmtDayMonth(b.projected)}.`
            : 'A date appears once three waist readings show a trend.'}
      </div>
    </div>
  );
}
