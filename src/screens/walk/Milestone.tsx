/**
 * An Indian national-highway milestone, front on, drawn flat as layered dusk draws it (cream body, gold cap), about 44 × 50 px: the yellow cap with the next city's name in
 * Hindi, the km on the white body. Nothing depends on reading it: the strip under the scene says the same in full.
 */
export function Milestone({ stone }: { stone: { name: string; hindi: string; km: number } }) {
  const [w, r] = [40, 20];
  const [x0, y0, base, cx] = [6, 4, 54, 26];
  return (
    <svg className="walk-stone" viewBox="0 0 52 58" width="44" height="50" role="img" aria-label={`Milestone: ${stone.name}, ${stone.km} km`}>
      <path d={`M${x0} ${base} V${y0 + r} A${r} ${r * 0.8} 0 0 1 ${x0 + w} ${y0 + r} V${base} Z`} fill="#f3efe4" />
      <path d={`M${x0} ${y0 + r + 1} A${r} ${r * 0.8} 0 0 1 ${x0 + w} ${y0 + r + 1} V${y0 + r + 3} H${x0} Z`} fill="#f2c46d" />
      <path d={`M${x0 + 2} ${y0 + r} A${r - 2} ${(r - 2) * 0.8} 0 0 1 ${x0 + w - 2} ${y0 + r} Z`} fill="#f2c46d" />
      <g aria-hidden="true" fill="#2a2620" textAnchor="middle">
        <text x={cx} y={y0 + r - 1} fontWeight="600" fontSize="9.5" textLength={w - 10} lengthAdjust="spacingAndGlyphs">
          {stone.hindi}
        </text>
        <text x={cx} y={base - 9} fontFamily="var(--sans)" fontWeight="700" fontSize={stone.km >= 1000 ? 12 : 15} textLength={stone.km >= 100 ? w - 12 : undefined} lengthAdjust="spacingAndGlyphs">
          {stone.km}
        </text>
      </g>
      <title>{`${stone.name}, ${stone.km} km`}</title>
    </svg>
  );
}
