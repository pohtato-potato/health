import { fmtDayLong, fmtInt } from '../domain/format';
import type { DaySummary } from '../domain/usualDay';
import { back } from '../router';

/** The conclusion after closing a day: where it landed, plainly. */
export function DayClosed({ date, summary: s, onDone }: { date: string; summary: DaySummary; onDone: () => void }) {
  const lines: { label: string; value: string; good: boolean; color: string }[] = [
    { label: 'Calories', value: `${fmtInt(s.kcal)} kcal`, good: s.kcalInRange, color: 'var(--kcal)' },
    { label: 'Protein', value: `${s.protein} g`, good: s.proteinClosed, color: 'var(--protein)' },
    { label: 'Steps', value: s.steps === undefined ? 'Not logged' : s.stepsLeft ? `${fmtInt(s.steps)}, ${fmtInt(s.stepsLeft)} short` : fmtInt(s.steps), good: s.steps !== undefined && !s.stepsLeft, color: 'var(--steps)' },
    { label: 'Checklist', value: s.checklist.total ? `${s.checklist.done} of ${s.checklist.total}` : 'Nothing set', good: s.checklist.done === s.checklist.total, color: 'var(--gold)' },
  ];
  return (
    <div className="page dayclosed">
      <div className="col gap8">
        <h1 className="h1">Day closed</h1>
        <div className="t14 q">{fmtDayLong(date)}</div>
      </div>
      <div className="card">
        {lines.map((l) => (
          <div key={l.label} className="row base" style={{ minHeight: 40 }}>
            <span className="t15">{l.label}</span>
            <span className="t15 tn" style={{ color: l.good ? l.color : 'var(--quiet)' }}>
              {l.value}
            </span>
          </div>
        ))}
        {s.trained && <div className="t14 gold">Trained today.</div>}
      </div>
      <div className="t14 q lh">{s.kcalInRange && s.proteinClosed ? 'Both food rings closed. That is the day done properly.' : 'Logged honestly is what counts. The week evens it out.'}</div>
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
