import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { buzz as vibrate } from '../../audio';
import { RIPPLE } from '../../domain/liveLook';
import { counter, HOLD_MS, IDLE_PRESS, press, repsSlowing, seconds, setState, stateWord, tapTempo, type CounterAction, type PressEvent } from '../../domain/liveSet';
import type { ThemeId } from '../../domain/themes';
import type { LiveCounter } from '../../domain/types';
import type { Row } from '../session/SetTable';
import { Icon } from '../../ui/Icon';
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
  /** Heavier than ever before: no best to show. */
  firstAtLoad?: boolean;
  tempo: boolean;
  timed: boolean;
  nudge: boolean;
  leadSide?: 'L' | 'R';
  c: LiveCounter;
  onCounter: (c: LiveCounter) => void;
  onDone: () => void;
  onSkip: () => void;
  /** The load as words, for gym kit: "stack 7 kg", "40 kg total". */
  kgText?: string;
  /** The short unit under the big number: kg, lb, no., plates. */
  unit?: string;
  /** Gym kit: tap the load to set tonight's number. */
  onLoad?: () => void;
  /** Pain or strain during the set: a body log entry with this exercise, side and set. */
  onBody?: () => void;
  /** A half-set night: why, and the rule. */
  half?: string;
  /** Where to stop: "Stop 2–3 short", "To 0–1 left". */
  effort?: string;
  /** Done back to back with another exercise: its name. */
  pair?: string;
  /** The gym's breathing line. */
  breathe?: string;
  /** Minus and plus beside the weight, for good or this set only. */
  step?: { onStep: (dir: -1 | 1) => void; scope: 'good' | 'once'; onScope: (s: 'good' | 'once') => void; changed: boolean };
  /** What the number is, under it: "stack · seat 4". */
  loadNote?: string;
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
  const gesture = useRef(IDLE_PRESS);
  const at = useRef({ x: 0, y: 0 });
  const reps = p.timed ? seconds(c, p.now) : c.taps.length;
  const state = setState({ reps, burnAt: c.burnAt, bottom: p.bottom, bar: p.bar });
  const last = c.taps[c.taps.length - 1];
  const tempo = p.tempo && !p.timed ? tapTempo(last === undefined ? undefined : p.now - last) : undefined;
  const perSide = row.side !== 'both';

  // Fast taps land before the next render: count from the latest value, not this render's.
  const latest = useRef(c);
  latest.current = c;
  const act = (a: CounterAction) => {
    const n = counter(latest.current, a);
    latest.current = n;
    p.onCounter(n);
  };
  // The ripple's spot is read at the press: the event is gone by the time a hold fires.
  const ripple = (cls: string) => {
    setRipples((rs) => [...rs.slice(-5), { id: Date.now() + Math.random(), x: at.current.x, y: at.current.y, cls }]);
  };
  const onHold = () => {
    act({ t: 'hold', at: Date.now() });
    if (p.buzz) vibrate([30, 40, 30]);
    ripple('burn');
  };
  const onTap = () => {
    if (p.timed && latest.current.startedAt !== undefined) return;
    const n = latest.current.taps.length + 1;
    act({ t: 'tap', at: Date.now() });
    if (p.buzz) vibrate(p.bar !== undefined && n === p.bar + 1 ? [40, 30, 40, 30, 80] : 12);
    ripple(setState({ reps: n, burnAt: latest.current.burnAt, bottom: p.bottom, bar: p.bar }));
  };
  /** One step of the press: a quick press is a rep, a long one the burn, a second finger or a scroll neither. */
  const step = (ev: PressEvent) => {
    const { s, out } = press(gesture.current, ev);
    gesture.current = s;
    if (out === 'arm') {
      window.clearTimeout(hold.current);
      hold.current = window.setTimeout(() => step({ t: 'held' }), HOLD_MS);
    } else if (out === 'disarm') window.clearTimeout(hold.current);
    else if (out === 'hold') onHold();
    else if (out === 'tap') {
      window.clearTimeout(hold.current);
      onTap();
    }
  };
  const down = (e: PointerEvent<HTMLElement>) => {
    if (e.isPrimary) {
      const r = e.currentTarget.getBoundingClientRect();
      at.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    step({ t: 'down', primary: e.isPrimary, timed: p.timed });
  };
  const up = (e: PointerEvent<HTMLElement>) => step({ t: 'up', primary: e.isPrimary });
  const cancel = () => step({ t: 'cancel' });

  const started = c.startedAt !== undefined;
  const hint = p.timed
    ? !started
      ? 'Start set, or tap anywhere, to start the clock'
      : 'Set done stops the clock'
    : !started
      ? 'Tap Start set as you begin · then tap anywhere for each rep'
      : c.burnAt === undefined
        ? 'Tap anywhere for each rep · hold when the burn starts'
        : `Burn from rep ${c.burnAt + 1} · ${Math.max(0, reps - c.burnAt)} past it`;
  /** Start set: the clock runs from this tap, so the set's time is right even when reps are tapped at the end. */
  const start = () => (p.timed ? onTap() : act({ t: 'start', at: Date.now() }));
  const runFor = started && !p.timed ? seconds(c, p.now) : undefined;
  const R = 118;
  const C = 2 * Math.PI * R;

  const clockLeads = started && !p.timed && reps === 0;
  return (
    <LiveFrame state={state} className={`lv-set2${tempo ? ` tempo-${tempo.phase}` : ''}`} style={tempo ? ({ '--tempo': tempo.frac } as React.CSSProperties) : undefined} top={p.top}>
      <div className="lv-ex">
        <h1 className="lv-name">{p.name}</h1>
        {p.kg !== null || p.onLoad ? (
          <div className="lv-load">
            {p.step && (
              <button type="button" className="lv-stepbtn" aria-label="Lighter" onClick={() => p.step!.onStep(-1)}>
                <Icon name="minus" size={26} stroke={2.2} />
              </button>
            )}
            {p.onLoad ? (
              <button type="button" className="lv-loadv" onClick={p.onLoad} aria-label={`${p.kgText ?? 'No load set'}. Type the number`}>
                <b className="num tn">{p.kg === null ? 'Set' : p.kg}</b> {p.kg === null ? 'the load' : p.unit ?? 'kg'}
                {p.loadNote && <small>{p.loadNote}</small>}
              </button>
            ) : (
              <span className="lv-loadv">
                <b className="num tn">{p.kg}</b> {p.unit ?? 'kg'}
                {p.loadNote && <small>{p.loadNote}</small>}
              </span>
            )}
            {p.step && (
              <button type="button" className="lv-stepbtn" aria-label="Heavier" onClick={() => p.step!.onStep(1)}>
                <Icon name="plus" size={26} stroke={2.2} />
              </button>
            )}
          </div>
        ) : null}
        {p.step && (
          <div className="lv-scope" role="radiogroup" aria-label="Weight change: for good or this set only">
            {(['good', 'once'] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={p.step!.scope === k} className={p.step!.scope === k ? 'on' : ''} onClick={() => p.step!.onScope(k)}>
                {k === 'good' ? 'From now on' : 'This set only'}
              </button>
            ))}
          </div>
        )}
        <div className="lv-meta">
          <span className="lv-pill">
            Set {row.setNo} of {Math.max(row.ex.sets, row.setNo)}
            {row.setNo > row.ex.sets ? ' · extra' : ''}
            {row.drop ? ' · drop' : ''}
          </span>
          {p.pair && (
            <span className="lv-pill">
              <Icon name="link" size={16} stroke={1.8} /> back to back with {p.pair}
            </span>
          )}
          {p.half && <span className="lv-pill">{p.half}</span>}
          {runFor !== undefined && !clockLeads && (
            <span className="lv-pill tn" aria-label={`Set time ${mmss(runFor)}`}>
              <Icon name="stopwatch" size={16} stroke={1.8} /> {mmss(runFor)}
            </span>
          )}
          {perSide && (
            <span className={`lv-side${row.side === p.leadSide ? ' lead' : ''}`}>
              {row.side === 'L' ? 'LEFT' : 'RIGHT'}
              {row.side === p.leadSide ? ' FIRST' : ''}
            </span>
          )}
        </div>
        {/* Kept in place after the first rep, so the count never moves under the magnifier. */}
        {p.nudge && (
          <div className="lv-nudge" aria-hidden={reps > 0} style={reps > 0 ? { visibility: 'hidden' } : undefined}>
            Last set ended with 2+ left. Go through the burn this time.
          </div>
        )}
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
          <div className="lv-ghosts" aria-hidden="true">
            <span className="lv-bigside">{row.side}</span>
          </div>
        )}
        {ripples.map((r) => (
          <svg key={r.id} className={`lv-ripple ${r.cls}`} viewBox="-50 -50 100 100" style={{ left: r.x, top: r.y }} onAnimationEnd={() => setRipples((rs) => rs.filter((x) => x.id !== r.id))} aria-hidden="true">
            <path d={RIPPLE[p.theme]} vectorEffect="non-scaling-stroke" />
          </svg>
        ))}
        <div className="lv-countwrap">
          {tempo && !clockLeads && (
            <svg className="lv-tempo-ring" viewBox="0 0 260 260" aria-hidden="true">
              <circle cx="130" cy="130" r={R} className="track" />
              <circle cx="130" cy="130" r={R} className="arc" strokeDasharray={C} strokeDashoffset={C * tempo.frac} transform="rotate(-90 130 130)" />
            </svg>
          )}
          <div className={`lv-count num tn ${clockLeads ? 'clock' : state}`}>{p.timed || clockLeads ? mmss(p.timed ? reps : runFor ?? 0) : reps}</div>
        </div>
        <div className="lv-word">{clockLeads ? 'the set is running' : stateWord(state, p.bar, p.firstAtLoad)}</div>
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
      {(p.aim || p.effort) && (
        <div className="lv-aimeff">
          {p.aim && (
            <div className="lv-mini">
              <span>Aim</span>
              <b className="num tn">{p.aim}</b>
              {p.bar && !p.firstAtLoad ? <span>best {p.bar}</span> : null}
            </div>
          )}
          {p.effort && (
            <div className="lv-mini">
              <span>Effort</span>
              <b>{p.effort}</b>
            </div>
          )}
        </div>
      )}
      {p.breathe && (
        <div className="lv-breathe">
          <Icon name="wind" size={22} stroke={1.8} />
          {p.breathe}
        </div>
      )}
      <div className="lv-actions">
        {!p.timed && started ? (
          <button type="button" className="lv-ghost" disabled={c.burnAt !== undefined} onClick={onHold}>
            It burns
          </button>
        ) : (
          <button type="button" className="lv-ghost" disabled={c.taps.length === 0 && c.burnAt === undefined} onClick={() => act({ t: 'undo' })}>
            {p.timed ? 'Reset' : '−1'}
          </button>
        )}
        {started ? (
          <Primary disabled={p.timed && reps === 0} onClick={p.onDone}>
            Set done{reps > 0 ? ` · ${p.timed ? mmss(reps) : reps}` : ''}
          </Primary>
        ) : (
          <Primary onClick={start}>Start set</Primary>
        )}
      </div>
      {/* Kept in place after the first rep, so the buttons above never move. */}
      <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        {!p.timed && started && (
          <button type="button" className="lv-skip" disabled={c.taps.length === 0} onClick={() => act({ t: 'undo' })}>
            −1 rep
          </button>
        )}
        <button type="button" className="lv-skip" onClick={p.onSkip} disabled={reps > 0} style={reps > 0 ? { visibility: 'hidden' } : undefined}>
          Skip this set
        </button>
        {p.onBody && (
          <button type="button" className="lv-skip" onClick={p.onBody}>
            Pain or strain
          </button>
        )}
      </div>
    </LiveFrame>
  );
}
