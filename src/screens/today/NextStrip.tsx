import type { CSSProperties } from 'react';
import type { RecordGain } from '../../domain/trainView';
/** Training on Today: a strip between two hairlines, like a departures row. Tapping it opens Train. */
export function NextStrip({ title, sub, ready, week, action, onOpen }: { title: string; sub: string; ready?: string; week?: { done: number; of: number }; action?: { label: string; run: () => void }; onOpen: () => void }) {
  return (
    <section className="td-next" data-section="next" aria-label="Training">
      <button type="button" className="td-next-main" onClick={onOpen}>
        <span className="td-next-title">{title}</span>
        <span className="td-next-sub">{sub}</span>
        {ready && <span className="td-next-ready">{ready}</span>}
      </button>
      {(week || action) && (
        <div className="td-next-side">
          {week && (
            <span className="td-week" aria-label={`${week.done} of ${week.of} sessions this week`}>
              {Array.from({ length: week.of }, (_, i) => (
                <i key={i} className={i < week.done ? 'on' : i === week.done ? 'next' : ''} aria-hidden="true" />
              ))}
              <span className="tn" aria-hidden="true">
                {Math.min(week.done, week.of)} of {week.of}
              </span>
            </span>
          )}
          {action && (
            <button type="button" className="btn sm" onClick={action.run}>
              {action.label}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * A record night (board 8 `s8-record`), after NEXT: each lift's new best large in gold, what it was before, a chip
 * for the gain, and a bar from the old best to the new. The rows land one after another; the Finale replays it.
 */
export function RecordsStrip({ rows, onFinale }: { rows: RecordGain[]; onFinale: () => void }) {
  return (
    <section className="k-panel flat td-records" data-section="next" aria-labelledby="td-rec-h">
      <div className="td-rec-head">
        <h2 id="td-rec-h" className="td-rec-h">Record night</h2>
        <span className="td-rec-n">{rows.length} new best{rows.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="td-rec-list">
        {rows.map((r, i) => (
          <li key={r.key} className="td-rec" style={{ '--i': i, '--from': r.from } as CSSProperties}>
            <span className="td-rec-name">{r.name}</span>
            <span className="td-rec-gain">{r.gain}</span>
            <b className="td-rec-now tn">{r.now}</b>
            <span className="td-rec-was">{r.was ? `was ${r.was}` : 'no best before'}</span>
            <i className="td-rec-bar" aria-hidden="true"><i /></i>
          </li>
        ))}
      </ul>
      <div className="td-rec-foot">
        <p className="td-rec-note">Tonight’s card gets the Record night ribbon.</p>
        <button type="button" className="k-act sm quiet td-finale" onClick={onFinale}>Finale</button>
      </div>
    </section>
  );
}
