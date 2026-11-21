import type { CSSProperties } from 'react';
import type { Correction } from '../../domain/corrections';
import { fmtDayMonth } from '../../domain/format';

/** The ledger of numbers put right (board 23): its count by the heading, each entry rising in; an empty ledger says so. */
export function CorrLedger({ rows, onRemove }: { rows: Correction[]; onRemove: (id: string) => void }) {
  return (
    <section className="ar-sec">
      <div className="ar-hd"><h2 className="ar-h">The ledger</h2>{rows.length > 0 && <span>{rows.length}</span>}</div>
      {!rows.length && <p className="dc-sub">Nothing corrected so far.</p>}
      {rows.map((c, k) => {
        const what = `${c.what}, ${fmtDayMonth(c.date)}`;
        return (
          <div key={c.id} className="cr-row" style={{ '--d': `${Math.min(k, 8) * 0.08}s` } as CSSProperties}>
            <span><b>{what}: {c.now}</b><small>Was {c.was}. {c.note}</small></span>
            <button type="button" aria-label={`Remove the correction to ${what}`} onClick={() => onRemove(c.id)}>Remove</button>
          </div>
        );
      })}
    </section>
  );
}
