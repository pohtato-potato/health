import { BlockList, type Blocks } from '../live/BeforeScreen';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];
const pct = (x: number) => `${Math.round(x * 100)}%`;

interface UpNextProps {
  name: string;
  usual: { min: number; fromHistory: boolean };
  changes: number;
  heavier: number;
  focus?: string;
  blocks: Blocks;
  swaps: number;
  onStart: () => void;
  onShort: () => void;
  /** Trip workout, extra sessions. */
  chips: { label: string; onClick: () => void }[];
  note?: string;
}

/** Before a session: the next one, how long it usually takes, and the whole plan in load blocks. */
export function UpNextCard(p: UpNextProps) {
  return (
    <div className="lv-card lv-tr-hero">
      <span className="lv-kicker">Up next</span>
      <span className="lv-tr-hero-title">{p.name}</span>
      <span className="lv-small">
        {p.usual.fromHistory ? 'usually' : 'about'} <b>{p.usual.min} min</b>
        {p.changes > 0 ? ` · ${WORDS[p.changes] ?? p.changes} plate change${p.changes === 1 ? '' : 's'}` : ''}
      </span>
      {(p.heavier > 0 || p.focus) && (
        <div className="lv-tr-hero-chips">
          {p.heavier > 0 && <span className="lv-tag ok">{p.heavier} ready to go heavier</span>}
          {p.focus && <span className="lv-tag">form focus: {p.focus.toLowerCase()}</span>}
        </div>
      )}
      <div className="lv-tr-plan-list" aria-label="Tonight's whole plan">
        <BlockList blocks={p.blocks} />
      </div>
      {p.swaps > 0 && <div className="lv-small">{p.swaps} swapped out for a joint flag.</div>}
      <div className="lv-actions">
        <button type="button" className="lv-ghost" onClick={p.onShort}>
          30 min
        </button>
        <button type="button" className="lv-primary" onClick={p.onStart}>
          Start {p.name}
        </button>
      </div>
      {p.chips.length > 0 && (
        <div className="lv-tr-hero-chips">
          {p.chips.map((c) => (
            <button key={c.label} type="button" className="lv-chipbtn" onClick={c.onClick}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      {p.note && <div className="lv-small">{p.note}</div>}
    </div>
  );
}

interface TonightProps {
  name: string;
  records: string[];
  mins: number;
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
        {p.mins} min · {p.sets} sets
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
