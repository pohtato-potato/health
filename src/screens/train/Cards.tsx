
const pct = (x: number) => `${Math.round(x * 100)}%`;

interface TonightProps {
  name: string;
  records: string[];
  mins: number;
  /** Entered after the fact: its length means nothing. */
  later?: boolean;
  sets: number;
  liftMin?: number;
  quality?: number;
  checks?: number;
  next?: string;
  onReplay: () => void;
}

/** After a session: the night in one card, gold when there were records. */
export function TonightCard(p: TonightProps) {
  const gold = p.records.length > 0;
  return (
    <div className={`lv-card lv-tr-hero lv-tr-tonight${gold ? ' gold' : ''}`}>
      <span className={`lv-kicker${gold ? ' gold' : ''}`}>Tonight · {p.name}</span>
      <span className={`lv-tr-hero-title${gold ? ' goldtxt' : ''}`}>{gold ? `${p.records.length} record${p.records.length === 1 ? '' : 's'}` : `${p.name} done`}</span>
      <span className="lv-small">
        {p.later ? 'logged later' : `${p.mins} min`} · {p.sets} sets
        {p.liftMin !== undefined && (
          <>
            {' '}
            · <b>{p.liftMin} min lifting</b>
          </>
        )}
        {p.quality !== undefined ? ` · quality ${p.quality}` : ''}
      </span>
      {(gold || p.checks !== undefined) && (
        <div className="lv-tr-hero-chips">
          {p.records.map((r) => (
            <span key={r} className="lv-tag gold">
              {r}
            </span>
          ))}
          {p.checks !== undefined && <span className="lv-tag ok">{pct(p.checks)} of checks went well</span>}
        </div>
      )}
      {p.next && <p className="lv-small">{p.next}</p>}
      <button type="button" className={`lv-primary${gold ? ' gold' : ''}`} onClick={p.onReplay}>
        Replay tonight's finale
      </button>
    </div>
  );
}
