import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { creatureById } from '../../domain/creatureRoster';
import { CreatureFigure } from '../../ui/creatures/Figure';
import { Aurora } from '../../ui/live/Aurora';
import { regionTint } from '../../ui/live/regionTint';
import { TrailDrawing } from '../../walk/ui/TrailDrawing';
import { WalkVista } from '../../walk/WalkVista';
import '../../styles/you-proto.css';

/** Design prototype (made-up sample numbers; nothing is read or saved): the You tab and everything it opens. */

const v = (o: Record<string, string | number>) => o as CSSProperties;

/** One colour per measure: bright jewel tones that sit together on the dusk. Gold stays for what was earned. */
const HUE = { steps: '#5fe3b4', food: '#ff9a6b', sleep: '#79b4ff', train: '#b896ff', walk: '#4fd8e6', shape: '#f598d6', ready: '#c5e86c', joints: '#ff9fa8', drinks: '#d98bff', meds: '#6fd0c8', own: '#a9b8ff', gold: '#f2c46d' };
const LAND = [
  { name: 'The plains', km: 60 },
  { name: 'Bandit Country', km: 300 },
  { name: 'The Deccan', km: 1300 },
  { name: 'The coast', km: 2500 },
];

/** Adds `in` the first time it scrolls into view, which starts its animation; the layout never moves. */
function Play({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`${className} y-play${on ? ' in' : ''}`} style={style}>{children}</div>;
}

function Count({ to, ms = 1100, fmt = String }: { to: number; ms?: number; fmt?: (n: number) => string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let done = 0;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        setN(Math.round(to * (1 - (1 - k) ** 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      done = window.setTimeout(() => setN(to), ms + 200);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(done); };
  }, [to, ms]);
  return <span ref={ref} className="tn">{fmt(n)}</span>;
}

function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b, c, e] = [pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)]];
    d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  return d;
}

/** Runs with memory (each value leans on the last), as real days do. */
function series(a: number, b: number, n: number, seed: number, wob = 6) {
  let s = a;
  let x = seed * 9301 + 49297;
  return Array.from({ length: n }, (_, i) => {
    x = (x * 9301 + 49297) % 233280;
    s = s * 0.68 + (a + ((b - a) * i) / (n - 1)) * 0.32 + (x / 233280 - 0.5) * 2 * wob;
    return s;
  });
}

let gid = 0;
function Line({ vals, c, c2, h = 90, area = true, width = 2.6, last = true }: { vals: number[]; c: string; c2?: string; h?: number; area?: boolean; width?: number; last?: boolean }) {
  const id = useRef(`yg${gid++}`).current;
  const w = 320;
  const lo = Math.min(...vals) - 2;
  const hi = Math.max(...vals) + 2;
  const pts = vals.map((t, i) => [(i * (w - 8)) / (vals.length - 1) + 2, h - 6 - ((t - lo) / (hi - lo)) * (h - 14)] as [number, number]);
  const d = smooth(pts);
  const end = pts[pts.length - 1];
  return (
    <svg className="y-line" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" style={{ height: h }}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor={c} /><stop offset="1" stopColor={c2 ?? c} /></linearGradient>
        <linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={c2 ?? c} stopOpacity=".5" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient>
      </defs>
      {area && <path className="y-fill" d={`${d} L${end[0]} ${h} L2 ${h} Z`} fill={`url(#${id}f)`} />}
      <path className="y-draw" pathLength={1} d={d} fill="none" stroke={`url(#${id}s)`} strokeWidth={width} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {last && <circle className="y-dot" cx={end[0]} cy={end[1]} r="4.5" fill={c2 ?? c} />}
    </svg>
  );
}

function Clock({ size = 96 }: { size?: number }) {
  const [phase, setPhase] = useState(false);
  const f = 40 / 247;
  const R = 86;
  const a = f * 2 * Math.PI - Math.PI / 2;
  return (
    <button type="button" className="y-clock" onClick={() => setPhase(!phase)} aria-expanded={phase}>
      <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
        <defs><linearGradient id="yclk" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#ff7db8" /><stop offset="1" stopColor="#ffb36b" /></linearGradient></defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#ede6da" strokeOpacity=".16" strokeWidth="10" />
        <path className="y-draw2" pathLength={1} d={`M100 ${100 - R} A${R} ${R} 0 0 1 ${100 + R * Math.cos(a)} ${100 + R * Math.sin(a)}`} fill="none" stroke="url(#yclk)" strokeWidth="10" strokeLinecap="round" />
        <g className="y-hand" style={v({ '--a': `${f * 360}deg` })}><line x1="100" y1="100" x2="100" y2="38" stroke="#ede6da" strokeWidth="4.5" strokeLinecap="round" /></g>
        <circle cx="100" cy="100" r="6.5" fill="#ede6da" />
      </svg>
      <span className="y-col">
        <span className="y-big">3:53 am</span>
        <span className="y-q">{phase ? 'Phase: building. Before dawn, the work nobody sees. The challenge moved to Earned.' : 'The whole journey as one day. Still dark, and you’re already up.'}</span>
      </span>
    </button>
  );
}

const TRENDS = [
  { n: 'Steps', c: HUE.steps, a: 60, b: 82, w: 'Improving', s: '8,900 a day, was 7,400' },
  { n: 'Protein', c: HUE.food, a: 50, b: 76, w: 'Improving', s: '112 g a day, was 84' },
  { n: 'Sleep', c: HUE.sleep, a: 66, b: 63, w: 'Steady', s: '7 h 04 a night, was 7 h 10' },
  { n: 'Training', c: HUE.train, a: 55, b: 84, w: 'Building', s: '4 sessions this week, was 2' },
];

function Doors({ open }: { open: (s: Screen) => void }) {
  const d: [string, string, string, Screen][] = [
    ['Reports', 'Week 6 is ready', '#ff9a6b', 'reports'],
    ['Earned', 'The peacock grew', HUE.gold, 'earned'],
    ['Body', 'Check-in in 6 days', HUE.shape, 'tracks'],
    ['Tracks', 'Steps up 900', HUE.steps, 'tracks'],
    ['Diary', 'Yesterday not closed', HUE.sleep, 'you'],
    ['Insights', '1 new finding', HUE.train, 'you'],
  ];
  return (
    <Play className="y-doors">
      {d.map(([t, s, c, to], i) => (
        <button key={t} type="button" onClick={() => open(to)} style={v({ '--c': c, '--i': i })}><b>{t}</b><span>{s}</span></button>
      ))}
    </Play>
  );
}

type Mood = 'tired' | 'off' | 'bored';
function HowsToday() {
  const [m, setM] = useState<Mood | undefined>();
  const word: [Mood, string][] = [['tired', 'Tired'], ['off', 'Off plan'], ['bored', 'Bored']];
  return (
    <section className="y-sec">
      <h2>How’s today?</h2>
      <div className="y-seg">{word.map(([k, t]) => <button key={k} type="button" aria-pressed={m === k} onClick={() => setM(m === k ? undefined : k)}>{t}</button>)}</div>
      {m === 'tired' && <div className="y-card y-rise"><b>Nothing is owed today</b><span className="y-q">Your protein is ahead this week, and the road waits.</span><i className="y-grem">“Today’s target is being a person. You are on track.”</i></div>}
      {m === 'off' && <div className="y-card y-rise"><b>You’ve come back 5 times</b><span className="y-q">Longest gap 9 days. Back to your usual in 3 days, on average.</span><i className="y-grem">“You came back. I had the paperwork ready to be smug, and now I have to shred it.”</i></div>}
      {m === 'bored' && <div className="y-card y-rise"><b>Did you know</b><span className="y-q">You’ve walked further than the Dandi march, in 40 days. It took them 24.</span><i className="y-grem">“You opened this to avoid something. Here is a fact about lateral raises.”</i></div>}
    </section>
  );
}

function Lift() {
  const peacock = creatureById('peacock');
  const [i, setI] = useState(0);
  const cards = [
    <><b>A month ago today</b><span className="y-q">Your first 10,000-step office day, and two records.</span></>,
    <><b>Better than 5 of your 6 weeks</b><span className="y-meter"><i style={v({ '--w': '83%', '--c': HUE.steps })} /></span></>,
    <div className="y-row">{peacock && <span className="y-cr"><CreatureFigure c={peacock} stage={3} width={74} burst={false} draw={false} /></span>}<span className="y-q">The peacock came by 3 mornings this week. It wants nothing from you.</span></div>,
    <><b>Your best, from the record book</b><span className="y-q"><b style={{ color: HUE.gold }}>16,204</b> steps, on a Thursday.</span></>,
  ];
  return (
    <section className="y-sec">
      <h2>Today’s lift</h2>
      <div className="y-card y-rise y-tint" style={v({ '--c': HUE.shape })} key={i}>{cards[i]}</div>
      <button type="button" className="y-devlink" onClick={() => setI((i + 1) % cards.length)}>Sample: see the next day’s lift</button>
    </section>
  );
}

function YouPage({ open }: { open: (s: Screen) => void }) {
  const m = series(58, 71, 28, 3, 1.2);
  m[m.length - 1] = 71;
  return (
    <div className="y-stack">
      <header className="y-top"><div><h1>You</h1><span className="y-q">Day 40 of 247 · the Box-to-Box</span></div><span className="y-more" aria-label="Settings"><i /><i /><i /></span></header>
      <button type="button" className="y-poster" onClick={() => open('film')}>
        <span className="y-poster-glow" />
        <span className="y-q">October is finished</span>
        <span className="y-poster-t">Your October film</span>
        <span className="y-poster-row"><span>193 km · 22 sessions · 11 records</span><u>Play</u></span>
      </button>
      <Clock />
      <Play className="y-mom">
        <div className="y-mom-h">
          <span className="y-mom-n"><Count to={71} /></span>
          <span className="y-col"><b>Momentum, up 6 in four weeks</b><span className="y-q">From food, steps, sleep and training. Never from your weight.</span></span>
        </div>
        <Line vals={m} c="#ff7db8" c2="#ffb36b" h={84} />
        <div className="y-trs">
          {TRENDS.map((t, i) => (
            <div key={t.n} className="y-tr" style={v({ '--c': t.c, '--i': i })}>
              <b>{t.n}</b>
              <Line vals={series(t.a, t.b, 16, i + 2, 4)} c={t.c} h={26} area={false} width={2.2} />
              <em>{t.w}</em>
              <small>{t.s}</small>
            </div>
          ))}
        </div>
      </Play>
      <div className="y-due">
        <button type="button" onClick={() => open('reports')}><span>Week 6's story is ready</span><u>Open</u></button>
        <button type="button"><span>Backup safe up to 26 Oct · 10 days not saved</span><u>Save</u></button>
      </div>
      <Play className="y-card y-find"><b>One finding today</b><span>You sleep 34 minutes longer after a day over 10,000 steps.</span><u>Why did this change?</u></Play>
      <section className="y-sec">
        <h2>Trophy case</h2>
        <Play className="y-trophy">
          {[['16,204', 'Most steps in a day'], ['Oct', 'Best month so far'], ['6', 'Perfect days so far']].map(([a, b], i) => <div key={b} style={v({ '--i': i })}><b>{a}</b><span>{b}</span></div>)}
        </Play>
      </section>
      <Doors open={open} />
      <div className="y-card y-tint" style={v({ '--c': HUE.sleep })}><b>Did you know</b><span className="y-q">Your Thursday song has played through 11 hours of sets.</span></div>
      <section className="y-sec">
        <h2>Your three questions</h2>
        <div className="y-rows y-tint" style={v({ '--c': HUE.train })}><div><span>Protein on office days</span><b>104 g</b></div><div><span>Best week for steps</span><b>Week 4</b></div><div><span>Sessions after 11 pm</span><b>3</b></div></div>
      </section>
      <div className="y-card y-tint" style={v({ '--c': HUE.walk })}><b>What would it take</b><span className="y-q">Gwalior by 20 Nov: 9,800 steps a day.</span></div>
      <button type="button" className="y-surprise">Surprise me</button>
      <Lift />
      <HowsToday />
      <div className="y-goto">Go to a page, month or setting</div>
    </div>
  );
}

const FILM: { bg: string; el: ReactNode }[] = [
  { bg: 'linear-gradient(160deg,#0f6b58,#123a63 62%,#3b1f6e)', el: <><div className="y-f-ey">October</div><div className="y-f-big" style={{ fontSize: 46, color: '#ffc0dc' }}>scored by your top song</div><div className="y-f-s">Played 31 times during sessions.</div></> },
  { bg: 'linear-gradient(170deg,#0f7a6c,#134e4a 55%,#0b2b3f)', el: <><div className="y-f-trail"><TrailDrawing fromKm={0} toKm={193} label="October on the road" /></div><div className="y-f-s">From Delhi towards Agra: the month on the road.</div></> },
  { bg: 'linear-gradient(150deg,#18a07c,#0f5f6b 60%,#123066)', el: <><div className="y-f-big" style={{ color: '#ffe27a' }}><Count to={193} /></div><div className="y-f-s">kilometres walked.</div></> },
  { bg: 'linear-gradient(155deg,#6b43e0,#3a1f8f 58%,#1e1658)', el: <><div className="y-f-big" style={{ color: '#7ff0d0' }}><Count to={22} /></div><div className="y-f-s">sessions finished.</div></> },
  { bg: 'linear-gradient(150deg,#c48a1d,#7a4b16 58%,#3a1f24)', el: <><div className="y-f-big" style={{ color: '#ffe27a' }}><Count to={11} /></div><div className="y-f-s">records set.</div></> },
  { bg: 'linear-gradient(155deg,#f06a3c,#a12f5a 60%,#47205e)', el: <><div className="y-f-big" style={{ color: '#fff0a6' }}><Count to={16204} fmt={(n) => n.toLocaleString('en-IN')} /></div><div className="y-f-s">steps on your best day.</div></> },
  { bg: 'linear-gradient(150deg,#d9408f,#6d2aa8 60%,#231a66)', el: <><div className="y-f-big" style={{ fontSize: 60, color: '#8ff0ff' }}><Count to={12480} fmt={(n) => n.toLocaleString('en-IN')} /> kg</div><div className="y-f-s">moved in your strongest week, from 12 October.</div></> },
  { bg: 'linear-gradient(150deg,#b9851f,#8a3f22 60%,#3d1b3a)', el: <><div className="y-f-big" style={{ color: '#ffd77a' }}>+40%</div><div className="y-f-s">Calf raise, 5 to 7 kg. The record you didn’t see coming.</div></> },
  { bg: 'linear-gradient(165deg,#0b1036,#141046 60%,#22124f)', el: <><FilmMet /><div className="y-f-s">Two met this month.</div></> },
  { bg: 'linear-gradient(170deg,#141a4a,#1f1456 60%,#4a1c58)', el: <><svg className="y-f-stars" viewBox="0 0 240 150" aria-hidden="true"><polyline className="y-draw" pathLength={1} points="20,110 62,62 110,88 150,36 196,64 222,24" fill="none" stroke="#f2c46d" strokeOpacity=".6" strokeWidth="1.6" />{[[20, 110], [62, 62], [110, 88], [150, 36], [196, 64], [222, 24]].map(([x, y], i) => <circle key={i} className="y-star" style={v({ '--i': i })} cx={x} cy={y} r="4.5" fill="#f2c46d" />)}</svg><div className="y-f-s">6 perfect days, joined into this month’s stars.</div></> },
  { bg: 'linear-gradient(180deg,#0b0d1e,#1a1040)', el: <div className="y-roll"><div className="y-rin">{[['Starring', 'You'], ['Supporting cast', 'Dal, eggs, paneer'], ['Filmed on location', 'Delhi and the road south'], ['Stunts', 'Lateral raise'], ['Original score', 'Your top song'], ['Guest stars', 'The peacock, the nilgai'], ['Gremlin', 'as itself'], ['No dumbbells were harmed.', 'They have asked me to say otherwise.']].map(([a, b]) => <p key={a}><span>{a}</span>{b}</p>)}</div></div> },
  { bg: 'linear-gradient(165deg,#3a1f6e,#141a4a 70%)', el: <><div className="y-f-ey">The assessment</div><Grades /><div className="y-f-s">Read the full report ›</div></> },
];

function FilmMet() {
  const a = creatureById('peacock');
  const b = creatureById('nilgai');
  return <div className="y-f-art">{[a, b].map((c, i) => c && <div key={c.id} className="y-f-cr" style={v({ '--k': c.main })}><CreatureFigure c={c} stage={i ? 1 : 3} width={140} burst={false} /><b>{c.short}</b></div>)}</div>;
}

function Grades() {
  const g: [string, string, string, string][] = [['Steps', 'Strong', HUE.steps, 'Up 900, on the evening loop'], ['Training', 'Strong', HUE.steps, '22 sessions, 11 records'], ['Food', 'Good', '#79d6ff', 'Protein above target on 24 days'], ['Sleep', 'Usual', '#d4d0df', 'Your normal 7 hours'], ['Drinks', 'Slipped', '#ff9aa2', '6 nights, up from 3']];
  return <div className="y-grades">{g.map(([n, w, c, why]) => <div key={n}><span>{n}</span><b style={{ color: c }}>{w}</b><small>{why}</small></div>)}</div>;
}

function Film({ close }: { close: () => void }) {
  const [i, setI] = useState(0);
  const f = FILM[i];
  return (
    <div className="y-film" style={{ background: f.bg }} onClick={() => setI(Math.min(FILM.length - 1, i + 1))}>
      <div className="y-film-glow" />
      <div className="y-bars">{FILM.map((_, k) => <i key={k} className={k <= i ? 'on' : undefined} />)}</div>
      <button type="button" className="y-close" onClick={(e) => { e.stopPropagation(); close(); }}>Close</button>
      <div className="y-film-b" key={i}>{f.el}</div>
      <button type="button" className="y-film-prev" onClick={(e) => { e.stopPropagation(); setI(Math.max(0, i - 1)); }}>Back</button>
    </div>
  );
}

function Reports() {
  const peacock = creatureById('peacock');
  const sarus = creatureById('sarus');
  const spread: [string, string, string, string, number, number][] = [['8,900', 'steps a day', '#5fe3b4', '#4fd8e6', 60, 82], ['112 g', 'protein a day', '#ff9a6b', '#ff7db8', 50, 76], ['7 h 04', 'asleep a night', '#79b4ff', '#b896ff', 66, 63], ['64%', 'office days at target', '#b896ff', '#ff7db8', 40, 64]];
  const days = [3, 4, 2, 5, 4, 3, 1];
  return (
    <div className="y-stack">
      <h1>Reports</h1>
      <div className="y-week"><b>Week 6, the story</b><span className="y-q">The road, who came by, and what's next.</span></div>
      <section className="y-sec"><h2>1 · On the road</h2>
        <div className="y-story"><WalkVista km={300} /><div className="y-story-b"><span className="y-q">Week 6 · on the road</span><div className="y-h2">You reached the Chambal</div><span className="y-q">63 km this week. Gwalior is 50 km ahead.</span></div></div>
      </section>
      <section className="y-sec"><h2>2 · Who came by</h2>
        <div className="y-vis2">{peacock && <div className="y-vis"><CreatureFigure c={peacock} stage={3} width={120} burst={false} /><b>Peacock</b><span>3 mornings · now grown</span></div>}{sarus && <div className="y-vis"><CreatureFigure c={sarus} stage={1} width={120} burst={false} /><b>Sarus crane</b><span>Monday · first time</span></div>}</div>
        <span className="y-q">Next road: new creatures may come by in the ravines.</span>
      </section>
      <section className="y-sec"><h2>3 · Next week</h2><div className="y-card y-tint" style={v({ '--c': HUE.walk })}><b>Gwalior is 50 km away</b><span className="y-q">9,800 steps a day gets you there by 20 Nov.</span></div></section>
      <div className="y-week"><b>October</b><span className="y-q">The whole month, on one page.</span></div>
      <section className="y-sec"><h2>One dense page</h2>
        <Play className="y-spread">
          <div className="y-sp1"><div className="y-sp-big"><Count to={484} /></div><span className="y-q">sets, across 22 sessions</span>
            <div className="y-wk">{days.map((d, i) => <span key={i} style={v({ '--h': `${d * 11}px`, '--i': i })}><i /><small>{'MTWTFSS'[i]}</small></span>)}</div></div>
          {spread.map(([a, b, c, c2, x, y], i) => <div key={b}><b style={{ color: c }}>{a}</b><span>{b}</span><Line vals={series(x, y, 14, i + 5, 4)} c={c} c2={c2} h={44} last={false} /></div>)}
        </Play>
      </section>
      <section className="y-sec"><h2>Assessed</h2><div className="y-card"><Grades /></div><div className="y-card"><b>Try next</b><span className="y-q">Bed before 12:30 on training nights.</span></div></section>
    </div>
  );
}

/** Steps over 40 days on the road's colours: each stretch is its own soft ground, and the line takes that stretch's light. */
function WalkChart() {
  const w = 320;
  const h = 170;
  const top = 34;
  const vals = series(6900, 9300, 40, 7, 800);
  [27, 28, 29].forEach((i, k) => { vals[i] = [4200, 3100, 4400][k]; });
  const x = (i: number) => (i * w) / 39;
  const y = (t: number) => top + (h - top - 8) * (1 - t / 12500);
  const roads = [{ a: 0, b: 17, n: 'The plains', c: '#4254c9', l: '#c6d0ff' }, { a: 17, b: 39, n: 'Bandit Country', c: '#b23f7f', l: '#ffc7a6' }];
  return (
    <Play className="y-walk">
      <svg viewBox={`0 0 ${w} ${h}`} aria-label="Sample steps chart on the road’s colours" role="img">
        <defs>
          {roads.map((r, i) => <linearGradient key={i} id={`rd${i}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={r.c} stopOpacity=".95" /><stop offset="1" stopColor={r.c} stopOpacity=".35" /></linearGradient>)}
          <linearGradient id="rdblend" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#4254c9" stopOpacity=".95" /><stop offset="1" stopColor="#b23f7f" stopOpacity=".95" /></linearGradient>
          <clipPath id="rdc"><rect width={w} height={h} rx="14" /></clipPath>
        </defs>
        <g clipPath="url(#rdc)">
          {roads.map((r, i) => <rect key={i} x={x(r.a)} width={x(r.b) - x(r.a)} height={h} fill={`url(#rd${i})`} />)}
          <rect x={x(17) - 10} width="20" height={h} fill="url(#rdblend)" opacity=".55" />
          <rect x={x(26.6)} y={top} width={x(30) - x(26.6)} height={h - top} fill="#0c0e1d" fillOpacity=".34" />
          <line x1="0" x2={w} y1={y(8000)} y2={y(8000)} stroke="#fff" strokeOpacity=".5" strokeDasharray="2 5" strokeLinecap="round" />
          {roads.map((r, i) => <path key={i} className="y-draw" pathLength={1} d={smooth(vals.slice(r.a, r.b + 1).map((t, k) => [x(r.a + k), y(t)]))} fill="none" stroke={r.l} strokeWidth="3" strokeLinecap="round" style={{ animationDelay: `${i * 0.7}s` }} />)}
        </g>
      </svg>
      <div className="y-walk-top" aria-hidden="true">{roads.map((r) => <span key={r.n} style={{ flex: r.b - r.a }}>{r.n}</span>)}</div>
      <div className="y-walk-flags"><span style={{ left: '31%' }}>Plan 1.2</span><span style={{ left: '71%' }}>Sick, 3 days</span></div>
      <div className="y-walk-key"><span>Dotted line: your usual</span><span>27 Sep to 5 Nov</span></div>
    </Play>
  );
}

type Track = 'food' | 'shape' | 'steps' | 'sleep' | 'training' | 'readiness' | 'joints' | 'drinks' | 'meds' | 'own' | 'compare';
const TRACKS: Record<Track, { n: string; c: string; ground: string; say: string; ch: string; why: string; nx: string; views: string[] }> = {
  food: { n: 'Food', c: '#ffb27a', ground: '#a8341c', say: 'A steady week, 970 kcal under plan', ch: 'Protein up 12 g on last week', why: 'More eggs at breakfast', nx: 'Lunch on office days', views: ['Week statement', 'Protein clock', 'All foods'] },
  shape: { n: 'Shape', c: HUE.shape, ground: '#7a2c5e', say: 'Trending down, slower than September', ch: 'Slower by a little', why: 'Water and salt around the trip', nx: 'Next check-in in 6 days', views: ['Forecast', 'Reasons', 'Tape', 'Photos'] },
  steps: { n: 'Steps', c: HUE.steps, ground: '#0f7059', say: 'Up 900 on your usual', ch: '8,900 a day over 7,400', why: 'Evening loop, 17 of 31 days', nx: '9,800 reaches Gwalior by 20 Nov', views: ['On the road', 'Sorted days', 'Habit strength'] },
  sleep: { n: 'Sleep', c: HUE.sleep, ground: '#1f469c', say: 'Your normal 7 hours, later at weekends', ch: 'Bedtime 20 min later', why: 'Weekend nights out', nx: 'Bed by 12:30 on training nights', views: ['Each night', 'Balance', 'Jet lag', 'Profile'] },
  training: { n: 'Training', c: HUE.train, ground: '#4d2cb0', say: 'Building. Stronger on 4 of 6 lifts', ch: '2 more sessions than September', why: 'Fewer missed Thursdays', nx: 'Add a set on row', views: ['Strength', 'Readiness calls', 'Form'] },
  readiness: { n: 'Readiness', c: '#d8f58a', ground: '#3f7a12', say: '78 today: a good night to push', ch: 'Up 8 since Monday', why: 'A full night, low soreness', nx: 'Session B tonight', views: ['What fed it', 'Against sessions', 'Fitness'] },
  joints: { n: 'Joints', c: '#b7dcff', ground: '#34507f', say: 'Quiet for 9 days', ch: '3 flags this month, 5 last', why: 'The exercise you swapped', nx: 'Keep the swap', views: ['Calendar', 'What came before', 'Swaps', 'Physio'] },
  drinks: { n: 'Drinks', c: '#ffc45e', ground: '#935008', say: '6 nights this month, up from 3', ch: '3 more nights', why: 'Two trips', nx: 'Nothing to do', views: ['Morning after', 'Nights'] },
  meds: { n: 'Medicines', c: HUE.meds, ground: '#0f6a73', say: 'One home for every tablet', ch: '56 of 60 doses this month', why: 'Two late nights', nx: 'Refill by 22 Nov', views: ['List', 'Refills'] },
  own: { n: 'Your own tracks', c: HUE.own, ground: '#33479f', say: 'Anything else worth counting', ch: 'Reading up to 24 min a day', why: 'You started it on the 12th', nx: 'Add another', views: ['Mood', 'Reading', 'Stretch'] },
  compare: { n: 'Compare', c: '#7fe0ff', ground: '#0f4f8a', say: 'Steps against sleep', ch: 'They move together in October', why: 'Long walks, earlier nights', nx: 'A work trip will test this', views: ['Any two', 'Experiments'] },
};

/** A small living thing for each track: decoration only, behind everything, never carrying meaning. */
function Ambient({ t }: { t: Track }) {
  const r = (i: number, m: number) => ((i * 37 + 11) * ((i % 5) + 3)) % m;
  const many = (n: number, cls: string, f: (i: number) => Record<string, string | number>) => Array.from({ length: n }, (_, i) => <i key={`${cls}${i}`} className={cls} style={v(f(i))} />);
  let kids: ReactNode = null;
  if (t === 'drinks') kids = <>
    {many(14, 'bub', (i) => ({ '--x': `${r(i, 96)}%`, '--s': `${5 + r(i, 11)}px`, '--t': `${5 + r(i, 6)}s`, '--d': `-${r(i, 9)}s` }))}
    <span className="foamline">{many(11, 'foam', (i) => ({ '--x': `${i * 10 - 3}%`, '--s': `${34 + r(i, 30)}px`, '--t': `${3 + r(i, 4)}s`, '--d': `-${r(i, 5)}s` }))}</span>
  </>;
  if (t === 'food') kids = <svg className="a-art a-bowl" viewBox="0 0 120 100">
    {[38, 60, 82].map((x, i) => <path key={x} className="a-steam" pathLength={1} d={`M${x} 50 c-9 -9 9 -15 0 -24 c-9 -9 9 -13 0 -22`} style={v({ '--d': `${i * -1.3}s` })} />)}
    <path d="M12 56 h96 c0 24 -20 38 -48 38 s-48 -14 -48 -38 z" fill="#ffe7cf" fillOpacity=".72" />
    <path d="M8 56 h104" stroke="#fff4e6" strokeWidth="5" strokeLinecap="round" />
  </svg>;
  if (t === 'steps') kids = many(14, 'print', (i) => ({ '--x': `${(i % 2 ? 58 : 66) + Math.sin(i / 2) * 18}%`, '--y': `${94 - i * 6.6}%`, '--d': `${i * 0.42}s` }));
  if (t === 'sleep') kids = <><i className="moon" />{many(22, 'star', (i) => ({ '--x': `${r(i, 97)}%`, '--y': `${r(i * 3 + 1, 90)}%`, '--s': `${2 + r(i, 3)}px`, '--t': `${2.5 + r(i, 4)}s`, '--d': `-${r(i, 6)}s` }))}</>;
  if (t === 'training') kids = <span className="barline">{many(13, 'beat', (i) => ({ '--h': `${24 + r(i, 60)}%`, '--t': `${0.9 + r(i, 8) / 10}s`, '--d': `-${r(i, 12) / 10}s` }))}</span>;
  if (t === 'shape') kids = <i className="a-tape" />;
  if (t === 'readiness') kids = <svg className="a-art a-batt" viewBox="0 0 120 60">
    <rect x="3" y="3" width="104" height="54" rx="10" fill="none" stroke="#f0ffc0" strokeWidth="5" />
    <rect x="109" y="20" width="9" height="20" rx="3" fill="#f0ffc0" />
    {[0, 1, 2, 3].map((i) => <rect key={i} className="a-cell" x={11 + i * 23} y="11" width="18" height="38" rx="4" style={v({ '--d': `${i * 0.5}s` })} />)}
    
  </svg>;
  if (t === 'joints') kids = <svg className="a-art a-joint" viewBox="0 0 120 130">
    <rect x="51" y="2" width="18" height="60" rx="9" fill="#dcefff" fillOpacity=".8" />
    <g className="a-shin"><rect x="51" y="60" width="18" height="62" rx="9" fill="#dcefff" fillOpacity=".8" /></g>
    <circle className="a-pulse" cx="60" cy="60" r="20" fill="none" stroke="#dcefff" strokeWidth="2.5" />
    <circle cx="60" cy="60" r="14" fill="#f4faff" />
  </svg>;
  if (t === 'meds') kids = many(8, 'cap', (i) => ({ '--x': `${r(i, 90)}%`, '--t': `${9 + r(i, 7)}s`, '--d': `-${r(i, 13)}s`, '--r': `${r(i, 180)}deg` }));
  if (t === 'own') kids = many(11, 'bit', (i) => ({ '--x': `${r(i, 94)}%`, '--t': `${8 + r(i, 7)}s`, '--d': `-${r(i, 12)}s`, '--rad': i % 3 === 0 ? '50%' : i % 3 === 1 ? '3px' : '50% 0', '--k': ['#ffd27a', '#ff9fd0', '#8ff0d8'][i % 3] }));
  if (t === 'compare') kids = <><i className="orbit" /><i className="orb a" /><i className="orb b" /></>;
  return <div className={`y-amb y-amb-${t}`} aria-hidden="true">{kids}</div>;
}

function Bars({ rows }: { rows: [string, number, string, string?][] }) {
  return <Play className="y-bars-l">{rows.map(([n, w, val, c], i) => <div key={n} style={v({ '--w': `${w}%`, '--i': i, ...(c ? { '--c': c } : {}) })}><span>{n}</span><i /><b>{val}</b></div>)}</Play>;
}

function TrackBody({ t }: { t: Track }) {
  const c = TRACKS[t].c;
  if (t === 'food') return (<>
    <Bars rows={[['Mon', 86, '2,140'], ['Tue', 94, '2,360'], ['Wed', 78, '1,950'], ['Thu', 88, '2,210'], ['Fri', 100, '2,510', '#ffc27a'], ['Sat', 92, '2,300'], ['Sun', 70, '1,760']]} />
    <div className="y-card y-sum"><span>Week</span><b>14,430 of 15,400</b></div>
    <h2 className="y-h3">Protein clock</h2>
    <Play className="y-pclock"><div><span>Office</span>{[16, 34, 62, 86].map((x, i) => <i key={x} style={v({ left: `${x}%`, '--c': c, '--i': i })} />)}</div><div><span>Home</span>{[28, 48, 76].map((x, i) => <i key={x} style={v({ left: `${x}%`, '--c': '#ffd27a', '--i': i })} />)}</div><p><span>6 am</span><span>midnight</span></p></Play>
  </>);
  if (t === 'shape') return (<>
    <Play className="y-cone"><svg viewBox="0 0 320 130" aria-hidden="true"><defs><linearGradient id="cn" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor={c} stopOpacity=".6" /><stop offset="1" stopColor="#b896ff" stopOpacity=".2" /></linearGradient></defs><polygon className="y-fill" points="130,62 320,20 320,112" fill="url(#cn)" /><path className="y-draw" pathLength={1} d="M0 34 C30 38 50 34 75 48 S110 56 130 62" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" /><line x1="130" x2="320" y1="62" y2="66" stroke={c} strokeDasharray="4 5" /></svg><p><span>Today</span><span>Reveal day</span></p></Play>
    <h2 className="y-h3">Tape</h2><div className="y-rows"><div><span>Waist</span><b>Down since last time</b></div><div><span>Chest</span><b>Not re-measured</b></div></div>
  </>);
  if (t === 'steps') return (<>
    <WalkChart />
    <h2 className="y-h3">Sorted days</h2>
    <Play className="y-sorted">{Array.from({ length: 28 }, (_, i) => 30 + i * 2.5 + (i % 3)).map((s, i) => <i key={i} style={v({ '--h': `${s}%`, '--i': i, background: s < 42 ? '#ff9aa2' : s > 92 ? HUE.gold : c })} />)}</Play>
    <span className="y-q">Your last 28 days, lowest to highest. Gold: your best.</span>
    <h2 className="y-h3">Habit strength</h2><Line vals={series(30, 82, 24, 4, 2)} c={c} c2="#4fd8e6" h={60} /><span className="y-q">82 of 100. Your evening loop now takes little effort to keep.</span>
  </>);
  if (t === 'sleep') return (<>
    <Play className="y-nights">{([['Mon', 8, 66], ['Tue', 24, 62], ['Wed', 6, 72], ['Thu', 2, 68], ['Fri', 18, 78], ['Sat', 30, 90], ['Sun', 20, 80]] as const).map(([d, a, b], i) => <div key={d} style={v({ '--a': `${a}%`, '--b': `${b - a}%`, '--i': i })}><span>{d}</span><p><i /></p></div>)}<p className="y-nk"><span>11 pm</span><span>9 am</span></p></Play>
    <div className="y-rows"><div><span>Sleep balance</span><b>2 h behind</b></div><div><span>Social jet lag</span><b>1 h 10, weekends</b></div></div>
  </>);
  if (t === 'training') return (<>
    <Bars rows={[['Lateral raise', 90, '+18%'], ['Goblet squat', 72, '+11%'], ['Floor press', 60, '+8%'], ['Row', 48, '+5%']]} />
    <div className="y-rows"><div><span>Did readiness call it?</span><b>7 of 9 times</b></div><div><span>Form</span><b>Holding at 8.2</b></div></div>
  </>);
  if (t === 'readiness') return (<>
    <Bars rows={[['Sleep', 80, '+8', HUE.sleep], ['Soreness', 40, '−3', HUE.joints], ['Last session', 60, '+4', HUE.train]]} />
    <h2 className="y-h3">Fitness and freshness</h2>
    <div className="y-over"><Line vals={series(30, 80, 24, 6, 3)} c={HUE.train} h={70} area={false} /><Line vals={series(70, 50, 24, 8, 3)} c={c} h={70} area={false} /></div>
    <div className="y-key"><span style={v({ '--k': HUE.train })}>Fitness</span><span style={v({ '--k': c })}>Freshness</span></div>
  </>);
  if (t === 'joints') return (<>
    <h2 className="y-h3">Last 28 days</h2>
    <Play className="y-cal">{Array.from({ length: 28 }, (_, i) => <i key={i} style={v({ '--i': i, background: [6, 7, 19].includes(i) ? '#ff6f7d' : [3, 12, 24].includes(i) ? '#ffc27a' : i % 5 === 1 ? '#ede6da26' : '#5fe3b4' })} />)}</Play>
    <div className="y-key"><span style={v({ '--k': '#5fe3b4' })}>Fine</span><span style={v({ '--k': '#ffc27a' })}>Twinge</span><span style={v({ '--k': '#ff6f7d' })}>Flag</span></div>
    <div className="y-card"><b>Before the last flag</b><span className="y-q">A short night, and two leg sessions in 3 days.</span></div>
  </>);
  if (t === 'drinks') return (<>
    <div className="y-seg"><button type="button" aria-pressed="true">No drinks today</button></div>
    <span className="y-q">“Not logged” stays blank, and never reads as none.</span>
    <h2 className="y-h3">The morning after</h2>
    <Bars rows={[['Sleep, after', 70, '6 h 20', HUE.sleep], ['Sleep, usual', 88, '7 h 04', '#b8d4ff'], ['Steps, after', 62, '6,900', HUE.steps], ['Steps, usual', 82, '8,900', '#b4f2da']]} />
  </>);
  if (t === 'meds') return (<>
    <div className="y-rows"><div><span>Morning tablet</span><b>Taken 29 of 30</b><em>Refill by 22 Nov</em></div><div><span>Evening tablet</span><b>Taken 27 of 30</b><em>Refill by 2 Dec</em></div><div><span>Course</span><b>Day 6 of 10</b><em>Ends Tuesday</em></div></div>
    <button type="button" className="y-surprise">Edit list and checklist</button>
  </>);
  if (t === 'own') return (<>
    <div className="y-rows"><div><span>Mood</span><b>4 of 5 lately</b></div><div><span>Reading</span><b>24 min a day</b></div><div><span>Stretch</span><b>Yes on 5 of 7</b></div></div>
    <Line vals={series(40, 62, 20, 3, 4)} c={c} c2="#ff7db8" h={70} />
    <button type="button" className="y-surprise">Add a track: number, 1 to 5, or yes / no</button>
  </>);
  return (<>
    <div className="y-over"><Line vals={series(40, 80, 24, 2, 4)} c={HUE.steps} h={90} area={false} /><Line vals={series(55, 66, 24, 5, 4)} c={HUE.sleep} h={90} area={false} /></div>
    <div className="y-key"><span style={v({ '--k': HUE.steps })}>Steps</span><span style={v({ '--k': HUE.sleep })}>Sleep</span></div>
    <div className="y-card"><b>Natural experiment: a work trip</b><span className="y-q">The app compares it with the week either side, once it’s done.</span></div>
  </>);
}

function Tracks({ setGround }: { setGround: (g: string | undefined) => void }) {
  const [t, setT] = useState<Track | undefined>();
  useEffect(() => { setGround(t ? TRACKS[t].ground : undefined); return () => setGround(undefined); }, [t, setGround]);
  if (!t) return (
    <div className="y-stack">
      <h1>Tracks</h1>
      <div className="y-tiles">
        {(Object.keys(TRACKS) as Track[]).map((k, i) => (
          <button key={k} type="button" onClick={() => setT(k)} style={v({ '--c': TRACKS[k].c, '--g': TRACKS[k].ground })}><Ambient t={k} /><b>{TRACKS[k].n}</b><span>{TRACKS[k].say}</span><Line vals={series(50, 50 + (i % 3) * 14, 14, i + 2, 5)} c={TRACKS[k].c} h={28} area={false} width={2.2} /></button>
        ))}
      </div>
    </div>
  );
  const d = TRACKS[t];
  return (
    <>
    <div className="y-tbg" style={v({ '--g': d.ground })}><Ambient t={t} /></div>
    <div className="y-stack y-track" style={v({ '--c': d.c, '--g': d.ground })} key={t}>
      <button type="button" className="y-devlink" style={{ color: 'var(--cl)' }} onClick={() => setT(undefined)}>‹ Tracks</button>
      <div className="y-q" style={{ color: 'var(--cl)', fontWeight: 500 }}>{d.n}</div>
      <h1 style={{ fontSize: 26 }}>{d.say}</h1>
      <div className="y-cwn"><div><span>Changed</span>{d.ch}</div><div><span>Why</span>{d.why}</div><div><span>Next</span>{d.nx}</div></div>
      <div className="y-views">{d.views.map((x, i) => <span key={x} className={i === 0 ? 'on' : undefined}>{x}</span>)}</div>
      <TrackBody t={t} />
    </div>
    </>
  );
}

const TITLES: { fam: string; list: [string, string][] }[] = [
  { fam: 'Football', list: [['Box-to-Box', 'A session and 10,000 steps on one day, five times'], ['Super Sub', 'Swapped an exercise rather than skipping, 10 times'], ['Clean Sheet', 'A week with nothing conceded'], ['Hat-Trick Hero', 'Three records in one session'], ['Golden Boot', 'One measure scored 20 goals'], ['Comeback Kid', 'Won a week after losing three'], ['Invincible', 'Eight weeks unbeaten'], ['Set-Piece Specialist', 'Every set of a session ticked, 10 times'], ['Deep-Lying Playmaker', 'Slept 8 hours before 3 record nights'], ['False Nine', 'Set a record on a day readiness said rest'], ['Last-Minute Winner', 'Closed a ring after 11 pm, 5 times'], ['Tiki-Taka', 'Logged every meal for a fortnight'], ['Park the Bus', 'A rest day taken when it was offered, 10 times'], ['Treble Winner', 'Top of the table three months running'], ['One-Club Legend', 'Stayed on one plan for 100 days'], ['Galáctico', 'Five records in a week'], ['Gaffer', 'Changed your plan, and it worked']] },
  { fam: 'The road', list: [['Salt Marcher', 'Walked the length of the Dandi march'], ['Grand Trunk Regular', '1,000 km on the road'], ['Dacoit of the Chambal', 'Crossed Bandit Country'], ['The Cartographer', 'Walked five regions'], ['Long Way Round', 'Finished a second route'], ['Land’s End', 'Reached Kanyakumari']] },
  { fam: 'From Gremlin, grudgingly', list: [['Disappointingly Consistent', '30 days logged in a row'], ['Statistically Annoying', 'Beat a forecast 5 times'], ['Gremlin’s Least Unfavourite', 'Opened the app 100 mornings'], ['Eleven-Second Club', 'Morning log inside 15 seconds, 20 times'], ['The Auditor', 'Corrected 10 old numbers'], ['Spreadsheet’s Problem', 'A record every week for a month']] },
  { fam: 'Doing the thing', list: [['Iron Regular', '50 sessions'], ['Century', '100 sessions'], ['Tempo Merchant', 'Tempo coach on for 20 sessions'], ['Early Kickoff', 'Up before 7 for two weeks'], ['Full Eight', 'Eight hours, 10 times'], ['Protein Baron', 'Protein target 30 days running'], ['Dal Laureate', 'Logged dal 100 times']] },
  { fam: 'Slow days', list: [['Still Here', 'Logged on a sick day'], ['The Returner', 'Came back after a week away'], ['Rest Day Enforcer', 'Took every rest day for a month'], ['Bounce Back', 'Beat your usual after a bad week']] },
  { fam: 'Visitors', list: [['Friend of the Plains', 'Met every visitor of a stretch you’ve finished'], ['The Regular’s Regular', 'Saw one visitor 20 times'], ['Field Researcher', 'Collected 10 field notes'], ['Dawn Patrol', 'Saw 5 visitors at dawn in a week']] },
];

function Earned() {
  const [worn, setWorn] = useState('Box-to-Box');
  const [fam, setFam] = useState(0);
  const earned = new Set(['Box-to-Box', 'Super Sub', 'Clean Sheet', 'Salt Marcher', 'Disappointingly Consistent', 'Still Here']);
  const met: [string, number, string][] = [['peacock', 3, 'Grown · 11 visits'], ['sarus', 2, 'Young · 4 visits'], ['nilgai', 1, 'New · 2 visits']];
  return (
    <div className="y-stack">
      <h1>Earned</h1>
      <section className="y-sec"><h2>Trophy case</h2>
        <Play className="y-trophy">{[['16,204', 'Most steps in a day'], ['Oct', 'Best month so far'], ['6', 'Perfect days so far'], ['11', 'Records so far'], ['193', 'km in October'], ['3', 'Visitors met so far']].map(([a, b], i) => <div key={b} style={v({ '--i': i })}><b>{a}</b><span>{b}</span></div>)}</Play>
      </section>
      <section className="y-sec"><h2>Titles</h2>
        <span className="y-q">Wearing: <b style={{ color: HUE.gold }}>the {worn}</b>. A new one offers “Wear it”; you choose.</span>
        <div className="y-views y-fams">{TITLES.map((f, i) => <button key={f.fam} type="button" className={i === fam ? 'on' : undefined} onClick={() => setFam(i)}>{f.fam}</button>)}</div>
        <div className="y-titles" key={fam}>{TITLES[fam].list.map(([t, how], i) => { const has = earned.has(t); return <button key={t} type="button" disabled={!has} className={worn === t ? 'worn' : has ? 'has' : undefined} onClick={() => setWorn(t)} style={v({ '--i': i })}><b>{t}</b><span>{how}</span></button>; })}</div>
      </section>
      <section className="y-sec"><h2>Visitors</h2>
        <div className="y-stretch"><b>Bandit Country</b><span className="y-q">The road you are on · no one met yet</span></div>
        <div className="y-stretch"><b>The plains</b><span className="y-q">Walked · 3 met</span></div>
        <div className="y-vis2">{met.map(([id, st, s]) => { const c = creatureById(id); return c && <div key={id} className="y-vis"><CreatureFigure c={c} stage={st} width={110} burst={false} /><b>{c.short}</b><span>{s}</span></div>; })}</div>
      </section>
      <section className="y-sec"><h2>Themes</h2><div className="y-rows"><div><span>Earned themes and ring styles</span><b>Open</b></div></div></section>
      <section className="y-sec"><h2>October’s shelf</h2><div className="y-rows"><div><span>First arrival: Agra</span><b>Replay</b></div><div><span>Century: 100 km in a week</span><b>Replay</b></div><div><span>Monthly challenge</span><b>Done</b></div></div></section>
    </div>
  );
}

type Screen = 'you' | 'film' | 'reports' | 'tracks' | 'earned';
const SCREENS: [Screen, string][] = [['you', 'You'], ['film', 'Film'], ['reports', 'Reports'], ['tracks', 'Tracks'], ['earned', 'Earned']];

export function YouProto() {
  const [s, setS] = useState<Screen>('you');
  const [land, setLand] = useState(1);
  const [ground, setGround] = useState<string | undefined>();
  const open = (x: Screen) => { setS(x); window.scrollTo(0, 0); };
  if (s === 'film') return <Film close={() => open('you')} />;
  const tint = regionTint(LAND[land].km);
  const style = ground ? v({ '--lv-a': ground }) : tint;
  return (
    <>
      <div className="lv rg-ground y-ground" style={style}><Aurora /></div>
      <div className="y-page">
        <nav className="y-strip" aria-label="Prototype screens">
          {SCREENS.map(([k, t]) => <button key={k} type="button" aria-pressed={s === k} onClick={() => open(k)}>{t}</button>)}
          {s === 'you' && <button type="button" className="land" onClick={() => setLand((land + 1) % LAND.length)}>Land: {LAND[land].name}</button>}
        </nav>
        {s === 'you' && <YouPage open={open} />}
        {s === 'reports' && <Reports />}
        {s === 'tracks' && <Tracks setGround={setGround} />}
        {s === 'earned' && <Earned />}
      </div>
    </>
  );
}
