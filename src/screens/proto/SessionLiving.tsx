import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { back, useRoute } from '../../router';
import { Icon } from '../../ui/Icon';

/**
 * Design prototype (not wired to data; nothing is saved): the whole live session in the "living colour"
 * direction, in the app's own Dusk look. The background carries the state of the set:
 * gold (a new record) > orange (the burn) > green (in range) > white (building), blue at rest.
 */

type Ex = {
  id: string;
  name: string;
  short: string;
  kg: number | null;
  sets: number;
  lo: number;
  hi: number;
  tempo: boolean;
  perSide: boolean;
  lead?: 'L' | 'R';
  leadWhy?: string;
  isolation: boolean;
  cue: string;
  checks: string[];
  last: number[];
  best: number;
  bestOn: string;
  guide: { setup: string; move: string; feel: string; stop: string };
  setup: string;
};
const EXS: Ex[] = [
  {
    id: '1',
    name: 'Romanian deadlift',
    short: 'RDL',
    kg: 10,
    sets: 3,
    lo: 8,
    hi: 12,
    tempo: true,
    perSide: false,
    isolation: false,
    cue: 'Push your hips back; the dumbbells slide down your thighs.',
    checks: ['Hips went back first', 'Back stayed flat', 'Head in line', 'Slow on the way down'],
    last: [18, 16, 15],
    best: 18,
    bestOn: '18 Oct',
    guide: {
      setup: 'Feet hip-width, soft knees, a dumbbell in each hand against the front of your thighs.',
      move: 'Push your hips back and let the dumbbells slide down your thighs, back flat, for 3 seconds. Stand up by driving your hips forward.',
      feel: 'A stretch in the back of your thighs. Not your lower back.',
      stop: 'Stop if your lower back aches or rounds.',
    },
    setup: 'Mat in front of the bed; dumbbells start on the floor.',
  },
  {
    id: '4',
    name: 'Lean-away lateral raise',
    short: 'Lean-away',
    kg: 5,
    sets: 3,
    lo: 12,
    hi: 20,
    tempo: false,
    perSide: true,
    lead: 'L',
    leadWhy: 'the smaller left arm leads',
    isolation: true,
    cue: 'Lead with the elbow; stop at shoulder height.',
    checks: ['Elbow led', 'No shrug', 'Stopped at shoulder height', 'No swing'],
    last: [16, 14, 12],
    best: 16,
    bestOn: '13 Oct',
    guide: {
      setup: 'Hold the door frame with one hand and lean away, arm straight.',
      move: 'Raise the dumbbell out to the side, leading with the elbow, to shoulder height. Lower slowly.',
      feel: 'The side of your shoulder.',
      stop: 'Stop at any pinch in the shoulder.',
    },
    setup: 'Right hand on the bedroom door frame at chest height.',
  },
];
const PLAN = [
  { id: '1', name: 'Romanian deadlift', kg: 10, legs: true },
  { id: '2', name: 'Goblet box squat', kg: 10, legs: true },
  { id: '3', name: 'Incline push-up', kg: null, legs: false },
  { id: '4', name: 'Lean-away lateral', kg: 5, legs: false },
  { id: '5a', name: 'Skull crusher', kg: 5, legs: false },
  { id: '5b', name: 'Floor fly', kg: 5, legs: false },
  { id: '6', name: 'Calf raise', kg: 10, legs: true },
  { id: '7', name: 'Forearm plank', kg: null, legs: false },
];
const REST = 90;
const HOLD_MS = 450;
const START = Date.now() - 34 * 60000;
const SONG = 'Midnight City · M83';

const LOOKS = [
  { id: 'glow', name: 'Glow' },
  { id: 'aurora', name: 'Aurora' },
  { id: 'tide', name: 'Tide' },
] as const;
type Look = (typeof LOOKS)[number]['id'];
const SCREENS = ['before', 'guide', 'set', 'check', 'rest', 'plates', 'record', 'finale'] as const;
type Screen = (typeof SCREENS)[number];
const SCREEN_NAMES: Record<Screen, string> = { before: 'Before', guide: 'Guide', set: 'Set', check: 'Check', rest: 'Rest', plates: 'Plates', record: 'Record', finale: 'Finale' };

type Mark = 'ok' | 'slip';
type Side = 'L' | 'R' | 'both';
type State = 'build' | 'in' | 'burn' | 'record' | 'rest' | 'calm';
type Done = { ex: string; setNo: number; side: Side; reps: number; burn?: number; checks: Record<string, Mark>; rir?: number; record: boolean };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const STATE_WORD: Record<State, string> = { build: 'building', in: 'in range', burn: 'in the burn', record: 'new record', rest: 'rest', calm: '' };

function useEngine() {
  const [screen, setScreen] = useState<Screen>('before');
  const [exIdx, setExIdx] = useState(0);
  const ex = EXS[exIdx];
  const [setNo, setSetNo] = useState(1);
  const [side, setSide] = useState<Side>('both');
  const [taps, setTaps] = useState<number[]>([]);
  const [burn, setBurn] = useState<number | undefined>();
  const [done, setDone] = useState<Done[]>([]);
  const [checks, setChecks] = useState<Record<string, Mark>>({});
  const [rir, setRir] = useState<number | undefined>();
  const [restLeft, setRestLeft] = useState(REST);
  const [sheet, setSheet] = useState<null | 'session' | 'sets'>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; cls: string }[]>([]);
  const [legs, setLegs] = useState<number | undefined>();
  const [kit, setKit] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const reps = taps.length;

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (screen !== 'rest') return;
    setRestLeft(REST);
    const t = window.setInterval(() => setRestLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [screen]);

  const mine = done.filter((d) => d.ex === ex.id);
  const prevHere = [...mine].reverse().find((d) => d.side === side) ?? mine[mine.length - 1];
  const gaps = taps.slice(1).map((t, i) => (t - taps[i]) / 1000);
  const early = gaps.slice(0, 3);
  const late = gaps.slice(-2);
  const slowing = gaps.length >= 5 && late.reduce((a, b) => a + b, 0) / late.length > 1.3 * (early.reduce((a, b) => a + b, 0) / early.length);
  const record = reps > ex.best;
  const state: State = screen === 'rest' ? 'rest' : screen === 'record' ? 'record' : screen !== 'set' ? 'calm' : record ? 'record' : burn !== undefined ? 'burn' : reps >= ex.lo ? 'in' : 'build';
  const nudge = ex.isolation && prevHere?.rir !== undefined && prevHere.rir >= 2;
  const lightLegs = legs !== undefined && legs >= 4;
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
      setRipples((rs) => [...rs.slice(-5), { id: Date.now(), x, y, cls: 'burn' }]);
    }, HOLD_MS);
  };
  const tapUp = (e: PointerEvent<HTMLElement>) => {
    window.clearTimeout(holdTimer.current);
    if (held.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const n = reps + 1;
    const cls = n > ex.best ? 'record' : burn !== undefined ? 'burn' : n >= ex.lo ? 'in' : 'build';
    setTaps((ts) => [...ts, Date.now()]);
    navigator.vibrate?.(n === ex.best + 1 ? [40, 30, 40, 30, 80] : 12);
    setRipples((rs) => [...rs.slice(-5), { id: Date.now() + Math.random(), x: e.clientX - r.left, y: e.clientY - r.top, cls }]);
  };
  const tapCancel = () => window.clearTimeout(holdTimer.current);
  const undo = () => setTaps((ts) => ts.slice(0, -1));
  const finishSet = () => {
    setChecks({ ...(prevHere?.checks ?? {}) });
    setRir(prevHere?.rir);
    setScreen('check');
  };
  const saveCheck = () => {
    setDone([...done, { ex: ex.id, setNo, side, reps, burn, checks, rir, record }]);
    setScreen(record ? 'record' : 'rest');
  };
  const nextSet = () => {
    if (ex.perSide && side === (ex.lead ?? 'L')) setSide(side === 'L' ? 'R' : 'L');
    else {
      setSetNo((n) => Math.min(ex.sets, n + 1));
      if (ex.perSide) setSide(ex.lead ?? 'L');
    }
    setTaps([]);
    setBurn(undefined);
    setRipples([]);
    setScreen('set');
  };
  const pick = (i: number) => {
    setExIdx(i);
    const e = EXS[i];
    setSetNo(1);
    setSide(e.perSide ? e.lead ?? 'L' : 'both');
    setTaps([]);
    setBurn(undefined);
    setRipples([]);
    setScreen('guide');
  };
  const go = (s: Screen) => {
    if (s === 'set' || s === 'guide') {
      setTaps([]);
      setBurn(undefined);
      if (ex.perSide && side === 'both') setSide(ex.lead ?? 'L');
    }
    if (s === 'check' && reps === 0) setTaps(Array.from({ length: 11 }, (_, i) => Date.now() - (11 - i) * 3000));
    if (s === 'record' && !done.some((d) => d.record)) setDone([...done, { ex: ex.id, setNo, side, reps: ex.best + 1, burn: ex.best - 3, checks: { [ex.checks[0]]: 'ok', [ex.checks[1]]: 'ok' }, rir: 0, record: true }]);
    setSheet(null);
    setScreen(s);
  };
  const nextLabel = ex.perSide && side === (ex.lead ?? 'L') ? `Set ${setNo} · ${side === 'L' ? 'right' : 'left'} side` : `Set ${Math.min(ex.sets, setNo + 1)}${ex.perSide ? ` · ${ex.lead === 'R' ? 'right' : 'left'} first` : ''}`;

  return { screen, go, setScreen, ex, exIdx, pick, setNo, side, reps, taps, gaps, slowing, burn, record, state, done, mine, prevHere, checks, setChecks, rir, setRir, restLeft, setRestLeft, sheet, setSheet, ripples, setRipples, legs, setLegs, lightLegs, kit, setKit, notes, setNotes, nudge, elapsed, finishAt, tapDown, tapUp, tapCancel, undo, finishSet, saveCheck, nextSet, nextLabel };
}
type E = ReturnType<typeof useEngine>;

export function SessionProto() {
  const { params } = useRoute();
  const [look, setLook] = useState<Look>(((params.get('v') as Look) || 'glow') as Look);
  const e = useEngine();
  const fill = e.screen === 'set' ? Math.min(1, e.reps / e.ex.hi) : e.screen === 'rest' ? e.restLeft / REST : 0.25;
  return (
    <div className={`lc look-${look} st-${e.state}`} style={{ ['--fill' as string]: String(fill) }}>
      <Field look={look} />
      <div className="lc-dev" aria-label="Prototype controls">
        <div className="lc-dev-row">
          {LOOKS.map((l) => (
            <button key={l.id} type="button" className={look === l.id ? 'on' : ''} onClick={() => setLook(l.id)}>
              {l.name}
            </button>
          ))}
        </div>
        <div className="lc-dev-row">
          {SCREENS.map((s) => (
            <button key={s} type="button" className={e.screen === s ? 'on' : ''} onClick={() => e.go(s)}>
              {SCREEN_NAMES[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="lc-body">
        {e.screen === 'before' && <Before e={e} />}
        {e.screen === 'guide' && <Guide e={e} />}
        {e.screen === 'set' && <SetScreen e={e} />}
        {e.screen === 'check' && <Check e={e} />}
        {e.screen === 'rest' && <Rest e={e} />}
        {e.screen === 'plates' && <Plates e={e} />}
        {e.screen === 'record' && <Record e={e} />}
        {e.screen === 'finale' && <Finale />}
      </div>
      {e.sheet === 'session' && <SessionSheet e={e} />}
      {e.sheet === 'sets' && <SetsSheet e={e} />}
    </div>
  );
}

/** The living background. Glow: a soft field; aurora: drifting light; tide: colour rising with the reps. */
function Field({ look }: { look: Look }) {
  return (
    <div className="lc-field" aria-hidden="true">
      {look === 'aurora' && (
        <>
          <i className="blob b1" />
          <i className="blob b2" />
          <i className="blob b3" />
        </>
      )}
      {look === 'tide' && (
        <div className="tide">
          <i className="wave" />
        </div>
      )}
    </div>
  );
}

/* ---------- shared bits ---------- */

function Top({ e }: { e: E }) {
  return (
    <header className="lc-top">
      <button type="button" className="lc-icon" aria-label="Back" onClick={() => back('/train')}>
        <Icon name="down" size={22} stroke={1.8} />
      </button>
      <span className="lc-title">
        <span className="t13">Session C</span>
        <b className="num tn">{e.screen === 'rest' ? 'Resting' : `${Math.floor(e.elapsed)}:${String(Math.floor((e.elapsed % 1) * 60)).padStart(2, '0')}`}</b>
      </span>
      <span className="row" style={{ gap: 6 }}>
        <button type="button" className="lc-chipbtn" onClick={() => e.setSheet('sets')}>
          Sets
        </button>
        <button type="button" className="lc-chipbtn" onClick={() => e.setSheet('session')}>
          Session
        </button>
      </span>
    </header>
  );
}

function Strip({ e }: { e: E }) {
  return (
    <nav className="lc-strip" aria-label="Exercises">
      {PLAN.map((p, i) => {
        const exi = EXS.findIndex((x) => x.id === p.id);
        const cur = e.ex.id === p.id;
        return (
          <button key={p.id} type="button" className={`${cur ? 'cur' : ''}${i === 3 ? ' change' : ''}`} disabled={exi < 0} onClick={() => exi >= 0 && e.pick(exi)} aria-label={p.name}>
            {p.id}
          </button>
        );
      })}
    </nav>
  );
}

function SideBadge({ e }: { e: E }) {
  if (!e.ex.perSide || e.side === 'both') return null;
  const lead = e.side === e.ex.lead;
  return <span className={`lc-side${lead ? ' lead' : ''}`}>{e.side === 'L' ? 'LEFT' : 'RIGHT'}{lead ? ' FIRST' : ''}</span>;
}

function TempoBeat({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="lc-tempo" aria-label="Tempo on: lower for 3 seconds, lift for 1">
      <span className="lc-tempo-track">
        <i />
      </span>
      <span className="t14">
        <b>Tempo</b> · lower 3 s · lift 1 s
      </span>
    </div>
  );
}

function Ripples({ e }: { e: E }) {
  return (
    <>
      {e.ripples.map((r) => (
        <i key={r.id} className={`lc-ripple ${r.cls}`} style={{ left: r.x, top: r.y }} onAnimationEnd={() => e.setRipples((rs) => rs.filter((x) => x.id !== r.id))} />
      ))}
    </>
  );
}

function Primary({ children, onClick, disabled, tone }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: string }) {
  return (
    <button type="button" className={`lc-primary${tone ? ` ${tone}` : ''}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function Dust({ n }: { n: number }) {
  return (
    <div className="lc-dust" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 0.45}s`, animationDuration: `${3 + (i % 4)}s` }} />
      ))}
    </div>
  );
}

/* ---------- before the session ---------- */

function Before({ e }: { e: E }) {
  const KIT = ['Chair and mat in place', 'Collars on both handles', 'Headphones in', 'Phone above 30%'];
  const legsToday = PLAN.filter((p) => p.legs).length;
  return (
    <section className="lc-scroll">
      <header className="lc-top">
        <button type="button" className="lc-icon" aria-label="Back" onClick={() => back('/train')}>
          <Icon name="down" size={22} stroke={1.8} />
        </button>
      </header>
      <div className="lc-kicker">Thursday evening</div>
      <h1 className="lc-h1">Session C</h1>
      <p className="lc-sub">
        Usually <b>92 min</b> · finish about <b>{clock(Date.now() + 92 * 60000)}</b> · one plate change
      </p>

      <div className="lc-card">
        <div className="lc-card-h">Legs, before {legsToday} leg exercises</div>
        <div className="lc-scale" role="radiogroup" aria-label="Leg soreness, 1 to 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={e.legs === n} className={e.legs === n ? 'on' : ''} onClick={() => e.setLegs(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="lc-small">{e.legs === undefined ? '1 fresh · 5 very sore' : e.lightLegs ? 'Sore: leg work drops to 1 set each tonight. Never skipped, just the minimum.' : 'Full leg work tonight.'}</div>
      </div>

      <div className="lc-card">
        <div className="lc-card-h">Kit check</div>
        {KIT.map((k) => {
          const on = e.kit.includes(k);
          return (
            <button key={k} type="button" className={`lc-tick${on ? ' on' : ''}`} aria-pressed={on} onClick={() => e.setKit(on ? e.kit.filter((x) => x !== k) : [...e.kit, k])}>
              <span className="box" aria-hidden="true">{on ? '✓' : ''}</span>
              {k}
            </button>
          );
        })}
      </div>

      <div className="lc-card">
        <div className="lc-card-h">Warm-up · 6 min</div>
        <div className="lc-small">Your 500-step walk, arm circles, 10 squats to the bed, 10 glute bridges, then one light set of RDLs at about half the weight. The light set is logged as a warm-up and never counts.</div>
      </div>

      <div className="lc-card">
        <div className="lc-card-h">Tonight, in load blocks</div>
        {PLAN.map((p, i) => (
          <div key={p.id}>
            {i === 3 && <div className="lc-plates-line">Plates change · 10 → 5 kg</div>}
            <div className="lc-row">
              <span className="num tn q">{p.id}</span>
              <span className="grow">
                {p.name}
                {e.lightLegs && p.legs && <span className="lc-tag burn">1 set</span>}
              </span>
              <span className="q">{p.kg ? `${p.kg} kg` : 'body'}</span>
            </div>
          </div>
        ))}
      </div>
      <Primary onClick={() => e.go('guide')}>Start warm-up</Primary>
    </section>
  );
}

/* ---------- the guide before an exercise's first set ---------- */

function Guide({ e }: { e: E }) {
  const g = e.ex.guide;
  const [editing, setEditing] = useState(false);
  return (
    <section className="lc-scroll">
      <Top e={e} />
      <Strip e={e} />
      <div className="lc-kicker">Before the first set</div>
      <h1 className="lc-h1">{e.ex.name}</h1>
      <div className="lc-meta">
        <span className="lc-pill">
          {e.ex.sets} × {e.ex.lo}–{e.ex.hi}
        </span>
        {e.ex.kg !== null && <span className="lc-pill">{e.ex.kg} kg</span>}
        <SideBadge e={e} />
        {e.ex.tempo && <span className="lc-pill tempo">Tempo on</span>}
      </div>
      {e.ex.perSide && e.ex.leadWhy && <p className="lc-small">Left first: {e.ex.leadWhy}.</p>}
      <div className="lc-guide">
        <div>
          <b>Set up</b>
          {g.setup}
        </div>
        <div>
          <b>Move</b>
          {g.move}
        </div>
        <div>
          <b>Feel</b>
          {g.feel}
        </div>
        <div className="stop">
          <b>Stop</b>
          {g.stop}
        </div>
      </div>
      <div className="lc-card">
        <div className="lc-card-h">Your setup · since 14 Oct</div>
        {editing ? <textarea className="lc-note" defaultValue={e.ex.setup} onBlur={() => setEditing(false)} autoFocus /> : <div className="lc-small">{e.ex.setup}</div>}
        <button type="button" className="lc-link" onClick={() => setEditing(!editing)}>
          {editing ? 'Done' : 'Change my setup'}
        </button>
      </div>
      <div className="lc-card">
        <div className="lc-card-h">You'll check after each set</div>
        <div className="lc-small">{e.ex.checks.join(' · ')}</div>
      </div>
      <Primary onClick={() => e.go('set')}>Start set 1</Primary>
    </section>
  );
}

/* ---------- the set ---------- */

function SetScreen({ e }: { e: E }) {
  return (
    <section className="lc-screen">
      <Top e={e} />
      <Strip e={e} />
      <div className="lc-ex">
        <h1 className="lc-name">{e.ex.name}</h1>
        <div className="lc-meta">
          <span className="lc-pill">
            Set {e.setNo} of {e.ex.sets}
          </span>
          {e.ex.kg !== null && <span className="lc-pill">{e.ex.kg} kg</span>}
          <SideBadge e={e} />
        </div>
        {e.nudge && <div className="lc-nudge">Last set ended with {e.prevHere?.rir}+ left. Go through the burn this time.</div>}
      </div>
      <div className="lc-tap" onPointerDown={e.tapDown} onPointerUp={e.tapUp} onPointerLeave={e.tapCancel} role="button" aria-label={`Count a rep. ${e.reps} so far. Hold to mark the burn.`}>
        {e.ex.perSide && e.side !== 'both' && (
          <span className="lc-bigside" aria-hidden="true">
            {e.side}
          </span>
        )}
        <Ripples e={e} />
        <div className={`lc-count num tn ${e.state}`}>{e.reps}</div>
        <div className="lc-word">{e.state === 'record' ? `new record · best was ${e.ex.best}` : STATE_WORD[e.state]}</div>
        <div className="lc-aim">
          aim{' '}
          <b>
            {e.ex.lo}–{e.ex.hi}
          </b>{' '}
          · best <b>{e.ex.best}</b>
        </div>
        <TempoBeat on={e.ex.tempo} />
        <div className="lc-hint">
          {e.burn === undefined ? 'Tap anywhere for each rep · hold when the burn starts' : `Burn from rep ${e.burn} · ${Math.max(0, e.reps - e.burn)} past it`}
          {e.slowing && <span className="lc-slow"> · reps slowing</span>}
        </div>
      </div>
      <div className="lc-actions">
        <button type="button" className="lc-ghost" disabled={e.reps === 0} onClick={e.undo}>
          −1
        </button>
        <Primary disabled={e.reps === 0} onClick={e.finishSet}>
          Set done · {e.reps}
        </Primary>
      </div>
    </section>
  );
}

/* ---------- the check after a set ---------- */

function Check({ e }: { e: E }) {
  const prev = e.prevHere;
  return (
    <section className="lc-screen">
      <Top e={e} />
      <h2 className="lc-name" style={{ marginTop: 10 }}>
        {e.reps} reps{e.ex.kg !== null ? ` at ${e.ex.kg} kg` : ''}
        {e.ex.perSide && e.side !== 'both' ? ` · ${e.side === 'L' ? 'left' : 'right'}` : ''}
      </h2>
      <p className="lc-small">{prev ? 'Last set’s answers are filled in. Change only what was different.' : 'Tap once if it went well, twice if it slipped.'}</p>
      <div className="lc-checks">
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
            <button key={text} type="button" className={`lc-check${m ? ` ${m}` : ''}`} aria-label={`${text}: ${m === 'ok' ? 'went well' : m === 'slip' ? 'slipped' : 'not marked'}`} onClick={() => e.setChecks(next)}>
              <span className="box" aria-hidden="true">{m === 'ok' ? '✓' : m === 'slip' ? '✕' : ''}</span>
              <span className="grow">{text}</span>
              {m && <span className="state">{m === 'ok' ? 'went well' : 'slipped'}</span>}
            </button>
          );
        })}
      </div>
      <div className="lc-rir">
        <span>Left in the tank</span>
        <div className="row" style={{ gap: 8 }}>
          {[0, 1, 2, 3].map((n) => (
            <button key={n} type="button" className={`lc-rir-chip r${n}${e.rir === n ? ' on' : ''}`} aria-pressed={e.rir === n} onClick={() => e.setRir(n)}>
              {n === 3 ? '3+' : n}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <Primary onClick={e.saveCheck}>{prev && JSON.stringify(e.checks) === JSON.stringify(prev.checks) && e.rir === prev.rir ? 'Same as last set' : 'Save set'}</Primary>
      </div>
    </section>
  );
}

/* ---------- rest ---------- */

function Rest({ e }: { e: E }) {
  const d = e.done[e.done.length - 1];
  const [noting, setNoting] = useState(false);
  const ok = d ? Object.values(d.checks).filter((m) => m === 'ok').length : 0;
  const slip = d ? Object.values(d.checks).filter((m) => m === 'slip').length : 0;
  return (
    <section className="lc-screen">
      <Top e={e} />
      <div className="lc-rest-time num tn">{mmss(e.restLeft)}</div>
      <div className="lc-word">{e.restLeft === 0 ? 'rest is over' : 'rest'}</div>
      {d && (
        <div className="lc-justnow">
          Just now <b className={`num tn${d.record ? ' goldtxt' : ''}`}>{d.reps}</b>
          {d.record && <span className="lc-tag gold">record</span>}
          {d.burn !== undefined && <span className="lc-tag burn">burn from {d.burn}</span>}
          {ok > 0 && <span className="lc-tag ok">{ok} went well</span>}
          {slip > 0 && <span className="lc-tag slip">{slip} slipped</span>}
        </div>
      )}
      <div className="lc-card">
        <div className="lc-card-h">Next</div>
        <div className="lc-next-row">
          <span className="lc-next-title">{e.nextLabel}</span>
          {e.ex.kg !== null && <span className="num tn lc-next-kg">{e.ex.kg} kg</span>}
        </div>
        <div className="lc-small">
          {e.ex.short} · aim {e.ex.lo}–{e.ex.hi}
        </div>
        <div className="lc-cue">{e.ex.cue}</div>
      </div>
      <div className="lc-adapt">Rest is 1:30 here: your reps dropped from 18 to 15 across sets last time.</div>
      {noting ? (
        <textarea className="lc-note" placeholder={`A note on ${e.ex.short.toLowerCase()} for next time and the coach…`} defaultValue={e.notes[e.ex.id]} onBlur={(x) => (e.setNotes({ ...e.notes, [e.ex.id]: x.target.value }), setNoting(false))} autoFocus />
      ) : (
        <button type="button" className="lc-link" onClick={() => setNoting(true)}>
          {e.notes[e.ex.id] ? `Note: ${e.notes[e.ex.id]}` : '+ Note on this exercise'}
        </button>
      )}
      <div className="lc-actions" style={{ marginTop: 'auto' }}>
        <button type="button" className="lc-ghost" onClick={() => e.setRestLeft((s) => s + 30)}>
          +30 s
        </button>
        <Primary tone="rest" onClick={e.nextSet}>
          Ready
        </Primary>
      </div>
    </section>
  );
}

/* ---------- the plate change, with the collar check ---------- */

function Plates({ e }: { e: E }) {
  const [collars, setCollars] = useState(false);
  return (
    <section className="lc-screen">
      <Top e={e} />
      <div className="lc-kicker" style={{ marginTop: 24 }}>
        Block 2 of 2
      </div>
      <h1 className="lc-h1">Plates change</h1>
      <div className="lc-plates">
        <span className="num tn">10 kg</span>
        <span className="arrow" aria-hidden="true">
          →
        </span>
        <span className="num tn">5 kg</span>
      </div>
      <p className="lc-small">For lean-away laterals, skull crushers and floor flies. Calf raises go back to 10 kg after, the one other change tonight.</p>
      <button type="button" className={`lc-collar${collars ? ' on' : ''}`} aria-pressed={collars} onClick={() => setCollars(!collars)}>
        <span className="box" aria-hidden="true">{collars ? '✓' : ''}</span>
        <span className="grow">
          <b>Collars tight on both handles</b>
          <span className="lc-small">Skull crushers and flies go over your face.</span>
        </span>
      </button>
      <div style={{ marginTop: 'auto' }}>
        <Primary disabled={!collars} onClick={() => e.pick(1)}>
          {collars ? 'On to lean-away laterals' : 'Check the collars first'}
        </Primary>
      </div>
    </section>
  );
}

/* ---------- the record moment ---------- */

function Record({ e }: { e: E }) {
  const d = [...e.done].reverse().find((x) => x.record);
  return (
    <section className="lc-screen lc-record">
      <Dust n={18} />
      <div className="lc-record-in">
        <div className="lc-kicker gold">New record</div>
        <div className="lc-bloom num tn">{d?.reps ?? e.ex.best + 1}</div>
        <div className="lc-bloom-sub">
          {e.ex.name} · {e.ex.kg} kg
        </div>
        <div className="lc-small" style={{ textAlign: 'center' }}>
          Your best was {e.ex.best}, on {e.ex.bestOn}.<br />
          Set to <b>{SONG}</b>.
        </div>
      </div>
      <Primary tone="gold" onClick={() => e.setScreen('rest')}>
        Keep going
      </Primary>
    </section>
  );
}

/* ---------- the finale: joint checks first, the recap as rings, the best moment last ---------- */

function Arc({ r, frac, cls, w }: { r: number; frac: number; cls: string; w: number }) {
  const C = 2 * Math.PI * r;
  return (
    <>
      <circle cx="150" cy="150" r={r} className="ring-track" strokeWidth={w} />
      <circle cx="150" cy="150" r={r} className={`ring-fill ${cls}`} strokeWidth={w} strokeDasharray={C} style={{ ['--c' as string]: String(C), ['--off' as string]: String(C * (1 - frac)) }} transform="rotate(-90 150 150)" />
    </>
  );
}

function Finale() {
  const [step, setStep] = useState(0);
  const [flags, setFlags] = useState<string[]>([]);
  const FLAGS = ['Knee', 'Lower back', 'Wrist', 'Shoulder', 'Eyes'];
  return (
    <section className="lc-screen">
      <div className="lc-steps" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((i) => (
          <i key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      {step === 0 && (
        <>
          <h1 className="lc-h1" style={{ marginTop: 18 }}>
            Anything to flag?
          </h1>
          <p className="lc-small">Joint checks first, so nothing gets lost in the celebration.</p>
          <div className="lc-flags">
            {FLAGS.map((f) => {
              const on = flags.includes(f);
              return (
                <button key={f} type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={() => setFlags(on ? flags.filter((x) => x !== f) : [...flags, f])}>
                  {f}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 'auto' }}>
            <Primary onClick={() => setStep(1)}>{flags.length ? `Flag ${flags.join(', ').toLowerCase()}` : 'Nothing to flag'}</Primary>
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <div className="lc-kicker" style={{ marginTop: 18 }}>
            Session C · 88 min
          </div>
          <div className="lc-recap-rings">
            <svg viewBox="0 0 300 300" width="280" height="280" aria-hidden="true">
              <Arc r={132} frac={1} cls="session" w={12} />
              <Arc r={108} frac={0.92} cls="sets" w={12} />
              <Arc r={84} frac={0.78} cls="checks" w={12} />
            </svg>
            <div className="lc-recap-in">
              <b className="num tn">26</b>
              <span className="lc-small">sets</span>
            </div>
          </div>
          <div className="lc-legend">
            <span className="s">8 of 8 exercises</span>
            <span className="t">24 of 26 sets in range</span>
            <span className="c">78% of form checks went well</span>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <Primary onClick={() => setStep(2)}>And the best part</Primary>
          </div>
        </>
      )}
      {step === 2 && (
        <div className="lc-record" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Dust n={14} />
          <div className="lc-record-in">
            <div className="lc-kicker gold">Tonight's best</div>
            <div className="lc-bloom num tn" style={{ fontSize: 120 }}>
              19
            </div>
            <div className="lc-bloom-sub">Romanian deadlift · 10 kg</div>
            <div className="lc-small" style={{ textAlign: 'center' }}>
              A record by one rep, set to <b>{SONG}</b>.<br />
              Also new: your first left-side lean-away past 16.
            </div>
          </div>
          <Primary tone="gold" onClick={() => back('/train')}>
            Done
          </Primary>
        </div>
      )}
    </section>
  );
}

/* ---------- quick looks ---------- */

function SessionSheet({ e }: { e: E }) {
  return (
    <div className="lc-sheet" role="dialog" aria-label="The session at a glance" onClick={() => e.setSheet(null)}>
      <div className="lc-sheet-in" onClick={(x) => x.stopPropagation()}>
        <div className="row base">
          <h2 className="lc-name" style={{ fontSize: 26 }}>
            Session C
          </h2>
          <span className="lc-small">usually 92 min · finish {clock(e.finishAt)}</span>
        </div>
        {PLAN.map((p, i) => (
          <div key={p.id}>
            {i === 3 && <div className="lc-plates-line">Plates change · 10 → 5 kg</div>}
            <div className={`lc-row${e.ex.id === p.id ? ' cur' : ''}`}>
              <span className="num tn q">{p.id}</span>
              <span className="grow">{p.name}</span>
              <span className="q">{p.kg ? `${p.kg} kg` : 'body'}</span>
            </div>
          </div>
        ))}
        <Primary onClick={() => e.setSheet(null)}>Back</Primary>
      </div>
    </div>
  );
}

function SetsSheet({ e }: { e: E }) {
  const ex = e.ex;
  const sides: Side[] = ex.perSide ? (ex.lead === 'R' ? ['R', 'L'] : ['L', 'R']) : ['both'];
  return (
    <div className="lc-sheet" role="dialog" aria-label={`${ex.name}: sets`} onClick={() => e.setSheet(null)}>
      <div className="lc-sheet-in" onClick={(x) => x.stopPropagation()}>
        <div className="row base">
          <h2 className="lc-name" style={{ fontSize: 24 }}>
            {ex.name}
          </h2>
          <span className="lc-small">
            {ex.kg !== null ? `${ex.kg} kg` : 'body'} · best {ex.best}
          </span>
        </div>
        <div className="lc-sets-head">
          <span>Set</span>
          <span>Tonight</span>
          <span>Last time</span>
        </div>
        {Array.from({ length: ex.sets }, (_, i) => i + 1).flatMap((n) =>
          sides.map((s) => {
            const d = e.mine.find((x) => x.setNo === n && x.side === s);
            const now = e.screen === 'set' && n === e.setNo && s === e.side;
            const slip = d && Object.values(d.checks).some((m) => m === 'slip');
            return (
              <div key={`${n}${s}`} className={`lc-sets-row${now ? ' now' : ''}`}>
                <span>
                  {n}
                  {s !== 'both' ? ` ${s}` : ''}
                </span>
                <span className="num tn">
                  {d ? (
                    <>
                      <span className={d.record ? 'goldtxt' : ''}>{d.reps}</span>
                      {d.record && <span className="lc-tag gold">record</span>}
                      {d.burn !== undefined && <span className="lc-tag burn">burn</span>}
                      {slip && <span className="lc-tag slip">slipped</span>}
                    </>
                  ) : now ? (
                    <span>{e.reps || 'now'}</span>
                  ) : (
                    '—'
                  )}
                </span>
                <span className="num tn q">{ex.last[n - 1]}</span>
              </div>
            );
          }),
        )}
        {e.notes[ex.id] && <div className="lc-small">Your note: {e.notes[ex.id]}</div>}
        <Primary onClick={() => e.setSheet(null)}>Back</Primary>
      </div>
    </div>
  );
}
