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

/** A record night: the strip turns gold until midnight, with each record and the finale. */
export function RecordsStrip({ records, onFinale }: { records: string[]; onFinale: () => void }) {
  return (
    <section className="td-next td-records" data-section="next" aria-label="Tonight's records">
      <div className="td-next-main">
        <span className="td-next-title goldtxt">
          {records.length} record{records.length === 1 ? '' : 's'} tonight
        </span>
        <span className="td-next-sub">{records.join(' · ')}</span>
        <span className="td-next-ready">Gold stays on Today until midnight.</span>
      </div>
      <div className="td-next-side">
        <button type="button" className="btn sm td-finale" onClick={onFinale}>
          Finale
        </button>
      </div>
    </section>
  );
}
