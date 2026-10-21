import { useState, type ReactNode } from 'react';
import { cycleCheck, slipCount } from '../../domain/checks';
import { stateWord, type SetState } from '../../domain/liveSet';
import type { FormCheck } from '../../domain/plan';
import type { CheckMark } from '../../domain/types';
import { LiveFrame, mmss, Primary } from './Frame';

type Marks = Record<string, CheckMark>;

interface Props {
  reps: number;
  unit: 'reps' | 'seconds';
  state: SetState;
  bar?: number;
  /** Records count clean sets only: a slip takes the record back. */
  clean?: boolean;
  /** The state the set is in without the record. */
  unrecord?: SetState;
  checks: FormCheck[];
  prev?: { checks?: Marks; rir?: number };
  onSave: (v: { checks: Marks; rir?: number }) => void;
  saver: boolean;
  /** What was lifted: "reps at 10 kg · left". */
  detail?: string;
  top?: ReactNode;
}

const same = (a: Marks, b: Marks = {}) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** After the set, still in its colour: how each form point went, and reps left in the tank. */
export function CheckScreen(p: Props) {
  const [marks, setMarks] = useState<Marks>(() => ({ ...(p.prev?.checks ?? {}) }));
  const [rir, setRir] = useState<number | undefined>(p.prev?.rir);
  const slips = slipCount({ checks: marks });
  const lost = p.state === 'record' && !!p.clean && slips > 0;
  const state = lost ? p.unrecord ?? 'in' : p.state;
  const word = lost ? `not a record · ${slips} check${slips === 1 ? '' : 's'} slipped` : stateWord(state, p.bar);
  const unchanged = !!p.prev && same(marks, p.prev.checks) && rir === p.prev.rir;
  const tap = (id: string) =>
    setMarks((m) => {
      const n = { ...m };
      const next = cycleCheck(m[id]);
      if (next) n[id] = next;
      else delete n[id];
      return n;
    });

  return (
    <LiveFrame state={state} saver={p.saver} top={p.top}>
      <div className="lv-check-head">
        <span className={`lv-count num tn ${state}`} style={{ fontSize: 64 }}>
          {p.unit === 'seconds' ? mmss(p.reps) : p.reps}
        </span>
        <span className="col">
          {p.detail && (
            <span className="lv-name" style={{ fontSize: 24 }}>
              {p.detail}
            </span>
          )}
          <span className="lv-word" style={{ textAlign: 'left', fontSize: 18 }}>
            {word}
          </span>
        </span>
      </div>
      {p.checks.length > 0 && (
        <>
          <p className="lv-small">{p.prev?.checks ? 'Last set’s answers are filled in. Change only what was different.' : 'Tap once if it went well, twice if it slipped.'}</p>
          <div className="lv-checks">
            {p.checks.map((c) => {
              const m = marks[c.id];
              return (
                <button key={c.id} type="button" className={`lv-check${m ? ` ${m}` : ''}`} aria-label={`${c.text}: ${m === 'ok' ? 'went well' : m === 'slip' ? 'slipped' : 'not marked'}`} onClick={() => tap(c.id)}>
                  <span className="box" aria-hidden="true">
                    {m === 'ok' ? '✓' : m === 'slip' ? '✕' : ''}
                  </span>
                  <span className="grow">{c.text}</span>
                  {m && <span className="state">{m === 'ok' ? 'went well' : 'slipped'}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="lv-rir">
        <span>Left in the tank</span>
        <div className="row" style={{ gap: 8 }}>
          {[0, 1, 2, 3].map((n) => (
            <button key={n} type="button" className={`lv-rir-chip r${n}${rir === n ? ' on' : ''}`} aria-pressed={rir === n} onClick={() => setRir(n)}>
              {n === 3 ? '3+' : n}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <Primary onClick={() => p.onSave({ checks: marks, rir })}>{unchanged ? 'Same as last set' : 'Save'}</Primary>
      </div>
    </LiveFrame>
  );
}
