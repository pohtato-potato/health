import { correctionsIn, type Correction } from '../../domain/corrections';
import type { DayKey } from '../../domain/dates';
import { fmtDayMonth } from '../../domain/format';

/** Wherever a period's numbers show, what was put right shows with them. */
export function CorrectionNotes({ from, to, list }: { from: DayKey; to: DayKey; list: Correction[] }) {
  const rows = correctionsIn(from, to, list);
  if (!rows.length) return null;
  return (
    <section className="yu-sec">
      <h2>Corrected</h2>
      {rows.map((c) => (
        <div key={c.id} className="yu-card">
          <b>{c.what}, {fmtDayMonth(c.date)}: {c.now}</b>
          <span className="yu-q">Was {c.was}. {c.note}</span>
        </div>
      ))}
    </section>
  );
}
