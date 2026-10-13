import { mix } from '../../ui/light';

/** The theme days that dress the Today scene. Data colours never change; only sky and decoration. */
export type Festive = 'diwali' | 'holi' | 'birthday';

const SKIES: Record<Festive, [string, string, string]> = {
  diwali: ['#1e0d06', '#6a2c0e', '#f5a04a'],
  holi: ['#2a1238', '#a0406e', '#ffd35c'],
  birthday: ['#1c1534', '#5c4290', '#f7c96b'],
};

/** The sky's three stops, pulled toward the festival's colours. */
export function festiveSky(f: Festive | undefined, sky: [string, string, string]): [string, string, string] {
  if (!f) return sky;
  return sky.map((c, i) => mix(c, SKIES[f][i], 0.5)) as [string, string, string];
}

/** Decorations over the scene: lanterns and sparks for Diwali, drifting colour for Holi, paper bunting for a birthday. */
export function FestiveDecor({ f, W }: { f: Festive; W: number }) {
  if (f === 'diwali') {
    return (
      <g aria-hidden="true">
        <path d={`M0 14 Q${W / 2} 44 ${W} 14`} fill="none" stroke="#f5b94a" strokeOpacity="0.5" strokeWidth="0.8" />
        {[0.14, 0.32, 0.5, 0.68, 0.86].map((t, i) => {
          const x = W * t;
          const y = 14 + 30 * (1 - (2 * t - 1) ** 2) + 2;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <line x1="0" y1="-2" x2="0" y2="4" stroke="#f5b94a" strokeOpacity="0.6" strokeWidth="0.8" />
              <circle cy="12" r="11" fill="#ffcf5c" opacity="0.14" />
              <path d="M-5 4 h10 l2 6 -2 7 h-10 l-2 -7 Z" fill={i % 2 ? '#e0703a' : '#f2c46d'} />
              <path d="M-3 17 v4 M0 17 v5 M3 17 v4" stroke="#f2c46d" strokeWidth="0.7" />
            </g>
          );
        })}
        {[
          [W * 0.24, 70],
          [W * 0.58, 56],
          [W * 0.82, 82],
        ].map(([x, y], i) => (
          <path key={i} className="tw" style={{ animationDelay: `${-i * 0.7}s` }} d={`M${x} ${y - 5} L${x + 1.2} ${y - 1.2} L${x + 5} ${y} L${x + 1.2} ${y + 1.2} L${x} ${y + 5} L${x - 1.2} ${y + 1.2} L${x - 5} ${y} L${x - 1.2} ${y - 1.2} Z`} fill="#ffe7a8" />
        ))}
      </g>
    );
  }
  if (f === 'holi') {
    const colours = ['#ff7aa8', '#ffd35c', '#5fd6a0', '#6fb3ff', '#c08cff'];
    return (
      <g aria-hidden="true" className="festive-drift">
        {Array.from({ length: 16 }, (_, i) => {
          const x = (W * ((i * 37) % 100)) / 100;
          const y = 12 + ((i * 53) % 120);
          return <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2" transform={`rotate(${(i * 47) % 180} ${x} ${y})`} fill={colours[i % colours.length]} opacity="0.75" />;
        })}
      </g>
    );
  }
  const colours = ['#f7c96b', '#d6a8ff', '#ff9c8a', '#8fc9b0'];
  return (
    <g aria-hidden="true">
      <path d={`M0 10 Q${W / 2} 36 ${W} 10`} fill="none" stroke="#f6eed9" strokeOpacity="0.5" strokeWidth="0.8" />
      {Array.from({ length: 13 }, (_, i) => {
        const t = (i + 0.5) / 13;
        const x = W * t;
        const y = 10 + 26 * (1 - (2 * t - 1) ** 2);
        return <path key={i} d={`M${x - 7} ${y} L${x + 7} ${y} L${x} ${y + 13} Z`} fill={colours[i % colours.length]} opacity="0.9" />;
      })}
    </g>
  );
}
