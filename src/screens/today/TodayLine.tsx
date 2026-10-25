/** The day's line on the page: the plain glance, or the voice at moments (italic; gold on a perfect day). A joint flag speaks plainly. */
export function TodayLine({ text, kind, gold, clock, why }: { text: string; kind: 'glance' | 'voice' | 'flag'; gold?: boolean; clock: string; why?: { name: string; text: string } }) {
  return (
    <div className="td-line-wrap" data-section="line">
      <p className={`td-line td-line-${kind}${gold ? ' gold' : ''}`}>
        {text} <span className="td-clock tn">{clock}</span>
      </p>
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
