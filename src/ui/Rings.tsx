const RINGS = [
  { r: 84, color: 'var(--apricot)' },
  { r: 66, color: 'var(--lavender)' },
  { r: 48, color: 'var(--sage)' },
];

/** Three thin rings: calories, protein, steps. A faint track sits behind each. */
export function Rings({
  progress,
  size = 140,
  label,
  center,
  gold,
}: {
  progress: [number, number, number];
  size?: number;
  label: string;
  center?: string;
  /** A reward: closed rings turn gold. */
  gold?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={label} style={{ flexShrink: 0 }}>
      {RINGS.map(({ r, color: base }, i) => {
        const c = 2 * Math.PI * r;
        const p = Math.max(0, Math.min(1, progress[i]));
        const color = gold && p >= 1 ? 'var(--gold)' : base;
        return (
          <g key={r}>
            <circle cx="100" cy="100" r={r} fill="none" stroke={color} strokeOpacity={p >= 1 ? 1 : 0.14} strokeWidth="13" />
            {p > 0 && p < 1 && (
              <circle
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(p * c, 1)} ${c}`}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dasharray .6s ease' }}
              />
            )}
          </g>
        );
      })}
      {center && (
        <text x="100" y="110" textAnchor="middle" fill="var(--text)" fontFamily="var(--serif)" fontWeight="300" fontSize="30">
          {center}
        </text>
      )}
    </svg>
  );
}

/** One ring with a number in the middle: readiness, the rest timer. */
export function MiniRing({
  progress,
  size = 50,
  color = 'var(--blue)',
  width = 5,
  label,
  children,
}: {
  progress: number;
  size?: number;
  color?: string;
  width?: number;
  label?: string;
  children?: string;
}) {
  const r = 30 - width;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ flexShrink: 0 }}>
      <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeOpacity="0.18" strokeWidth={width} />
      {p > 0 && (
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={`${p * c} ${c}`}
          transform="rotate(-90 30 30)"
        />
      )}
      {children && (
        <text x="30" y="36.5" textAnchor="middle" fill="var(--text)" fontFamily="var(--serif)" fontWeight="300" fontSize="19">
          {children}
        </text>
      )}
    </svg>
  );
}

/** The app mark: three closed rings. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="84" fill="none" stroke="var(--apricot)" strokeWidth="16" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="var(--lavender)" strokeWidth="16" />
      <circle cx="100" cy="100" r="36" fill="none" stroke="var(--sage)" strokeWidth="16" />
    </svg>
  );
}
