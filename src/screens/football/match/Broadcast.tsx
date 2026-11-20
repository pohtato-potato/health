// The live match as a broadcast (board 15, m15-pitch): the score bug on top with a live dot and a clock bar marked at
// half-time, and the floodlit pitch from above where the move plays out before the shot goes to your shape. Pure view.
import type { ChanceEvent } from '../../../football/types';

export interface BugSide {
  name: string;
  /** Three letters, for a narrow screen. */
  short: string;
  crest: string;
  n: number;
  ours: boolean;
}

function BugTeam({ s, right }: { s: BugSide; right?: boolean }) {
  return (
    <div className={`mb-s${right ? ' r' : ''}${s.ours ? ' us' : ''}`}>
      <span className="mb-cr" aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.crest }} />
      <b><span className="mb-fn">{s.name}</span><span className="mb-ab" aria-hidden="true">{s.short}</span></b>
    </div>
  );
}

export function ScoreBug({ sides, minute, live = true, where }: { sides: [BugSide, BugSide]; minute: number; live?: boolean; where?: string }) {
  const [a, b] = sides;
  const label = `${a.name} ${a.n}, ${b.name} ${b.n}, ${minute} minutes`;
  return (
    <div className="mb-bugwrap" role="group" aria-label={label}>
      <div className="mb-bug">
        <BugTeam s={a} />
        <div className="mb-sc"><b className={a.ours ? 'us' : undefined}>{a.n}</b><span aria-hidden="true">–</span><b className={b.ours ? 'us' : undefined}>{b.n}</b></div>
        <BugTeam s={b} right />
      </div>
      <div className="mb-clk">
        {live && <i className="mb-lv" aria-hidden="true" />}
        <b>{minute}′</b>
        <span className="mb-tr" aria-hidden="true"><i style={{ width: `${Math.min(100, (minute / 90) * 100).toFixed(1)}%` }} /><em /></span>
        {where && <span className="mb-wh">{where}</span>}
      </div>
    </div>
  );
}

export const bugShort = (name: string) => name.replace(/[^A-Za-z ]/g, '').split(' ').filter((w) => w.length > 2 && !/^(FC|AFC|SV|AC|The|United|City|Town)$/i.test(w))[0]?.slice(0, 3).toUpperCase() ?? name.slice(0, 3).toUpperCase();

/** Spots for up to three players on the way to goal: attack runs left to right, their attack right to left. */
const SPOTS: [number, number][] = [[118, 118], [190, 42], [246, 100]];
const mirror = ([x, y]: [number, number]): [number, number] => [300 - x, 190 - y];

/**
 * The floodlit pitch from above: the move's players along a dotted gold line, the ball travelling it once, the
 * goal at the end. Their attack comes the other way. Names are text; the drawing is decoration.
 */
export function MoveScene({ c, chain, inks }: { c: ChanceEvent; chain: string[]; inks: { us: string; them: string } }) {
  const atk = c.side === 'atk';
  const spots = SPOTS.slice(3 - Math.max(1, chain.length)).map((p) => (atk ? p : mirror(p)));
  const goal: [number, number] = atk ? [296, 95] : [4, 95];
  const path = [...spots, goal];
  const ink = atk ? inks.us : inks.them;
  const keyed = path.map(([x, y]) => `${x},${y}`).join(' ');
  const dur = 1.6;
  return (
    <div className={`mb-pitch ${c.side}`}>
      <svg viewBox="0 0 300 190" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <rect width="300" height="190" fill="var(--mb-grass)" />
        {[0, 60, 120, 180, 240].map((x) => <rect key={x} x={x} width="30" height="190" fill="var(--mb-grass2)" />)}
        <g fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2.5">
          <rect x="6" y="6" width="288" height="178" /><line x1="150" y1="6" x2="150" y2="184" /><circle cx="150" cy="95" r="26" />
          <rect x="6" y="52" width="40" height="86" /><rect x="254" y="52" width="40" height="86" /><rect x="6" y="76" width="14" height="38" /><rect x="280" y="76" width="14" height="38" />
        </g>
        <rect className="mb-net" x={atk ? 294 : 0} y="80" width="6" height="30" fill="rgba(255,255,255,.25)" stroke="#fff" strokeWidth="1.5" />
        <polyline className="mb-line" points={keyed} fill="none" stroke="#ffd36b" strokeWidth="3" strokeDasharray="4 6" strokeLinecap="round" />
        {spots.map(([x, y], i) => <circle key={i} className="mb-pl" cx={x} cy={y} r="9" fill={ink} stroke="#0b1022" strokeWidth="2" style={{ animationDelay: `${0.1 + i * 0.15}s` }} />)}
        <circle className="mb-ball" r="6" fill="#fff" stroke="#0b1022" strokeWidth="1.5" style={{ offsetPath: `path('M${path.map(([x, y]) => `${x} ${y}`).join(' L')}')`, animationDuration: `${dur}s` }} />
      </svg>
      <i className="mb-vig" aria-hidden="true" />
      {chain.length > 0 && (
        <ol className="mb-names" aria-label="The move">
          {chain.map((n, i) => {
            const [x, y] = spots[i] ?? spots[spots.length - 1];
            return <li key={n} style={{ left: `${(x / 300) * 100}%`, top: `${((y + 20) / 190) * 100}%` }}>{n}</li>;
          })}
        </ol>
      )}
    </div>
  );
}

/** The broadcast camera's projection (board 16): u across the pitch 0–1, v up it from 0.35 (near) to 1 (their goal line). */
export function proj(u: number, v: number): [number, number, number] {
  const w = Math.max(v - 0.4, -0.05) / 0.6, d = 1 + 1.3 * w;
  return [180 + ((u - 0.5) * 560) / d, -30 + 380 / d, 1 / d];
}
const poly = (pts: [number, number][]) => pts.map(([u, v]) => proj(u, v).slice(0, 2).map((n) => n.toFixed(1)).join(',')).join(' ');
/** Seeded crowd specks, the same every time. */
const CROWD = Array.from({ length: 90 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * 360, y: r(2) * 100 + 16, s: r(3) * 1.6 + 0.8, k: i % 4, d: r(4) * 2 };
});
const MOVE_UV: [number, number][] = [[0.45, 0.58], [0.82, 0.74], [0.52, 0.92]];
/** Where their players stand; 2.6 numbers them. */
export const THEIR_UV: [number, number][] = [[0.36, 0.87], [0.69, 0.9], [0.62, 0.72], [0.78, 0.84], [0.28, 0.68], [0.5, 0.99]];

/**
 * The broadcast camera (board 16, m16-cam): the pitch seen from behind your attack, their end and a floodlit crowd at
 * the top, your move's players as tokens, the ball with a gold comet tail into the net, and the camera pushing in on
 * the box as the shot goes. Names are text; the drawing is decoration.
 */
export function CameraScene({ chain, inks, them = THEIR_UV.map(() => undefined) }: { chain: string[]; inks: { us: string; them: string }; them?: (number | undefined)[] }) {
  const spots = MOVE_UV.slice(3 - Math.max(1, chain.length)).map(([u, v]) => proj(u, v));
  const [gx1, gy] = proj(0.446, 1), [gx2] = proj(0.554, 1);
  const goal: [number, number] = [(gx1 + gx2) / 2, gy - 7];
  const path = [...spots.map(([x, y, s]) => [x, y - 40 * s] as [number, number]), goal];
  const len = path.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
  const ln = { fill: 'none', stroke: 'rgba(255,255,255,.85)', strokeWidth: 2, strokeLinejoin: 'round' as const };
  return (
    <div className="mb-cam">
      <svg className="mb-camsvg" viewBox="0 0 360 330" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <rect width="360" height="330" fill="#123f27" />
        <rect width="360" height="140" fill="#0b1022" />
        {CROWD.map((c, i) => <circle key={i} className="mb-cw" cx={c.x.toFixed(0)} cy={c.y.toFixed(0)} r={c.s.toFixed(1)} fill={[inks.us, '#6c3fc4', inks.them, '#ffd36b'][c.k]} opacity=".6" style={{ animationDelay: `${c.d.toFixed(2)}s` }} />)}
        <defs><radialGradient id="mb-fl"><stop offset="0" stopColor="#ffe9c2" /><stop offset="1" stopColor="#ff7a1a" stopOpacity="0" /></radialGradient></defs>
        <circle className="mb-cw" cx="34" cy="24" r="44" fill="url(#mb-fl)" /><circle className="mb-cw" cx="326" cy="24" r="44" fill="url(#mb-fl)" style={{ animationDelay: '.9s' }} />
        <rect y="124" width="360" height="8" fill="#6c3fc4" />
        {Array.from({ length: 14 }, (_, i) => {
          const v1 = 0.35 + (i / 14) * 0.66, v2 = 0.35 + ((i + 1) / 14) * 0.66;
          return <polygon key={i} points={poly([[-0.4, v1], [1.4, v1], [1.4, v2], [-0.4, v2]])} fill={i % 2 ? '#1d7a45' : '#239050'} />;
        })}
        <polygon points={poly([[0, 0], [1, 0], [1, 1], [0, 1]])} {...ln} />
        <polyline points={poly([[0, 0.5], [1, 0.5]])} {...ln} />
        <polygon points={poly(Array.from({ length: 20 }, (_, t) => [0.5 + 0.135 * Math.cos((t / 20) * Math.PI * 2), 0.5 + 0.087 * Math.sin((t / 20) * Math.PI * 2)] as [number, number]))} {...ln} />
        <polyline points={poly([[0.204, 1], [0.204, 0.843], [0.796, 0.843], [0.796, 1]])} {...ln} />
        <polyline points={poly([[0.365, 1], [0.365, 0.948], [0.635, 0.948], [0.635, 1]])} {...ln} />
        <rect className="mb-cnet" x={gx1.toFixed(1)} y={(gy - 15).toFixed(1)} width={(gx2 - gx1).toFixed(1)} height="15" fill="rgba(255,255,255,.18)" stroke="#fff" strokeWidth="2.5" />
        {THEIR_UV.map(([u, v], i) => {
          const [x, y, s] = proj(u, v), r = 26 * s;
          return (
            <g key={`t${i}`}>
              <ellipse cx={x} cy={y + 2} rx={24 * s} ry={7 * s} fill="rgba(0,0,0,.35)" />
              <circle cx={x} cy={y - r} r={r} fill={inks.them} stroke="#0b1022" strokeWidth="2" />
              {them[i] !== undefined && <text className="mb-no" x={x} y={y - r} dy=".35em" fontSize={Math.max(14, r * 1.1)}>{them[i]}</text>}
            </g>
          );
        })}
        {spots.map(([x, y, s], i) => {
          const r = 36 * s;
          return (
            <g key={`u${i}`} className="mb-tok" style={{ animationDelay: `${0.05 + i * 0.12}s` }}>
              <ellipse cx={x} cy={y + 2} rx={r * 0.9} ry={r * 0.28} fill="rgba(0,0,0,.4)" />
              <circle cx={x} cy={y - r * 1.1} r={r} fill="#fffbf0" stroke={inks.us} strokeWidth="3.5" />
              <circle cx={x} cy={y - r * 1.1} r={r * 0.42} fill={inks.us} />
            </g>
          );
        })}
        <polyline className="mb-comet" points={path.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')} fill="none" stroke="#ffd36b" strokeWidth="5" strokeLinecap="round" style={{ strokeDasharray: `${len.toFixed(1)} ${len.toFixed(1)}`, ['--len' as string]: len.toFixed(1) }} />
        <circle className="mb-cball" r="6" fill="#fff" stroke="#0b1022" strokeWidth="1.5" style={{ offsetPath: `path('M${path.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}')` }} />
      </svg>
      {chain.length > 0 && (
        <ol className="mb-names" aria-label="The move">
          {chain.map((n, i) => {
            const [x, y] = spots[i] ?? spots[spots.length - 1];
            return <li key={n} style={{ left: `${Math.min(80, Math.max(20, (x / 360) * 100))}%`, top: `${((y + 6) / 330) * 100}%` }}>{n}</li>;
          })}
        </ol>
      )}
    </div>
  );
}
