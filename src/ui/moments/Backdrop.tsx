import type { MomentStyle } from '../../domain/firsts';

const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

/**
 * The light behind a moment, one style per kind (spec §7): shooting stars, a polaroid-style
 * bloom of gold, fireworks, a rangoli, gold coins, a level-up ring, a train's lamps. Each
 * moves only when motion is allowed; with reduced motion it is a still.
 */
export function Backdrop({ style, seed = 1 }: { style: MomentStyle; seed?: number }) {
  const rnd = seeded(seed * 97 + 11);
  switch (style) {
    case 'stars':
      return (
        <svg className="backdrop" viewBox="0 0 390 600" aria-hidden>
          {Array.from({ length: 60 }, (_, i) => (
            <circle key={i} cx={rnd() * 390} cy={rnd() * 420} r={0.5 + rnd()} fill="#f6eed9" opacity={0.3 + rnd() * 0.6} />
          ))}
          {[0, 1, 2].map((i) => (
            <line key={`s${i}`} className={`shoot shoot-${i}`} x1={60 + i * 110} y1={40 + i * 50} x2={20 + i * 110} y2={70 + i * 50} stroke="#fff4d6" strokeWidth="1.6" strokeLinecap="round" />
          ))}
        </svg>
      );
    case 'polaroid':
      return (
        <svg className="backdrop" viewBox="0 0 390 600" aria-hidden>
          <defs>
            <radialGradient id="bloom">
              <stop offset="0" stopColor="#f2c46d" stopOpacity="0.55" />
              <stop offset="0.5" stopColor="#f2c46d" stopOpacity="0.12" />
              <stop offset="1" stopColor="#f2c46d" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="bloom" cx="195" cy="230" r="220" fill="url(#bloom)" />
          <g className="rays" stroke="#f2c46d" strokeOpacity="0.18" strokeWidth="2">
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              return <line key={i} x1={195 + Math.cos(a) * 70} y1={230 + Math.sin(a) * 70} x2={195 + Math.cos(a) * 190} y2={230 + Math.sin(a) * 190} />;
            })}
          </g>
        </svg>
      );
    case 'fireworks':
      return (
        <svg className="backdrop" viewBox="0 0 390 600" aria-hidden>
          {[
            [110, 150, '#f2c46d'],
            [270, 110, '#e79a9a'],
            [200, 230, '#8fc9b0'],
          ].map(([x, y, c], k) => (
            <g key={k} className={`burst burst-${k}`} stroke={c as string} strokeWidth="1.6" strokeLinecap="round">
              {Array.from({ length: 14 }, (_, i) => {
                const a = (i / 14) * Math.PI * 2;
                return <line key={i} x1={(x as number) + Math.cos(a) * 12} y1={(y as number) + Math.sin(a) * 12} x2={(x as number) + Math.cos(a) * 46} y2={(y as number) + Math.sin(a) * 46} />;
              })}
            </g>
          ))}
        </svg>
      );
    case 'rangoli':
      return (
        <svg className="backdrop" viewBox="0 0 390 600" aria-hidden>
          <g className="rangoli" transform="translate(195 240)">
            {[150, 115, 80, 48].map((r, ring) =>
              Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * Math.PI * 2 + ring * 0.13;
                return <ellipse key={`${ring}-${i}`} cx={Math.cos(a) * r} cy={Math.sin(a) * r} rx={14 - ring * 2} ry={6 - ring} transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * r} ${Math.sin(a) * r})`} fill={['#e98a5b', '#f2c46d', '#e79a9a', '#b7a6f0'][ring]} opacity="0.55" />;
              }),
            )}
          </g>
        </svg>
      );
    case 'coins':
      return (
        <svg className="backdrop" viewBox="0 0 390 600" aria-hidden>
          {Array.from({ length: 18 }, (_, i) => (
            <g key={i} className="coin" style={{ animationDelay: `${(i % 6) * 0.18}s` }} transform={`translate(${20 + rnd() * 350} ${rnd() * 380})`}>
              <ellipse rx="11" ry="11" fill="#f2c46d" />
              <ellipse rx="7" ry="7" fill="none" stroke="#c9a85a" strokeWidth="1.4" />
            </g>
          ))}
        </svg>
      );
    case 'levelup':
      return (
        <svg className="backdrop" viewBox="0 0 390 600" aria-hidden>
          {[60, 100, 140].map((r, i) => (
            <circle key={r} className={`ring-up ring-up-${i}`} cx="195" cy="230" r={r} fill="none" stroke="#b7a6f0" strokeOpacity={0.5 - i * 0.12} strokeWidth="2" />
          ))}
        </svg>
      );
    case 'train':
      return (
        <svg className="backdrop" viewBox="0 0 390 600" aria-hidden>
          <rect y="430" width="390" height="3" fill="#2a2f55" />
          <g className="train" fill="#1e2346">
            {[0, 1, 2, 3].map((i) => (
              <g key={i} transform={`translate(${30 + i * 92} 382)`}>
                <rect width="86" height="46" rx="6" />
                {[10, 32, 54].map((x) => (
                  <rect key={x} x={x} y="10" width="16" height="12" rx="2" fill="#f2c46d" opacity="0.85" />
                ))}
              </g>
            ))}
          </g>
        </svg>
      );
    default:
      return null;
  }
}
