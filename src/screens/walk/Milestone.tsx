/**
 * An Indian national-highway milestone, front on, about 40 × 50 px: the yellow cap with the next city's name in
 * Hindi, the km on the white body. Nothing depends on reading it: the strip under the scene says the same in full.
 */
export function Milestone({ stone }: { stone: { name: string; hindi: string; km: number } }) {
  const [w, r] = [40, 20];
  const [x0, y0, base, cx] = [6, 4, 54, 26];
  return (
    <svg className="walk-stone" viewBox="0 0 52 58" width="52" height="58" role="img" aria-label={`Milestone: ${stone.name}, ${stone.km} km`}>
      <defs>
        <linearGradient id="walk-stone-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#cdbfa9" />
          <stop offset="1" stopColor="#efe5d4" />
        </linearGradient>
        <linearGradient id="walk-stone-cap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b38d3e" />
          <stop offset="1" stopColor="#d9b25a" />
        </linearGradient>
      </defs>
      <ellipse cx={cx - 8} cy={base + 1} rx={w * 0.62} ry="3.2" fill="#1d1220" opacity="0.4" />
      <path d={`M${x0} ${base} V${y0 + r} A${r} ${r * 0.8} 0 0 1 ${x0 + w} ${y0 + r} V${base} Z`} fill="url(#walk-stone-body)" />
      <path d={`M${x0} ${y0 + r + 1} A${r} ${r * 0.8} 0 0 1 ${x0 + w} ${y0 + r + 1} V${y0 + r + 3} H${x0} Z`} fill="url(#walk-stone-cap)" />
      <path d={`M${x0 + 2} ${y0 + r} A${r - 2} ${(r - 2) * 0.8} 0 0 1 ${x0 + w - 2} ${y0 + r} Z`} fill="url(#walk-stone-cap)" />
      <g aria-hidden="true" fill="#2a2620" textAnchor="middle">
        <text x={cx} y={y0 + r - 1} fontWeight="600" fontSize="9.5" textLength={w - 10} lengthAdjust="spacingAndGlyphs">
          {stone.hindi}
        </text>
        <text x={cx} y={base - 9} fontFamily="var(--sans)" fontWeight="700" fontSize={stone.km >= 1000 ? 12 : 15} textLength={stone.km >= 100 ? w - 12 : undefined} lengthAdjust="spacingAndGlyphs">
          {stone.km}
        </text>
      </g>
      <g stroke="#2a1a26" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <line x1={x0 - 3} y1={base} x2={x0 - 5} y2={base - 7} />
        <line x1={x0 + 3} y1={base} x2={x0 + 4} y2={base - 6} />
        <line x1={x0 + w - 2} y1={base} x2={x0 + w - 4} y2={base - 7} />
        <line x1={x0 + w + 4} y1={base} x2={x0 + w + 6} y2={base - 6} />
      </g>
      <title>{`${stone.name}, ${stone.km} km`}</title>
    </svg>
  );
}
