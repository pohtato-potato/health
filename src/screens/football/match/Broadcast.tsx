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
