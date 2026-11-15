import { useState, type ReactNode } from 'react';
import { cycleCheck, slipCount } from '../../domain/checks';
import { stateWord, type SetState } from '../../domain/liveSet';
import type { FormCheck } from '../../domain/plan';
import type { CheckMark } from '../../domain/types';
import { Icon } from '../../ui/Icon';
import { LiveFrame, mmss, Primary } from './Frame';

type Marks = Record<string, CheckMark>;

interface Props {
  reps: number;
  unit: 'reps' | 'seconds';
  /** The state for a count, so it follows minus and plus. */
  stateFor?: (v: number, recordOk: boolean) => SetState;
  /** Last time's count for this set, shown under the number. */
  last?: number;
  /** The exercise, the load and the set's time: "Row · 35 kg · 0:58". */
  title?: string;
  /** "Save · rest 2:30". */
  rest?: string;
  /** Something hurt: a body log entry with this exercise, side and set. */
  onBody?: () => void;
  state: SetState;
  bar?: number;
  /** Records count clean sets only: a slip takes the record back. */
  clean?: boolean;
  /** The state the set is in without the record. */
  unrecord?: SetState;
  checks: FormCheck[];
  prev?: { checks?: Marks; rir?: number };
  onSave: (v: { checks: Marks; rir?: number; val: number }) => void;
  /** Heavier than ever before: no best to name. */
  firstAtLoad?: boolean;
  /** A save is being written: the button waits. */
  saving?: boolean;
  /** What was lifted: "reps at 10 kg · left". */
  detail?: string;
  top?: ReactNode;
}

const same = (a: Marks, b: Marks = {}) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** After the set, still in its colour: how each form point went, and reps left in the tank. */
export function CheckScreen(p: Props) {
  const [marks, setMarks] = useState<Marks>(() => ({ ...(p.prev?.checks ?? {}) }));
  const [rir, setRir] = useState<number | undefined>(p.prev?.rir);
  const [val, setVal] = useState(p.reps);
  const slips = slipCount({ checks: marks });
  const base = p.stateFor ? p.stateFor(val, true) : p.state;
  const lost = base === 'record' && !!p.clean && slips > 0;
  const state = lost ? (p.stateFor ? p.stateFor(val, false) : p.unrecord ?? 'in') : base;
  const word = lost ? `not a record · ${slips} check${slips === 1 ? '' : 's'} slipped` : stateWord(state, p.bar, p.firstAtLoad);
  const unchanged = !!p.prev && same(marks, p.prev.checks) && rir === p.prev.rir;
  const timed = p.unit === 'seconds';
  const step = timed ? 5 : 1;
  const tap = (id: string) =>
    setMarks((m) => {
      const n = { ...m };
      const next = cycleCheck(m[id]);
      if (next) n[id] = next;
      else delete n[id];
      return n;
    });

  return (
    <LiveFrame state={state} top={p.top} className="lv-logged" scroll>
      <h1 className="lv-name">How did it go?</h1>
      {(p.title || p.detail) && <p className="lv-small" style={{ margin: 0 }}>{p.title ?? p.detail}</p>}
      <div className="lv-countset">
        <button type="button" className="lv-stepbtn" aria-label={timed ? 'Five seconds less' : 'One rep fewer'} disabled={val <= (timed ? 5 : 1)} onClick={() => setVal((v) => Math.max(timed ? 5 : 1, v - step))}>
          <Icon name="minus" size={28} stroke={2.2} />
        </button>
        <span className="lv-countset-v">
          <span className={`lv-count num tn ${state}`}>{timed ? mmss(val) : val}</span>
          <span className="lv-small">
            {timed ? 'held' : 'reps'}
            {p.last !== undefined ? ` · last time ${timed ? mmss(p.last) : p.last}` : ''}
          </span>
        </span>
        <button type="button" className="lv-stepbtn" aria-label={timed ? 'Five seconds more' : 'One rep more'} onClick={() => setVal((v) => v + step)}>
          <Icon name="plus" size={28} stroke={2.2} />
        </button>
      </div>
      <div className="lv-word">{word}</div>
      <div className="lv-rir">
        <b>Reps left in you</b>
        <div className="lv-rir-row">
          {[0, 1, 2, 3].map((n) => (
            <button key={n} type="button" className={`lv-rir-chip r${n}${rir === n ? ' on' : ''}`} aria-pressed={rir === n} onClick={() => setRir(n)}>
              {n === 3 ? '3+' : n}
            </button>
          ))}
        </div>
      </div>
      {p.checks.length > 0 && (
        <>
          <b>Form</b>
          <p className="lv-small" style={{ margin: 0 }}>{p.prev?.checks ? 'Last set’s answers are filled in. Change only what was different.' : 'Tap once if it went well, twice if it slipped.'}</p>
          <div className="lv-checks">
            {p.checks.map((c) => {
              const m = marks[c.id];
              return (
                <button key={c.id} type="button" className={`lv-check${m ? ` ${m}` : ''}`} aria-label={`${c.text}: ${m === 'ok' ? 'went well' : m === 'slip' ? 'slipped' : 'not marked'}`} onClick={() => tap(c.id)}>
                  <span className="box" aria-hidden="true">
                    {m === 'ok' ? <Icon name="check" size={18} stroke={2.6} /> : m === 'slip' ? <Icon name="close" size={18} stroke={2.6} /> : null}
                  </span>
                  <span className="grow">{c.text}</span>
                  {m && <span className="state">{m === 'ok' ? 'went well' : 'slipped'}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="lv-hurt-row">
        {p.onBody && (
          <button type="button" className="lv-hurt" onClick={p.onBody}>
            Something hurt
          </button>
        )}
        {p.prev?.rir !== undefined && <span className="lv-small">carried from the last set: {p.prev.rir === 3 ? '3+' : p.prev.rir} left</span>}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <Primary disabled={p.saving} onClick={() => p.onSave({ checks: marks, rir, val })}>
          {unchanged && val === p.reps ? 'Save, rated as last set' : 'Save'}
          {p.rest ? ` · ${p.rest}` : ''}
        </Primary>
      </div>
    </LiveFrame>
  );
}
