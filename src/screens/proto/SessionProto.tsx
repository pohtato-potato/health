import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { back } from '../../router';
import { Icon } from '../../ui/Icon';

/**
 * Design prototype (not wired to data): the live session as two full-screen states, the set and the rest,
 * in the app's own Dusk look. Nothing here is saved.
 */

const EX = { name: 'Romanian deadlift', short: 'RDL', kg: 10, sets: 3, lo: 8, hi: 12, tempo: true, cue: 'Push your hips back; the dumbbells slide down your thighs.' };
const LAST = [18, 16, 15];
const PLAN = [
  { id: '1', name: 'Romanian deadlift', kg: 10 },
  { id: '2', name: 'Goblet box squat', kg: 10 },
  { id: '3', name: 'Incline push-up', kg: null },
  { id: '4', name: 'Lean-away lateral', kg: 5 },
  { id: '5a', name: 'Skull crusher', kg: 5 },
  { id: '5b', name: 'Floor fly', kg: 5 },
  { id: '6', name: 'Calf raise', kg: 10 },
  { id: '7', name: 'Forearm plank', kg: null },
];
const FORM = [
  { id: 'hips', text: 'Hips went back first' },
  { id: 'flat', text: 'Back stayed flat' },
  { id: 'head', text: 'Head in line' },
  { id: 'slow', text: 'Slow on the way down' },
];
const REST = 90;
const HOLD_MS = 450;

type Mark = 'ok' | 'slip';
type Done = { reps: number; burn?: number; checks: Record<string, Mark>; rir?: number };

export function SessionProto() {
  const [mode, setMode] = useState<'set' | 'check' | 'rest'>('set');
  const [setNo, setSetNo] = useState(1);
  const [reps, setReps] = useState(0);
  const [burn, setBurn] = useState<number | undefined>();
  const [done, setDone] = useState<Done[]>([]);
  const [checks, setChecks] = useState<Record<string, Mark>>({});
  const [rir, setRir] = useState<number | undefined>();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; hot: boolean }[]>([]);
  const [restLeft, setRestLeft] = useState(REST);
  const [glance, setGlance] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);

  useEffect(() => {
    if (mode !== 'rest') return;
    setRestLeft(REST);
    const t = window.setInterval(() => setRestLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [mode]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    held.current = false;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setBurn(reps);
      navigator.vibrate?.([30, 40, 30]);
      setRipples((rs) => [...rs.slice(-4), { id: Date.now(), x, y, hot: true }]);
    }, HOLD_MS);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    window.clearTimeout(holdTimer.current);
    if (held.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    setReps((n) => n + 1);
    navigator.vibrate?.(12);
    setRipples((rs) => [...rs.slice(-4), { id: Date.now(), x: e.clientX - r.left, y: e.clientY - r.top, hot: burn !== undefined }]);
  };

  const finishSet = () => {
    setChecks({ ...(done[done.length - 1]?.checks ?? {}) });
    setRir(done[done.length - 1]?.rir);
    setMode('check');
  };
  const saveCheck = () => {
    setDone([...done, { reps, burn, checks, rir }]);
    setMode('rest');
  };
  const nextSet = () => {
    setSetNo((n) => Math.min(EX.sets, n + 1));
    setReps(0);
    setBurn(undefined);
    setRipples([]);
    setMode('set');
  };

  const inRange = reps >= EX.lo;
  const atTop = reps >= EX.hi;
  const prev = done[done.length - 1];
  const lastThis = LAST[setNo - 1];

  return (
    <div className="proto">
      <header className="proto-top">
        <button type="button" className="proto-icon" aria-label="Back" onClick={() => back('/train')}>
          <Icon name="down" size={22} stroke={1.8} />
        </button>
        <span className="proto-title">
          <span className="t13 q">Session C</span>
          <b className="num tn">{mode === 'rest' ? 'Resting' : '12:40'}</b>
        </span>
        <button type="button" className="proto-glance" onClick={() => setGlance(true)}>
          Session
        </button>
      </header>

      <nav className="proto-strip" aria-label="Exercises">
        {PLAN.map((p, i) => (
          <span key={p.id} className={`proto-seg${i === 0 ? ' cur' : ''}${i === 3 ? ' change' : ''}`}>
            {i === 0 ? <b>{p.id}</b> : p.id}
          </span>
        ))}
      </nav>

      {mode === 'set' && (
        <section className="proto-set">
          <div className="proto-ex">
            <h1 className="proto-name">{EX.name}</h1>
            <div className="proto-meta">
              <span className="proto-pill">
                Set {setNo} of {EX.sets}
              </span>
              <span className="proto-pill kg">{EX.kg} kg</span>
              {EX.tempo && <span className="proto-pill tempo">3 s lowering · on</span>}
            </div>
          </div>
          <div className="proto-tap" onPointerDown={down} onPointerUp={up} onPointerLeave={() => window.clearTimeout(holdTimer.current)} role="button" aria-label={`Count a rep. ${reps} so far. Hold to mark the burn.`}>
            {ripples.map((r) => (
              <i key={r.id} className={`proto-ripple${r.hot ? ' hot' : ''}`} style={{ left: r.x, top: r.y }} onAnimationEnd={() => setRipples((rs) => rs.filter((x) => x.id !== r.id))} />
            ))}
            <Ladder reps={reps} burn={burn} />
            <div className={`proto-count num tn${atTop ? ' top' : inRange ? ' in' : ''}`}>{reps}</div>
            <div className="proto-aim">
              aim <b>
                {EX.lo}–{EX.hi}
              </b>{' '}
              · last time <b>{lastThis}</b>
            </div>
            <div className="proto-hint">{burn === undefined ? 'Tap anywhere for each rep · hold when the burn starts' : `Burn from rep ${burn} · ${Math.max(0, reps - burn)} past it`}</div>
          </div>
          <div className="proto-actions">
            <button type="button" className="btn ghost proto-undo" disabled={reps === 0} onClick={() => setReps((n) => Math.max(0, n - 1))}>
              −1
            </button>
            <button type="button" className="btn lg proto-done" disabled={reps === 0} onClick={finishSet}>
              Set done · {reps}
            </button>
          </div>
        </section>
      )}

      {mode === 'check' && (
        <section className="proto-check">
          <h2 className="proto-name" style={{ fontSize: 30 }}>
            {reps} reps at {EX.kg} kg
          </h2>
          <p className="t15 q">{prev ? 'Last set’s answers are filled in. Change only what was different.' : 'Tap once if it went well, twice if it slipped.'}</p>
          <div className="proto-checks">
            {FORM.map((f) => {
              const m = checks[f.id];
              const nextMark = (c: Record<string, Mark>) => {
                const n = { ...c };
                if (!c[f.id]) n[f.id] = 'ok';
                else if (c[f.id] === 'ok') n[f.id] = 'slip';
                else delete n[f.id];
                return n;
              };
              return (
                <button key={f.id} type="button" className={`proto-check-row${m ? ` ${m}` : ''}`} aria-label={`${f.text}: ${m === 'ok' ? 'went well' : m === 'slip' ? 'slipped' : 'not marked'}`} onClick={() => setChecks(nextMark)}>
                  <span className="box" aria-hidden="true">{m === 'ok' ? '✓' : m === 'slip' ? '✕' : ''}</span>
                  <span className="grow">{f.text}</span>
                  {m && <span className="t14 state">{m === 'ok' ? 'went well' : 'slipped'}</span>}
                </button>
              );
            })}
          </div>
          <div className="proto-rir">
            <span className="t15">Left in the tank</span>
            <div className="row" style={{ gap: 8 }}>
              {[0, 1, 2, 3].map((n) => (
                <button key={n} type="button" className={`chip proto-rir-chip r${n}${rir === n ? ' on' : ''}`} aria-pressed={rir === n} onClick={() => setRir(n)}>
                  {n === 3 ? '3+' : n}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn lg block proto-done" onClick={saveCheck}>
            {prev && JSON.stringify(checks) === JSON.stringify(prev.checks) && rir === prev.rir ? 'Same as last set' : 'Save set'}
          </button>
        </section>
      )}

      {mode === 'rest' && (
        <section className="proto-rest">
          <RestRing left={restLeft} total={REST} />
          <div className="proto-next">
            <span className="lbl">Next</span>
            <div className="proto-next-row">
              <span className="proto-next-title">
                Set {Math.min(EX.sets, setNo + 1)} · {EX.short}
              </span>
              <span className="num tn proto-next-kg">{EX.kg} kg</span>
            </div>
            <div className="t15 q">
              aim {EX.lo}–{EX.hi} · last time {LAST[Math.min(EX.sets, setNo + 1) - 1]}
            </div>
            <div className="proto-cue">{EX.cue}</div>
          </div>
          {prev && (
            <div className="proto-last t15">
              Just now <b className="num tn">{prev.reps}</b> reps
              {prev.burn !== undefined && <span className="apri"> · burn from {prev.burn}</span>}
              <span className="sage"> · {Object.values(prev.checks).filter((m) => m === 'ok').length} went well</span>
              {Object.values(prev.checks).some((m) => m === 'slip') && <span className="rose"> · {Object.values(prev.checks).filter((m) => m === 'slip').length} slipped</span>}
            </div>
          )}
          <div className="proto-actions">
            <button type="button" className="btn ghost proto-undo" onClick={() => setRestLeft((s) => s + 30)}>
              +30 s
            </button>
            <button type="button" className="btn lg proto-ready" onClick={nextSet}>
              Ready
            </button>
          </div>
        </section>
      )}

      {glance && (
        <div className="proto-sheet" role="dialog" aria-label="The session at a glance" onClick={() => setGlance(false)}>
          <div className="proto-sheet-in" onClick={(e) => e.stopPropagation()}>
            <div className="row base">
              <h2 className="h2">Session C</h2>
              <span className="t15 q">about 90 min</span>
            </div>
            {PLAN.map((p, i) => (
              <div key={p.id}>
                {i === 3 && <div className="proto-plates">Plates change · 10 → 5 kg</div>}
                <div className={`proto-glance-row${i === 0 ? ' cur' : ''}`}>
                  <span className="num tn">{p.id}</span>
                  <span className="grow">{p.name}</span>
                  <span className="t15 q">{p.kg ? `${p.kg} kg` : 'body'}</span>
                </div>
              </div>
            ))}
            <button type="button" className="btn block" onClick={() => setGlance(false)}>
              Back to the set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The rep ladder as a row of rungs: grey below the range, sage inside it, gold at the top; apricot after the burn mark. */
function Ladder({ reps, burn }: { reps: number; burn?: number }) {
  const n = Math.max(EX.hi, reps);
  return (
    <div className="proto-ladder" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const r = i + 1;
        const cls = r > reps ? '' : burn !== undefined && r > burn ? 'burn' : r >= EX.hi ? 'top' : r >= EX.lo ? 'in' : 'on';
        return <i key={r} className={`${cls}${r === EX.lo || r === EX.hi ? ' mark' : ''}`} />;
      })}
    </div>
  );
}

/** Rest as a ring that empties, in the rest colour, with the time in large serif numerals. */
function RestRing({ left, total }: { left: number; total: number }) {
  const R = 118;
  const C = 2 * Math.PI * R;
  const frac = total ? left / total : 0;
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <div className="proto-ring" role="timer" aria-label={`Rest, ${mm} left`}>
      <svg viewBox="0 0 260 260" width="260" height="260" aria-hidden="true">
        <circle cx="130" cy="130" r={R} className="track" />
        <circle cx="130" cy="130" r={R} className="fill" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 130 130)" />
      </svg>
      <div className="proto-ring-in">
        <div className="num tn proto-rest-time">{mm}</div>
        <div className="t15 q">{left === 0 ? 'Rest is over' : 'rest'}</div>
      </div>
    </div>
  );
}
