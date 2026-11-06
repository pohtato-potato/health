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
