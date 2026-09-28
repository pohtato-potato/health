import { useMemo } from 'react';

/** Confetti drifting down: rectangles, dots and squiggles, never food. */
export function Confetti({
  palette,
  count = 24,
  height = 120,
  width = 360,
  seed = 7,
}: {
  palette: string[];
  count?: number;
  height?: number;
  width?: number;
  seed?: number;
}) {
  const pieces = useMemo(() => {
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, (_, i) => ({
      x: 10 + rnd() * (width - 20),
      y: rnd() * (height * 0.55),
      a: Math.round(rnd() * 180),
      kind: i % 3,
      color: palette[i % palette.length],
      delay: -(rnd() * 4.2).toFixed(2),
    }));
  }, [palette, count, height, width, seed]);

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
    >
      {pieces.map((p, i) => (
        <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.a})`}>
          {p.kind === 0 && <rect className="cf" x="-2" y="-5.5" width="4" height="11" rx="1.5" fill={p.color} style={{ animationDelay: `${p.delay}s` }} />}
          {p.kind === 1 && <circle className="cf" r="3.2" fill={p.color} style={{ animationDelay: `${p.delay}s` }} />}
          {p.kind === 2 && (
            <path className="cf" d="M0 -8 q 4 4 0 8 q -4 4 0 8" fill="none" stroke={p.color} strokeWidth="2" strokeLinecap="round" style={{ animationDelay: `${p.delay}s` }} />
          )}
        </g>
      ))}
    </svg>
  );
}
