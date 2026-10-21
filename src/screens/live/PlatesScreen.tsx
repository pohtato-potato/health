import { useState, type ReactNode } from 'react';
import { lowerFirst } from '../../domain/format';
import { LiveFrame, Primary } from './Frame';

interface Props {
  /** The dumbbell load changing; none when only the collars need checking. */
  change?: { from: number; to: number };
  /** The exercises the new load is for. */
  forNames: string[];
  /** Weight is about to go over the face: the collars are ticked first. */
  collar: boolean;
  onCollar: () => void;
  onGo: () => void;
  saver: boolean;
  top?: ReactNode;
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Between load blocks: the plates change, and before weight goes over the face, the collars. */
export function PlatesScreen(p: Props) {
  const [tight, setTight] = useState(false);
  const blocked = p.collar && !tight;
  return (
    <LiveFrame state="calm" saver={p.saver} top={p.top}>
      {p.change && (
        <>
          <h1 className="lv-h1" style={{ marginTop: 24 }}>
            Plates change
          </h1>
          <div className="lv-plates">
            <span className="num tn">{p.change.from} kg</span>
            <span className="arrow" aria-hidden="true">
              →
            </span>
            <span className="num tn">{p.change.to} kg</span>
          </div>
        </>
      )}
      {p.forNames.length > 0 && <p className="lv-small">For {list(p.forNames.map(lowerFirst))}.</p>}
      {p.collar && (
        <button
          type="button"
          className={`lv-tick lv-collar${tight ? ' on' : ''}`}
          aria-pressed={tight}
          style={p.change ? undefined : { marginTop: 24 }}
          onClick={() => {
            if (!tight) p.onCollar();
            setTight(!tight);
          }}
        >
          <span className="box" aria-hidden="true">
            {tight ? '✓' : ''}
          </span>
          <span className="grow">
            <b>Collars tight on both handles</b>
            <span className="lv-small"> The weight goes over your face next.</span>
          </span>
        </button>
      )}
      <div style={{ marginTop: 'auto' }}>
        <Primary disabled={blocked} onClick={p.onGo}>
          {blocked ? 'Check the collars first' : 'Ready'}
        </Primary>
      </div>
    </LiveFrame>
  );
}
