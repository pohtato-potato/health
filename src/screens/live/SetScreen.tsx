import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { buzz as vibrate } from '../../audio';
import { RIPPLE } from '../../domain/liveLook';
import { counter, HOLD_MS, repsSlowing, seconds, setState, stateWord, tapTempo, type CounterAction } from '../../domain/liveSet';
import type { ThemeId } from '../../domain/themes';
import type { LiveCounter } from '../../domain/types';
import type { Row } from '../session/SetTable';
import { LiveFrame, mmss, Primary } from './Frame';

interface Props {
  row: Row;
  name: string;
  kg: number | null;
  /** The plan's range, as text: "10–15". */
  aim?: string;
  bottom?: number;
  /** The value a record has to beat; none before the first time. */
  bar?: number;
  tempo: boolean;
  timed: boolean;
  nudge: boolean;
  leadSide?: 'L' | 'R';
  c: LiveCounter;
  onCounter: (c: LiveCounter) => void;
  onDone: () => void;
  onSkip: () => void;
  saver: boolean;
  theme: ThemeId;
  buzz: boolean;
  now: number;
  top?: ReactNode;
}

/** The set: tap anywhere for a rep, hold to mark the burn. The count, colour and words follow. */
export function SetScreen(p: Props) {
  const { c, row } = p;
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; cls: string }[]>([]);
  const hold = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const reps = p.timed ? seconds(c, p.now) : c.taps.length;
  const state = setState({ reps, burnAt: c.burnAt, bottom: p.bottom, bar: p.bar });
  const last = c.taps[c.taps.length - 1];
  const tempo = p.tempo && !p.timed ? tapTempo(last === undefined ? undefined : p.now - last) : undefined;
  const still = p.saver || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const perSide = row.side !== 'both';

  const act = (a: CounterAction) => p.onCounter(counter(c, a));
  const ripple = (e: PointerEvent<HTMLElement>, cls: string) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    setRipples((rs) => [...rs.slice(-5), { id: Date.now() + Math.random(), x: e.clientX - r.left, y: e.clientY - r.top, cls }]);
  };
  const down = (e: PointerEvent<HTMLElement>) => {
    if (!e.isPrimary) return;
    held.current = false;
    window.clearTimeout(hold.current);
    hold.current = window.setTimeout(() => {
      held.current = true;
      act({ t: 'hold', at: Date.now() });
      if (p.buzz) vibrate([30, 40, 30]);
      ripple(e, 'burn');
    }, HOLD_MS);
  };
  const up = (e: PointerEvent<HTMLElement>) => {
    if (!e.isPrimary) return;
    window.clearTimeout(hold.current);
    if (held.current) return;
    if (p.timed && c.startedAt !== undefined) return;
    const n = reps + 1;
    act({ t: 'tap', at: Date.now() });
    if (p.buzz) vibrate(p.bar !== undefined && n === p.bar + 1 ? [40, 30, 40, 30, 80] : 12);
    ripple(e, setState({ reps: n, burnAt: c.burnAt, bottom: p.bottom, bar: p.bar }));
  };
  const cancel = () => window.clearTimeout(hold.current);

  const hint = p.timed
    ? c.startedAt === undefined
      ? 'Tap anywhere to start the clock'
      : 'Set done stops the clock'
    : c.burnAt === undefined
      ? 'Tap anywhere for each rep · hold when the burn starts'
      : `Burn from rep ${c.burnAt + 1} · ${Math.max(0, reps - c.burnAt)} past it`;
  const R = 118;
  const C = 2 * Math.PI * R;

  return (
    <LiveFrame state={state} saver={p.saver} className={tempo ? `tempo-${tempo.phase}` : ''} style={tempo ? ({ '--tempo': tempo.frac } as React.CSSProperties) : undefined} top={p.top}>
      <div className="lv-ex">
        <h1 className="lv-name">{p.name}</h1>
        <div className="lv-meta">
          <span className="lv-pill">
            Set {row.setNo} of {row.ex.sets}
            {row.drop ? ' · drop' : ''}
          </span>
          {p.kg !== null && <span className="lv-pill">{p.kg} kg</span>}
          {perSide && (
            <span className={`lv-side${row.side === p.leadSide ? ' lead' : ''}`}>
              {row.side === 'L' ? 'LEFT' : 'RIGHT'}
              {row.side === p.leadSide ? ' FIRST' : ''}
            </span>
          )}
        </div>
        {p.nudge && reps === 0 && <div className="lv-nudge">Last set ended with 2+ left. Go through the burn this time.</div>}
      </div>
      <div
        className="lv-tap"
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        role="button"
        aria-label={p.timed ? `Timed set, ${mmss(reps)} so far` : `Count a rep. ${reps} so far. Hold to mark the burn.`}
      >
        {perSide && (
          <span className="lv-bigside" aria-hidden="true">
            {row.side}
          </span>
        )}
        {p.kg !== null && (
          <span className="lv-bigkg" aria-hidden="true">
            {p.kg}
            <small>kg</small>
          </span>
        )}
        {ripples.map((r) => (
          <svg key={r.id} className={`lv-ripple ${r.cls}`} viewBox="-50 -50 100 100" style={{ left: r.x, top: r.y }} onAnimationEnd={() => setRipples((rs) => rs.filter((x) => x.id !== r.id))} aria-hidden="true">
            <path d={RIPPLE[p.theme]} vectorEffect="non-scaling-stroke" />
          </svg>
        ))}
        <div className="lv-countwrap">
          {tempo && (
            <svg className="lv-tempo-ring" viewBox="0 0 260 260" aria-hidden="true">
              <circle cx="130" cy="130" r={R} className="track" />
              <circle cx="130" cy="130" r={R} className="arc" strokeDasharray={C} strokeDashoffset={C * tempo.frac} transform="rotate(-90 130 130)" />
            </svg>
          )}
          <div className={`lv-count num tn ${state}`}>{p.timed ? mmss(reps) : reps}</div>
        </div>
        <div className="lv-word">{stateWord(state, p.bar)}</div>
        {p.aim && (
          <div className="lv-aim">
            aim <b>{p.aim}</b>
            {p.bar ? (
              <>
                {' '}
                · best <b>{p.bar}</b>
              </>
            ) : null}
          </div>
        )}
        {tempo && (
          <div className="lv-tempo" aria-label="Tempo on: lower for 3 seconds, lift for 1">
            <span className="lv-tempo-label">Tempo</span>
            {[3, 2, 1, 0].map((b) => (
              <span key={b} className={`beat${tempo.beat === b ? ' on' : ''}${b === 0 ? ' up' : ''}`}>
                {b === 0 ? 'lift' : b}
              </span>
            ))}
            <span className="lv-tempo-word">{tempo.phase === 'down' ? 'lowering' : tempo.phase === 'up' ? 'lift' : 'tap at the top'}</span>
          </div>
        )}
        <div className="lv-hint">
          {hint}
          {!p.timed && repsSlowing(c.taps) && <span className="lv-slow"> · reps slowing</span>}
        </div>
      </div>
      <div className="lv-actions">
        <button type="button" className="lv-ghost" disabled={c.taps.length === 0} onClick={() => act({ t: 'undo' })}>
          {p.timed ? 'Reset' : '−1'}
        </button>
        <Primary disabled={reps === 0} onClick={p.onDone}>
          Set done · {p.timed ? mmss(reps) : reps}
        </Primary>
      </div>
      {reps === 0 && (
        <button type="button" className="lv-skip" onClick={p.onSkip}>
          Skip this set
        </button>
      )}
    </LiveFrame>
  );
}
