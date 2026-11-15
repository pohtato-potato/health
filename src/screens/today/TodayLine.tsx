/** The count of closed rings, in words, for the heading above the rings: the middle of the rings stays clear. */
export function closedWords(closed: number, of = 4): string {
  if (closed >= of) return of === 4 ? 'All four closed' : `All ${of} closed`;
  return [`None closed yet`, 'One closed so far', 'Two closed so far', 'Three closed so far'][closed] ?? `${closed} closed so far`;
}

/** The glance under the heading, without the ring count the heading already says ("Two closed so far."). */
export function glanceUnder(text: string): string {
  return text
    .replace(/^(All (four|three) closed\.|(One|Two|Three) (ring )?closed( so far)?\.|The rings are still open\.|On track\.)\s*/, '')
    .trim();
}

/**
 * The heading over the rings (board five): the count of closed rings, the clock on the right, and the day's line
 * under it, small: the plain glance, or the voice at moments (italic; gold on a perfect day). A joint flag speaks
 * plainly. Tapping the line opens today in detail.
 */
export function TodayLine({ head, text, kind, gold, clock, why, onOpen }: { head: string; text: string; kind: 'glance' | 'voice' | 'flag'; gold?: boolean; clock: string; why?: { name: string; text: string }; onOpen?: () => void }) {
  return (
    <div className="td-line-wrap" data-section="line">
      <div className="k-row td-headrow">
        <h2 className={`td-head${gold ? ' gold' : ''}`}>{head}</h2>
        {onOpen ? (
          <button type="button" className="td-clock tn" onClick={onOpen} aria-label={`${clock}. Open today in detail`}>{clock}</button>
        ) : (
          <span className="td-clock tn">{clock}</span>
        )}
      </div>
      {text && (
        <button type="button" className={`td-line td-line-${kind}${gold ? ' gold' : ''}`} onClick={onOpen} aria-label={`${text}. Open today in detail`} disabled={!onOpen}>
          {text}
        </button>
      )}
      {why && (
        <p className="td-why">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M8 1 L9.4 6.6 L15 8 L9.4 9.4 L8 15 L6.6 9.4 L1 8 L6.6 6.6 Z" fill="currentColor" />
          </svg>
          <span>
            <b>{why.name}.</b> {why.text}
          </span>
        </p>
      )}
    </div>
  );
}
