// The full-screen moments of a match. `Takeover` is the replay's screamer and big-night page (boards 9–10). The rest
// are the live match's (boards 17 and 23): one shell, a scene on top, then the word, the odds, the score, the line,
// the facts and Carry on. Goals are drawn as a scene like the wonder save, never on the radar. Pure views: the
// scorer's card comes in as children.
import type { CSSProperties, ReactNode } from 'react';
import type { Takeover as Kind } from './Replay';

export function Takeover({ kind, minute, scorer, score }: { kind: Kind; minute: number; scorer: string; score: [number, number] }) {
  return (
    <div className={`fb-takeover t-${kind}`} role="alert">
      <div className="fb-field" aria-hidden="true"><i className="bl b1" /><i className="bl b2" /><i className="bl b3" /></div>
      <span className="fb-num tk-min">{minute}’</span>
      <b className="tk-word">{kind === 'screamer' ? 'SCREAMER' : 'GOAL'}</b>
      <span className="tk-who">{scorer}</span>
      <span className="fb-num tk-score">{score[0]}–{score[1]}</span>
    </div>
  );
}

/** Home first, as it stands after the moment. */
export interface MomentScore { home: string; away: string; n: [number, number] }

/** The shell every live moment shares: it covers the whole screen, tab bar included, its one button at the foot. */
export function MomentPage({ className, minute, fixture, scene, word, odds, score, still, line, facts, onOn }: {
  className: string;
  minute: number;
  /** "Brabo v Harbour Town", home first. */
  fixture: string;
  scene: ReactNode;
  word: string;
  odds?: { pct: number; words: string };
  score: MomentScore;
  /** A save leaves the score as it was: the label says "Still". */
  still?: boolean;
  line?: string;
  facts: string[];
  onOn: () => void;
}) {
  return (
    <div className={`ws-page ${className}`} role="alert">
      <span className="ws-min">{minute}′ · {fixture}</span>
      {scene}
      <b className="ws-word">{word}</b>
      {odds && <p className="ws-odds"><b>{odds.pct}%</b><span>{odds.words}</span></p>}
      <p className="ws-score" aria-label={`${still ? 'Still ' : ''}${score.home} ${score.n[0]}, ${score.away} ${score.n[1]}`}><b>{score.n[0]}</b><span aria-hidden="true">–</span><b>{score.n[1]}</b></p>
      {line && <p className="ws-line">{line}</p>}
      {facts.length > 0 && <ul className="ws-facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>}
      <button type="button" className="ws-go" onClick={onOn}>Carry on</button>
    </div>
  );
}

export type GoalKind = 'tap' | 'scr' | 'run' | 'hat';

/** Which scene a goal of yours gets: a third by one player is the hat-trick, a long shot the screamer, a counter the breakaway. */
export function goalKind(c: { type: string }, nth: number): GoalKind {
  if (nth === 3) return 'hat';
  if (c.type === 'Long shot') return 'scr';
  if (c.type === 'Counter-attack') return 'run';
  return 'tap';
}

interface Shot { word: string; odds: string; rot: number; card: [number, number]; goal: [number, number, number, number]; path: string; end: [number, number] }
const SHOTS: Record<Exclude<GoalKind, 'hat'>, Shot> = {
  tap: { word: 'Goal', odds: 'to score.', rot: -16, card: [34, 92], goal: [176, 34, 130, 112], path: 'M132 214 Q176 196 236 120', end: [236, 120] },
  scr: { word: 'Screamer', odds: 'to score, from distance.', rot: 14, card: [6, 104], goal: [196, 10, 116, 88], path: 'M84 226 Q140 -24 280 34', end: [280, 34] },
  run: { word: 'Gone', odds: 'to score on the counter.', rot: -22, card: [100, 96], goal: [206, 76, 106, 104], path: 'M178 226 Q236 206 262 156', end: [262, 156] },
};
const SCENE_LABEL: Record<Exclude<GoalKind, 'hat'>, (who: string) => string> = {
  tap: (who) => `${who} leans in and pokes the ball into the net`,
  scr: (who) => `${who} leans back and strikes; the ball arcs into the top corner`,
  run: (who) => `${who} tilts forward at full speed and rolls the ball past the keeper`,
};

function Net({ goal: [x, y, w, h] }: { goal: Shot['goal'] }) {
  return (
    <>
      <g className="gs-net">
        {Array.from({ length: 7 }, (_, k) => <path key={`v${k}`} d={`M${Math.round(x + ((k + 1) * w) / 8)} ${y}V${y + h}`} />)}
        {Array.from({ length: 4 }, (_, k) => <path key={`h${k}`} d={`M${x} ${Math.round(y + ((k + 1) * h) / 5)}H${x + w}`} />)}
        <path d={`M${x} ${y + h} Q${x + w / 2} ${y + h + 14} ${x + w} ${y + h}`} />
      </g>
      <path className="gs-post" d={`M${x} ${y + h + 4}V${y}H${x + w}V${y + h + 4}`} />
    </>
  );
}

/** The goal as a scene (g23-tap, g23-scr, g23-run): the scorer's card leans into the strike and the net bulges. */
function GoalPicture({ kind, who, children }: { kind: Exclude<GoalKind, 'hat'>; who: string; children?: ReactNode }) {
  const s = SHOTS[kind];
  const style = { ['--rot' as string]: `${s.rot}deg`, left: `${(s.card[0] / 320) * 100}%`, top: `${(s.card[1] / 260) * 100}%` } as CSSProperties;
  return (
    <div className="gs-scene" role="img" aria-label={SCENE_LABEL[kind](who)}>
      {kind === 'run' && <><span className="gs-ghost" aria-hidden="true" style={{ left: '6%', top: '46%', ['--r' as string]: '-6deg' } as CSSProperties} /><span className="gs-ghost" aria-hidden="true" style={{ left: '16%', top: '58%', ['--r' as string]: '4deg' } as CSSProperties} /></>}
      <svg viewBox="0 0 320 260" aria-hidden="true">
        <defs><radialGradient id="gs-ball-fill" cx=".35" cy=".3"><stop offset=".3" stopColor="#fff" /><stop offset=".7" stopColor="#dcd8e8" /><stop offset="1" stopColor="#8a86a0" /></radialGradient></defs>
        <g className="gs-bulge"><Net goal={s.goal} /></g>
        <path className="gs-trail" d={s.path} />
        {kind === 'run' && [[140, 0], [168, 0.3], [196, 0.15], [222, 0.45]].map(([y, d]) => <line key={y} className="gs-streak" x1={-10} y1={y} x2={140} y2={y} style={{ animationDelay: `${d}s` }} />)}
        {kind === 'scr' && [[-10, -8], [8, -12], [12, 6], [-4, 12]].map(([dx, dy]) => <path key={`${dx}${dy}`} className="gs-shard" d={`M${s.end[0] + dx} ${s.end[1] + dy}l8 -3 3 8z`} />)}
        <g className="gs-rip">{[1.05, 1.3].map((d) => <circle key={d} cx={s.end[0]} cy={s.end[1]} r={16} style={{ animationDelay: `${d}s` }} />)}</g>
        <circle className="gs-ball" r={19} style={{ offsetPath: `path('${s.path}')` }} />
      </svg>
      {children && <span className="gs-card" style={style}>{children}</span>}
    </div>
  );
}

/** The hat-trick (t17-bloom, as board 17 drew it): the card in a turning bloom, the three goals' minutes orbiting it. */
function HatPicture({ who, minutes, children }: { who: string; minutes: number[]; children?: ReactNode }) {
  return (
    <div className="gs-orbs" role="img" aria-label={`${who}'s three goals: ${minutes.map((m) => `${m}′`).join(', ')}`}>
      {children && <span className="gs-hcard">{children}</span>}
      {minutes.slice(0, 3).map((m, i) => <span key={i} className="gs-ob" aria-hidden="true" style={{ ['--a' as string]: `${(i - 1) * 60}deg`, animationDelay: `${0.3 + i * 0.5}s` } as CSSProperties}>{m}′</span>)}
    </div>
  );
}

const SPARKS = Array.from({ length: 16 }, (_, k) => ({ x: `${(k * 41 + 7) % 96}%`, y: `${((k * 67) % 600) + 30}px`, d: `${((k * 0.31) % 2).toFixed(2)}s` }));

export function GoalScene({ kind, minute, fixture, pct, scorer, minutes, score, line, facts, children, onOn }: {
  kind: GoalKind;
  minute: number;
  fixture: string;
  pct: number;
  scorer?: string;
  /** The scorer's goals tonight, by minute (the hat-trick's orbs). */
  minutes?: number[];
  score: MomentScore;
  line?: string;
  facts: string[];
  children?: ReactNode;
  onOn: () => void;
}) {
  const who = scorer ?? 'Your player';
  const hat = kind === 'hat';
  const scene = hat ? (
    <>
      <span className="gs-bloom" aria-hidden="true" />
      {[0, 1, 2].map((d) => <span key={d} className="gs-halo" aria-hidden="true" style={{ animationDelay: `${d}s` }} />)}
      {SPARKS.map((s, k) => <span key={k} className="gs-spark" aria-hidden="true" style={{ left: s.x, top: s.y, animationDelay: s.d }} />)}
      <HatPicture who={who} minutes={minutes ?? [minute]}>{children}</HatPicture>
    </>
  ) : <GoalPicture kind={kind} who={who}>{children}</GoalPicture>;
  return (
    <MomentPage className={`gs-page gs-${kind}`} minute={minute} fixture={fixture} scene={scene} word={hat ? 'Hat-trick' : SHOTS[kind].word}
      odds={hat ? undefined : { pct, words: `${SHOTS[kind].odds}${scorer ? ` ${scorer} did.` : ''}` }} score={score} line={line} facts={facts} onOn={onOn} />
  );
}
