/**
 * The "first" moment (t-series): a dumbbell with a knurled grip, collars and plates stamped with
 * the weight, in front of a slow bloom with rays, a soft reflection and four-point sparkles.
 */
export function FirstArt({ kg }: { kg?: string }) {
  const stamp = kg ? `${kg}` : '';
  const plate = (x: number, h: number) => (
    <g>
      <rect x={x} y={100 - h / 2} width="12" height={h} rx="3" fill="#2b2a33" stroke="#f2c46d" strokeOpacity="0.55" strokeWidth="1" />
      <rect x={x + 2} y={100 - h / 2 + 3} width="2" height={h - 6} rx="1" fill="#fff4d6" opacity="0.18" />
    </g>
  );
  const sparkle = (x: number, y: number, s: number, delay: string) => (
    <path className="tw" style={{ animationDelay: delay }} d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z`} fill="#fff4d6" />
  );
  return (
    <svg viewBox="0 0 300 200" width="100%" style={{ maxWidth: 340, alignSelf: 'center' }} aria-hidden="true">
      <defs>
        <radialGradient id="first-bloom">
          <stop offset="0" stopColor="#fff4d6" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="#f2c46d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f2c46d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="first-reflect" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2c46d" stopOpacity="0.22" />
          <stop offset="1" stopColor="#f2c46d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="first-rays" style={{ transformOrigin: '150px 100px' }}>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M150 100 L146 18 L154 18 Z" fill="#f2c46d" opacity={i % 2 ? 0.08 : 0.14} transform={`rotate(${i * 30} 150 100)`} />
        ))}
      </g>
      <circle cx="150" cy="100" r="78" fill="url(#first-bloom)" />
      {/* The reflection on the floor. */}
      <ellipse cx="150" cy="168" rx="92" ry="10" fill="url(#first-reflect)" />
      {/* The dumbbell: plates, collars, a knurled grip. */}
      <g>
        {plate(70, 74)}
        {plate(84, 60)}
        {plate(204, 60)}
        {plate(218, 74)}
        <rect x="96" y="92" width="8" height="16" rx="2" fill="#c9a85a" />
        <rect x="196" y="92" width="8" height="16" rx="2" fill="#c9a85a" />
        <rect x="104" y="95" width="92" height="10" rx="3" fill="#8f8a7c" />
        <g stroke="#2b2a33" strokeOpacity="0.55" strokeWidth="0.8">
          {Array.from({ length: 15 }, (_, i) => (
            <path key={i} d={`M${118 + i * 4.6} 95 l3 10`} />
          ))}
        </g>
        {stamp && (
          <>
            <text x="76" y="104" textAnchor="middle" fontSize="9" fontWeight="700" fill="#f2c46d" fontFamily="var(--sans)" transform="rotate(-90 76 100)">
              {stamp}
            </text>
            <text x="224" y="104" textAnchor="middle" fontSize="9" fontWeight="700" fill="#f2c46d" fontFamily="var(--sans)" transform="rotate(90 224 100)">
              {stamp}
            </text>
          </>
        )}
      </g>
      {sparkle(58, 44, 7, '0s')}
      {sparkle(246, 36, 5, '-0.8s')}
      {sparkle(262, 132, 6, '-1.6s')}
      {sparkle(40, 140, 4.5, '-2.2s')}
    </svg>
  );
}

/** The firsts so far, as a row of embers; the newest burns brightest. */
export function Embers({ count }: { count: number }) {
  const shown = Math.min(count, 24);
  return (
    <div className="row" style={{ gap: 6, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 260 }} role="img" aria-label={`${count} firsts so far`}>
      {Array.from({ length: shown }, (_, i) => (
        <i key={i} className={`ember${i === shown - 1 ? ' new' : ''}`} />
      ))}
      {count > shown && <span className="t12 gold">+{count - shown}</span>}
    </div>
  );
}
