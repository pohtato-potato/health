import type { ReactNode } from 'react';
// The glove save: the glove sweeps onto the ball where it actually is, then knocks it away.
export function Save({ x, y }: { x: number; y: number }) {
  const sx = x < 160 ? x + 70 : x - 70;
  const dx = x < 160 ? -60 : 60, dy = y < 140 ? -50 : -26;
  return (
    <g className="fb-save" aria-hidden="true">
      <path d={`M${sx} 300 Q ${(sx + x) / 2} ${y - 30} ${x} ${y}`} className="glv" pathLength={100} />
      <g transform={`translate(${x} ${y})`}>
        <circle r="7" className="deflect" style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as React.CSSProperties} />
        {[0, 1, 2, 3].map((k) => <circle key={k} r="2" className="spk" style={{ '--dx': `${Math.cos(k * 1.6) * 24}px`, '--dy': `${Math.sin(k * 1.6) * 24}px` } as React.CSSProperties} />)}
      </g>
    </g>
  );
}

/**
 * A wonder save (boards 17, m17-save + t17-save): a save at 25% or less. Cool Rest blue; the ball stops dead against
 * your defending shape, which cracks around it, with the saver's card at its centre; then the words, the odds and the
 * score that didn't change. Pure view: the card comes in as children.
 */
export function WonderSave({ minute, fixture, shape, land, pct, saver, score, line, facts, children, onOn }: {
  minute: number;
  /** "Brabo v Harbour Town", home first. */
  fixture: string;
  /** Your defending shape as six points on a unit radius, and where the ball was stopped. */
  shape: [number, number][];
  land: [number, number];
  pct: number;
  saver?: string;
  /** Home first, as it stands (unchanged by the save). */
  score: { home: string; away: string; n: [number, number] };
  line?: string;
  facts: string[];
  children?: ReactNode;
  onOn: () => void;
}) {
  const C = 125, R = 110;
  const pts = shape.map(([x, y]) => `${(C + x * R).toFixed(1)},${(C + y * R).toFixed(1)}`).join(' ');
  const [bx, by] = [C + land[0] * R, C + land[1] * R];
  const cracks = [0.3, 1.4, 2.4, 3.3, 4.4, 5.4].map((a) => `M${bx.toFixed(0)} ${by.toFixed(0)} L${(bx + 70 * Math.cos(a)).toFixed(0)} ${(by + 70 * Math.sin(a)).toFixed(0)}`);
  return (
    <div className="ws-page" role="alert">
      <span className="ws-min">{minute}′ · {fixture}</span>
      <div className="ws-shield" role="img" aria-label="The ball stopped inside your defending shape">
        <svg viewBox="0 0 250 250" aria-hidden="true">
          <polygon points={pts} className="ws-shape" />
          <g className="ws-crack">{cracks.map((d, k) => <path key={k} d={d} style={{ animationDelay: `${0.9 + k * 0.05}s` }} />)}</g>
        </svg>
        {children && <span className="ws-card">{children}</span>}
        <span className="ws-ball" style={{ left: `${(bx / 250) * 100}%`, top: `${(by / 250) * 100}%` }} aria-hidden="true" />
      </div>
      <b className="ws-word">Wonder save</b>
      <p className="ws-odds"><b>{pct}%</b><span>chance to stop it.{saver ? ` ${saver} did.` : ''}</span></p>
      <p className="ws-score" aria-label={`Still ${score.home} ${score.n[0]}, ${score.away} ${score.n[1]}`}><b>{score.n[0]}</b><span aria-hidden="true">–</span><b>{score.n[1]}</b></p>
      {line && <p className="ws-line">{line}</p>}
      {facts.length > 0 && <ul className="ws-facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>}
      <button type="button" className="ws-go" onClick={onOn}>Carry on</button>
    </div>
  );
}
