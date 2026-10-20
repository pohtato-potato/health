import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { back, useRoute } from '../../router';
import { Icon } from '../../ui/Icon';

/**
 * Design prototype (not wired to data; nothing is saved): the live session as two full-screen states,
 * the set and the rest, in the app's own Dusk look, in five directions (A–E) that share one engine.
 */

type Ex = { id: string; name: string; short: string; kg: number | null; sets: number; lo: number; hi: number; tempo: boolean; perSide: boolean; lead?: 'L' | 'R'; isolation: boolean; cue: string; checks: string[]; last: number[] };
const EXS: Ex[] = [
  { id: '1', name: 'Romanian deadlift', short: 'RDL', kg: 10, sets: 3, lo: 8, hi: 12, tempo: true, perSide: false, isolation: false, cue: 'Push your hips back; the dumbbells slide down your thighs.', checks: ['Hips went back first', 'Back stayed flat', 'Head in line', 'Slow on the way down'], last: [18, 16, 15] },
  { id: '4', name: 'Lean-away lateral raise', short: 'Lean-away', kg: 5, sets: 3, lo: 12, hi: 20, tempo: false, perSide: true, lead: 'L', isolation: true, cue: 'Lead with the elbow; stop at shoulder height.', checks: ['Elbow led', 'No shrug', 'Stopped at shoulder height', 'No swing'], last: [16, 14, 12] },
];
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
const REST = 90;
const HOLD_MS = 450;
const START = Date.now() - 34 * 60000;
const DIRS = [
  { id: 'a', name: 'Refined' },
  { id: 'b', name: 'Flight board' },
  { id: 'c', name: 'Rep timeline' },
  { id: 'd', name: 'Living colour' },
  { id: 'e', name: 'Rings' },
] as const;
type Dir = (typeof DIRS)[number]['id'];

type Mark = 'ok' | 'slip';
type Side = 'L' | 'R' | 'both';
type Done = { ex: string; setNo: number; side: Side; reps: number; burn?: number; checks: Record<string, Mark>; rir?: number; secs: number; taps: number[] };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** The shared engine: every direction renders the same state. */
function useEngine() {
  const [exIdx, setExIdx] = useState(0);
  const ex = EXS[exIdx];
  const [setNo, setSetNo] = useState(1);
  const [side, setSide] = useState<Side>(ex.perSide ? ex.lead ?? 'L' : 'both');
  const [mode, setMode] = useState<'set' | 'check' | 'rest'>('set');
  const [taps, setTaps] = useState<number[]>([]);
  const [burn, setBurn] = useState<number | undefined>();
  const [startedAt, setStartedAt] = useState<number | undefined>();
  const [done, setDone] = useState<Done[]>([]);
  const [checks, setChecks] = useState<Record<string, Mark>>({});
  const [rir, setRir] = useState<number | undefined>();
  const [restLeft, setRestLeft] = useState(REST);
  const [sheet, setSheet] = useState<null | 'session' | 'sets'>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; hot: boolean }[]>([]);
  const [now, setNow] = useState(Date.now());
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const reps = taps.length;

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (mode !== 'rest') return;
    setRestLeft(REST);
    const t = window.setInterval(() => setRestLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [mode]);

  const mine = done.filter((d) => d.ex === ex.id);
  const prevHere = [...mine].reverse().find((d) => d.side === side) ?? mine[mine.length - 1];
  const lastTime = ex.last[setNo - 1];
  const gaps = taps.slice(1).map((t, i) => (t - taps[i]) / 1000);
  const pace = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : undefined;
  const setSecs = startedAt ? (now - startedAt) / 1000 : 0;
  // The burn nudge: an isolation move whose last set ended with 2+ left in the tank.
  const nudge = ex.isolation && prevHere?.rir !== undefined && prevHere.rir >= 2;
  const state: 'build' | 'in' | 'burn' | 'top' = burn !== undefined ? 'burn' : reps >= ex.hi ? 'top' : reps >= ex.lo ? 'in' : 'build';
  const totalSets = EXS.reduce((n, e) => n + e.sets * (e.perSide ? 2 : 1), 0);
  const elapsed = (now - START) / 60000;
  const finishAt = START + 92 * 60000;

  const tapDown = (e: PointerEvent<HTMLElement>) => {
    held.current = false;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setBurn(taps.length);
      navigator.vibrate?.([30, 40, 30]);
      setRipples((rs) => [...rs.slice(-5), { id: Date.now(), x, y, hot: true }]);
    }, HOLD_MS);
  };
  const tapUp = (e: PointerEvent<HTMLElement>) => {
    window.clearTimeout(holdTimer.current);
    if (held.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const t = Date.now();
    if (!startedAt) setStartedAt(t);
    setTaps((ts) => [...ts, t]);
    navigator.vibrate?.(12);
    setRipples((rs) => [...rs.slice(-5), { id: t, x: e.clientX - r.left, y: e.clientY - r.top, hot: burn !== undefined }]);
  };
  const tapCancel = () => window.clearTimeout(holdTimer.current);
  const undo = () => setTaps((ts) => ts.slice(0, -1));
  const finishSet = () => {
    setChecks({ ...(prevHere?.checks ?? {}) });
    setRir(prevHere?.rir);
    setMode('check');
  };
  const saveCheck = () => {
    setDone([...done, { ex: ex.id, setNo, side, reps, burn, checks, rir, secs: setSecs, taps }]);
    setMode('rest');
  };
  const nextSet = () => {
    if (ex.perSide && side === (ex.lead ?? 'L')) setSide(side === 'L' ? 'R' : 'L');
    else {
      setSetNo((n) => Math.min(ex.sets, n + 1));
      if (ex.perSide) setSide(ex.lead ?? 'L');
    }
    setTaps([]);
    setBurn(undefined);
    setStartedAt(undefined);
    setRipples([]);
    setMode('set');
  };
  const pick = (i: number) => {
    setExIdx(i);
    const e = EXS[i];
    setSetNo(1);
    setSide(e.perSide ? e.lead ?? 'L' : 'both');
    setTaps([]);
    setBurn(undefined);
    setStartedAt(undefined);
    setRipples([]);
    setMode('set');
  };
  const nextLabel = ex.perSide && side === (ex.lead ?? 'L') ? `Set ${setNo} · ${side === 'L' ? 'right' : 'left'} side` : `Set ${Math.min(ex.sets, setNo + 1)}${ex.perSide ? ` · ${ex.lead === 'R' ? 'right' : 'left'} first` : ''}`;

  return { ex, exIdx, pick, setNo, side, mode, setMode, reps, taps, gaps, pace, burn, setSecs, done, mine, prevHere, lastTime, checks, setChecks, rir, setRir, restLeft, setRestLeft, sheet, setSheet, ripples, setRipples, nudge, state, totalSets, elapsed, finishAt, tapDown, tapUp, tapCancel, undo, finishSet, saveCheck, nextSet, nextLabel };
}
type E = ReturnType<typeof useEngine>;

export function SessionProto() {
  const { params } = useRoute();
  const [dir, setDir] = useState<Dir>(((params.get('v') as Dir) || 'a') as Dir);
  const e = useEngine();
  return (
    <div className={`proto dir-${dir} st-${e.state}${e.mode === 'rest' ? ' resting' : ''}`}>
      <div className="proto-dirs" role="tablist" aria-label="Design direction">
        {DIRS.map((d) => (
          <button key={d.id} type="button" role="tab" aria-selected={dir === d.id} className={dir === d.id ? 'on' : ''} onClick={() => setDir(d.id)}>
            {d.id.toUpperCase()} · {d.name}
          </button>
        ))}
      </div>
      {dir !== 'd' && dir !== 'e' && <Top e={e} />}
      {(dir === 'd' || dir === 'e') && <Top e={e} slim />}
      {dir === 'b' ? <FlightPath e={e} /> : <Strip e={e} />}
      {e.mode === 'set' && (dir === 'a' ? <SetA e={e} /> : dir === 'b' ? <SetB e={e} /> : dir === 'c' ? <SetC e={e} /> : dir === 'd' ? <SetD e={e} /> : <SetE e={e} />)}
      {e.mode === 'check' && <Check e={e} />}
      {e.mode === 'rest' && (dir === 'e' ? <RestE e={e} /> : dir === 'c' ? <RestC e={e} /> : dir === 'd' ? <RestD e={e} /> : <RestA e={e} flight={dir === 'b'} />)}
      {e.sheet === 'session' && <SessionSheet e={e} />}
      {e.sheet === 'sets' && <SetsSheet e={e} />}
    </div>
  );
}

/* ---------- shared pieces ---------- */

function Top({ e, slim }: { e: E; slim?: boolean }) {
  return (
    <header className={`proto-top${slim ? ' slim' : ''}`}>
      <button type="button" className="proto-icon" aria-label="Back" onClick={() => back('/train')}>
        <Icon name="down" size={22} stroke={1.8} />
      </button>
      <span className="proto-title">
        <span className="t13 q">Session C</span>
        <b className="num tn">{e.mode === 'rest' ? 'Resting' : `${Math.floor(e.elapsed)}:${String(Math.floor((e.elapsed % 1) * 60)).padStart(2, '0')}`}</b>
      </span>
      <span className="row" style={{ gap: 6 }}>
        <button type="button" className="proto-glance" onClick={() => e.setSheet('sets')}>
          Sets
        </button>
        <button type="button" className="proto-glance" onClick={() => e.setSheet('session')}>
          Session
        </button>
      </span>
    </header>
  );
}

function Strip({ e }: { e: E }) {
  return (
    <nav className="proto-strip" aria-label="Exercises">
      {PLAN.map((p, i) => {
        const exi = EXS.findIndex((x) => x.id === p.id);
        const cur = EXS[e.exIdx].id === p.id;
        return (
          <button key={p.id} type="button" className={`proto-seg${cur ? ' cur' : ''}${i === 3 ? ' change' : ''}`} disabled={exi < 0} onClick={() => exi >= 0 && e.pick(exi)} aria-label={p.name}>
            {cur ? <b>{p.id}</b> : p.id}
          </button>
        );
      })}
    </nav>
  );
}

function ExHead({ e, size = 34 }: { e: E; size?: number }) {
  const ex = e.ex;
  return (
    <div className="proto-ex">
      <h1 className="proto-name" style={{ fontSize: size }}>
        {ex.name}
      </h1>
      <div className="proto-meta">
        <span className="proto-pill">
          Set {e.setNo} of {ex.sets}
        </span>
        {ex.perSide && <span className={`proto-pill side${e.side === ex.lead ? ' lead' : ''}`}>{e.side === 'L' ? 'Left' : 'Right'}{e.side === ex.lead ? ' first' : ''}</span>}
        {ex.kg !== null && <span className="proto-pill kg">{ex.kg} kg</span>}
        {ex.tempo && <span className="proto-pill tempo">3 s lowering · on</span>}
      </div>
      {e.nudge && <div className="proto-nudge">Last set ended with {e.prevHere?.rir}+ left. Go through the burn this time.</div>}
    </div>
  );
}

function Ripples({ e }: { e: E }) {
  return (
    <>
      {e.ripples.map((r) => (
        <i key={r.id} className={`proto-ripple${r.hot ? ' hot' : ''}`} style={{ left: r.x, top: r.y }} onAnimationEnd={() => e.setRipples((rs) => rs.filter((x) => x.id !== r.id))} />
      ))}
    </>
  );
}

function tapProps(e: E) {
  return {
    onPointerDown: e.tapDown,
    onPointerUp: e.tapUp,
    onPointerLeave: e.tapCancel,
    role: 'button' as const,
    'aria-label': `Count a rep. ${e.reps} so far. Hold to mark the burn.`,
  };
}

function Hint({ e }: { e: E }) {
  return <div className="proto-hint">{e.burn === undefined ? 'Tap anywhere for each rep · hold when the burn starts' : `Burn from rep ${e.burn} · ${Math.max(0, e.reps - e.burn)} past it`}</div>;
}

function Aim({ e }: { e: E }) {
  return (
    <div className="proto-aim">
      aim{' '}
      <b>
        {e.ex.lo}–{e.ex.hi}
      </b>{' '}
      · last time <b>{e.lastTime}</b>
    </div>
  );
}

function Actions({ e }: { e: E }) {
  return (
    <div className="proto-actions">
      <button type="button" className="btn ghost proto-undo" disabled={e.reps === 0} onClick={e.undo}>
        −1
      </button>
      <button type="button" className="btn lg proto-done" disabled={e.reps === 0} onClick={e.finishSet}>
        Set done · {e.reps}
      </button>
    </div>
  );
}

/** The rep ladder: grey below the range, sage inside it, gold at the top; apricot after the burn mark. */
function Ladder({ e, className = 'proto-ladder' }: { e: E; className?: string }) {
  const n = Math.max(e.ex.hi, e.reps);
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const r = i + 1;
        const cls = r > e.reps ? '' : e.burn !== undefined && r > e.burn ? 'burn' : r >= e.ex.hi ? 'top' : r >= e.ex.lo ? 'in' : 'on';
        return <i key={r} className={`${cls}${r === e.ex.lo || r === e.ex.hi ? ' mark' : ''}`} />;
      })}
    </div>
  );
}

const countClass = (e: E) => `proto-count num tn ${e.state}`;

/* ---------- A · Refined ---------- */

function SetA({ e }: { e: E }) {
  return (
    <section className="proto-set">
      <ExHead e={e} />
      <div className="proto-tap" {...tapProps(e)}>
        <Ripples e={e} />
        <Ladder e={e} />
        <div className={countClass(e)}>{e.reps}</div>
        <Aim e={e} />
        <Hint e={e} />
      </div>
      <Actions e={e} />
    </section>
  );
}

/* ---------- B · Flight board ---------- */

function FlightPath({ e }: { e: E }) {
  const doneSets = e.done.length;
  const frac = Math.min(1, (doneSets + 0.5) / e.totalSets);
  return (
    <div className="proto-flight" aria-label={`Session progress, finishing about ${clock(e.finishAt)}`}>
      <div className="proto-flight-row">
        <span>
          <b className="num tn">{clock(e.finishAt)}</b> finish
        </span>
        <span className="q">
          {doneSets} of {e.totalSets} sets · plates change after 3
        </span>
      </div>
      <div className="proto-flight-line">
        <i style={{ width: `${frac * 100}%` }} />
        <span className="xchg" style={{ left: '36%' }} title="Plate change" />
        <span className="plane" style={{ left: `${frac * 100}%` }} />
      </div>
    </div>
  );
}

function SetB({ e }: { e: E }) {
  const tut = e.reps * (e.ex.tempo ? 4 : 2.5);
  return (
    <section className="proto-set">
      <ExHead e={e} size={30} />
      <div className="proto-tap b" {...tapProps(e)}>
        <Ripples e={e} />
        <div className={countClass(e)}>{e.reps}</div>
        <Aim e={e} />
        <Ladder e={e} />
        <Hint e={e} />
      </div>
      <div className="proto-stats">
        <span>
          <small>pace</small>
          <b className="num tn">{e.pace ? `${e.pace.toFixed(1)} s` : '—'}</b>
        </span>
        <span>
          <small>under tension</small>
          <b className="num tn">{e.reps ? mmss(tut) : '—'}</b>
        </span>
        <span>
          <small>this set</small>
          <b className="num tn">{mmss(e.setSecs)}</b>
        </span>
      </div>
      <Actions e={e} />
    </section>
  );
}

/* ---------- C · Rep timeline ---------- */

function RepBars({ e, gaps, burn, big }: { e: E; gaps: number[]; burn?: number; big?: boolean }) {
  const max = Math.max(4, ...gaps);
  const slots = Math.max(e.ex.hi, gaps.length + 1);
  return (
    <div className={`proto-bars${big ? ' big' : ''}`} aria-hidden="true">
      {Array.from({ length: slots }, (_, i) => {
        const g = i === 0 ? undefined : gaps[i - 1];
        const r = i + 1;
        const filled = i === 0 ? e.reps > 0 || gaps.length > 0 : g !== undefined;
        const cls = !filled ? 'empty' : burn !== undefined && r > burn ? 'burn' : r >= e.ex.hi ? 'top' : r >= e.ex.lo ? 'in' : 'on';
        const h = g !== undefined ? 18 + (g / max) * 82 : filled ? 40 : 14;
        return <i key={i} className={`${cls}${r === e.ex.lo || r === e.ex.hi ? ' mark' : ''}`} style={{ height: `${h}%` } as CSSProperties} />;
      })}
    </div>
  );
}

function SetC({ e }: { e: E }) {
  return (
    <section className="proto-set">
      <ExHead e={e} size={30} />
      <div className="proto-tap c" {...tapProps(e)}>
        <Ripples e={e} />
        <div className="proto-c-head">
          <div className={countClass(e)} style={{ fontSize: 110 }}>
            {e.reps}
          </div>
          <div className="proto-c-side">
            <Aim e={e} />
            <div className="t15 q">{e.pace ? `${e.pace.toFixed(1)} s a rep` : 'pace shows after rep 2'}</div>
          </div>
        </div>
        <RepBars e={e} gaps={e.gaps} burn={e.burn} big />
        <div className="proto-c-axis">
          <span>rep 1</span>
          <span>bar height = time per rep</span>
          <span>{e.ex.hi}</span>
        </div>
        <Hint e={e} />
      </div>
      <Actions e={e} />
    </section>
  );
}

/* ---------- D · Living colour ---------- */

function SetD({ e }: { e: E }) {
  return (
    <section className="proto-set d" {...tapProps(e)}>
      <Ripples e={e} />
      <ExHead e={e} size={30} />
      <div className="proto-d-center">
        <div className={countClass(e)} style={{ fontSize: 190 }}>
          {e.reps}
        </div>
        <Aim e={e} />
        <div className="proto-d-word">{e.state === 'build' ? 'building' : e.state === 'in' ? 'in range' : e.state === 'top' ? 'top of the range' : 'in the burn'}</div>
      </div>
      <Hint e={e} />
      <div onPointerDown={(x) => x.stopPropagation()} onPointerUp={(x) => x.stopPropagation()}>
        <Actions e={e} />
      </div>
    </section>
  );
}

/* ---------- E · Rings ---------- */

function Arc({ r, frac, cls, w = 12 }: { r: number; frac: number; cls: string; w?: number }) {
  const C = 2 * Math.PI * r;
  return (
    <>
      <circle cx="150" cy="150" r={r} className="ring-track" strokeWidth={w} />
      <circle cx="150" cy="150" r={r} className={`ring-fill ${cls}`} strokeWidth={w} strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, frac))} transform="rotate(-90 150 150)" />
    </>
  );
}

function Rings({ e, center, restFrac }: { e: E; center: ReactNode; restFrac?: number }) {
  const sets = e.ex.sets * (e.ex.perSide ? 2 : 1);
  const doneHere = e.mine.length;
  const repCls = e.state === 'burn' ? 'burn' : e.state === 'top' ? 'top' : e.state === 'in' ? 'in' : 'on';
  return (
    <div className="proto-rings">
      <svg viewBox="0 0 300 300" width="300" height="300" aria-hidden="true">
        <Arc r={136} frac={(e.done.length + (e.mode === 'set' ? 0.5 : 0)) / e.totalSets} cls="session" w={8} />
        <Arc r={118} frac={doneHere / sets} cls="sets" w={10} />
        {restFrac !== undefined ? <Arc r={96} frac={restFrac} cls="rest" w={14} /> : <Arc r={96} frac={e.reps / e.ex.hi} cls={repCls} w={14} />}
      </svg>
      <div className="proto-rings-in">{center}</div>
    </div>
  );
}

function SetE({ e }: { e: E }) {
  return (
    <section className="proto-set e">
      <ExHead e={e} size={30} />
      <div className="proto-tap e" {...tapProps(e)}>
        <Ripples e={e} />
        <Rings e={e} center={<div className={countClass(e)} style={{ fontSize: 96 }}>{e.reps}</div>} />
        <Aim e={e} />
        <div className="proto-legend">
          <span className="lg-rep">reps</span>
          <span className="lg-sets">sets of this</span>
          <span className="lg-session">session</span>
        </div>
      </div>
      <Actions e={e} />
    </section>
  );
}

/* ---------- check step (shared) ---------- */

function Check({ e }: { e: E }) {
  const prev = e.prevHere;
  return (
    <section className="proto-check">
      <h2 className="proto-name" style={{ fontSize: 30 }}>
        {e.reps} reps{e.ex.kg !== null ? ` at ${e.ex.kg} kg` : ''}
        {e.ex.perSide ? ` · ${e.side === 'L' ? 'left' : 'right'}` : ''}
      </h2>
      <p className="t15 q">{prev ? 'Last set’s answers are filled in. Change only what was different.' : 'Tap once if it went well, twice if it slipped.'}</p>
      <div className="proto-checks">
        {e.ex.checks.map((text) => {
          const m = e.checks[text];
          const next = (c: Record<string, Mark>) => {
            const n = { ...c };
            if (!c[text]) n[text] = 'ok';
            else if (c[text] === 'ok') n[text] = 'slip';
            else delete n[text];
            return n;
          };
          return (
            <button key={text} type="button" className={`proto-check-row${m ? ` ${m}` : ''}`} aria-label={`${text}: ${m === 'ok' ? 'went well' : m === 'slip' ? 'slipped' : 'not marked'}`} onClick={() => e.setChecks(next)}>
              <span className="box" aria-hidden="true">{m === 'ok' ? '✓' : m === 'slip' ? '✕' : ''}</span>
              <span className="grow">{text}</span>
              {m && <span className="t14 state">{m === 'ok' ? 'went well' : 'slipped'}</span>}
            </button>
          );
        })}
      </div>
      <div className="proto-rir">
        <span className="t15">Left in the tank</span>
        <div className="row" style={{ gap: 8 }}>
          {[0, 1, 2, 3].map((n) => (
            <button key={n} type="button" className={`chip proto-rir-chip r${n}${e.rir === n ? ' on' : ''}`} aria-pressed={e.rir === n} onClick={() => e.setRir(n)}>
              {n === 3 ? '3+' : n}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="btn lg block proto-done" onClick={e.saveCheck}>
        {prev && JSON.stringify(e.checks) === JSON.stringify(prev.checks) && e.rir === prev.rir ? 'Same as last set' : 'Save set'}
      </button>
    </section>
  );
}

/* ---------- rest states ---------- */

function JustNow({ e }: { e: E }) {
  const d = e.done[e.done.length - 1];
  if (!d) return null;
  const ok = Object.values(d.checks).filter((m) => m === 'ok').length;
  const slip = Object.values(d.checks).filter((m) => m === 'slip').length;
  return (
    <div className="proto-last t15">
      Just now <b className="num tn">{d.reps}</b> reps
      {d.burn !== undefined && <span className="apri"> · burn from {d.burn}</span>}
      {ok > 0 && <span className="sage"> · {ok} went well</span>}
      {slip > 0 && <span className="rose"> · {slip} slipped</span>}
    </div>
  );
}

function NextCard({ e }: { e: E }) {
  return (
    <div className="proto-next">
      <span className="lbl">Next</span>
      <div className="proto-next-row">
        <span className="proto-next-title">{e.nextLabel}</span>
        {e.ex.kg !== null && <span className="num tn proto-next-kg">{e.ex.kg} kg</span>}
      </div>
      <div className="t15 q">
        {e.ex.short} · aim {e.ex.lo}–{e.ex.hi}
      </div>
      <div className="proto-cue">{e.ex.cue}</div>
    </div>
  );
}

function RestButtons({ e }: { e: E }) {
  return (
    <div className="proto-actions">
      <button type="button" className="btn ghost proto-undo" onClick={() => e.setRestLeft((s) => s + 30)}>
        +30 s
      </button>
      <button type="button" className="btn lg proto-ready" onClick={e.nextSet}>
        Ready
      </button>
    </div>
  );
}

function RestRing({ left, total, size = 260 }: { left: number; total: number; size?: number }) {
  const R = 118;
  const C = 2 * Math.PI * R;
  const frac = total ? left / total : 0;
  return (
    <div className="proto-ring" role="timer" aria-label={`Rest, ${mmss(left)} left`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 260 260" width={size} height={size} aria-hidden="true">
        <circle cx="130" cy="130" r={R} className="track" />
        <circle cx="130" cy="130" r={R} className="fill" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 130 130)" />
      </svg>
      <div className="proto-ring-in">
        <div className="num tn proto-rest-time">{mmss(left)}</div>
        <div className="t15 q">{left === 0 ? 'Rest is over' : 'rest'}</div>
      </div>
    </div>
  );
}

function RestA({ e, flight }: { e: E; flight?: boolean }) {
  return (
    <section className="proto-rest">
      <RestRing left={e.restLeft} total={REST} size={flight ? 220 : 260} />
      {flight && (
        <div className="proto-board">
          <span>
            <small>next set boards in</small>
            <b className="num tn">{mmss(e.restLeft)}</b>
          </span>
          <span>
            <small>sets left</small>
            <b className="num tn">{e.totalSets - e.done.length}</b>
          </span>
          <span>
            <small>finish</small>
            <b className="num tn">{clock(e.finishAt)}</b>
          </span>
        </div>
      )}
      <NextCard e={e} />
      <JustNow e={e} />
      <RestButtons e={e} />
    </section>
  );
}

function RestC({ e }: { e: E }) {
  const d = e.done[e.done.length - 1];
  const g = d ? d.taps.slice(1).map((t, i) => (t - d.taps[i]) / 1000) : [];
  return (
    <section className="proto-rest">
      <div className="proto-c-rest">
        <div className="num tn proto-rest-time">{mmss(e.restLeft)}</div>
        <div className="proto-c-restbar">
          <i style={{ width: `${(e.restLeft / REST) * 100}%` }} />
        </div>
      </div>
      {d && (
        <div className="proto-recap">
          <span className="lbl">That set, rep by rep</span>
          <RepBars e={{ ...e, reps: d.reps }} gaps={g} burn={d.burn} />
        </div>
      )}
      <NextCard e={e} />
      <RestButtons e={e} />
    </section>
  );
}

function RestD({ e }: { e: E }) {
  return (
    <section className="proto-rest d">
      <div className="proto-d-center">
        <div className="num tn" style={{ fontSize: 120, fontWeight: 300, lineHeight: 1 }}>
          {mmss(e.restLeft)}
        </div>
        <div className="proto-d-word">breathe · rest</div>
      </div>
      <NextCard e={e} />
      <JustNow e={e} />
      <RestButtons e={e} />
    </section>
  );
}

function RestE({ e }: { e: E }) {
  return (
    <section className="proto-rest">
      <Rings
        e={e}
        restFrac={e.restLeft / REST}
        center={
          <div className="col" style={{ alignItems: 'center' }}>
            <div className="num tn proto-rest-time" style={{ fontSize: 64 }}>
              {mmss(e.restLeft)}
            </div>
            <span className="t14 q">rest</span>
          </div>
        }
      />
      <NextCard e={e} />
      <RestButtons e={e} />
    </section>
  );
}

/* ---------- sheets ---------- */

function SessionSheet({ e }: { e: E }) {
  return (
    <div className="proto-sheet" role="dialog" aria-label="The session at a glance" onClick={() => e.setSheet(null)}>
      <div className="proto-sheet-in" onClick={(x) => x.stopPropagation()}>
        <div className="row base">
          <h2 className="h2">Session C</h2>
          <span className="t15 q">usually 92 min · finish {clock(e.finishAt)}</span>
        </div>
        {PLAN.map((p, i) => (
          <div key={p.id}>
            {i === 3 && <div className="proto-plates">Plates change · 10 → 5 kg</div>}
            <div className={`proto-glance-row${EXS[e.exIdx].id === p.id ? ' cur' : ''}`}>
              <span className="num tn">{p.id}</span>
              <span className="grow">{p.name}</span>
              <span className="t15 q">{p.kg ? `${p.kg} kg` : 'body'}</span>
            </div>
          </div>
        ))}
        <button type="button" className="btn block" onClick={() => e.setSheet(null)}>
          Back to the set
        </button>
      </div>
    </div>
  );
}

/** The quick look at this exercise's sets: done, now and still to come, beside last time. */
function SetsSheet({ e }: { e: E }) {
  const ex = e.ex;
  const sides: Side[] = ex.perSide ? (ex.lead === 'R' ? ['R', 'L'] : ['L', 'R']) : ['both'];
  return (
    <div className="proto-sheet" role="dialog" aria-label={`${ex.name}: sets`} onClick={() => e.setSheet(null)}>
      <div className="proto-sheet-in" onClick={(x) => x.stopPropagation()}>
        <div className="row base">
          <h2 className="h2" style={{ fontSize: 24 }}>
            {ex.name}
          </h2>
          <span className="t15 q">{ex.kg !== null ? `${ex.kg} kg` : 'body'}</span>
        </div>
        <div className="proto-sets-head t14 q">
          <span>Set</span>
          <span>Tonight</span>
          <span>Last time</span>
        </div>
        {Array.from({ length: ex.sets }, (_, i) => i + 1).flatMap((n) =>
          sides.map((s) => {
            const d = e.mine.find((x) => x.setNo === n && x.side === s);
            const now = e.mode !== 'rest' && n === e.setNo && s === e.side;
            const slip = d && Object.values(d.checks).some((m) => m === 'slip');
            return (
              <div key={`${n}${s}`} className={`proto-sets-row${now ? ' now' : ''}${d ? ' done' : ''}`}>
                <span>
                  {n}
                  {s !== 'both' ? ` ${s}` : ''}
                </span>
                <span className="num tn">
                  {d ? (
                    <>
                      {d.reps}
                      {d.burn !== undefined && <span className="proto-tag burn">burn</span>}
                      {slip && <span className="proto-tag slip">slipped</span>}
                    </>
                  ) : now ? (
                    <span className="sage">{e.reps || 'now'}</span>
                  ) : (
                    '—'
                  )}
                </span>
                <span className="num tn q">{ex.last[n - 1]}</span>
              </div>
            );
          }),
        )}
        <button type="button" className="btn block" onClick={() => e.setSheet(null)}>
          Back to the set
        </button>
      </div>
    </div>
  );
}
