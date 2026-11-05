import { CONTENT_STYLES, contentMarks, MARKS_PER_RING, RING_INKS, shapePath, type Mark, type RingStyle } from './styles';

const RADII = [84, 66, 48];
const PI_DIGITS = '314159265358979323846264338327950288';

/** One mark of a content-styled ring, drawn in the ring's own ink. */
function Glyph({ style, m, ink, i, ring, arc }: { style: RingStyle; m: Mark; ink: string; i: number; ring: number; arc: number }) {
  const o = m.filled ? 1 : 0.18;
  const at = `translate(${m.x.toFixed(2)} ${m.y.toFixed(2)}) rotate(${m.angle.toFixed(1)})`;
  switch (style) {
    case 'stars':
      return <path transform={at} d="M0 -7L1.8 -1.8 7 0 1.8 1.8 0 7 -1.8 1.8 -7 0 -1.8 -1.8Z" fill={ink} opacity={o} />;
    case 'marigold':
      return (
        <g transform={at} opacity={o}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx="0" cy="-3.2" rx="2.6" ry="3.4" transform={`rotate(${a})`} fill={ink} />
          ))}
          <circle r="2" fill="var(--ink)" />
        </g>
      );
    case 'cane':
      // Stripes only where the ring is filled; the rest is a plain dim segment.
      return <rect transform={at} x={-arc / 2} y="-6.5" width={arc} height="13" fill={m.filled && i % 2 ? '#fff4d6' : ink} opacity={o} />;
    case 'sparks':
      return (
        <g transform={at} stroke={ink} strokeWidth="2.2" strokeLinecap="round" opacity={o}>
          <line x1="0" y1="-6.5" x2="0" y2="6.5" />
          <line x1="-4.5" y1="-4.5" x2="4.5" y2="4.5" />
        </g>
      );
    case 'digits':
      return (
        <text transform={at} y="4" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="600" fill={ink} opacity={o}>
          {PI_DIGITS[(i + ring * 7) % PI_DIGITS.length]}
        </text>
      );
    case 'candles':
      return (
        <g transform={at} opacity={o}>
          <rect x="-2.2" y="-3" width="4.4" height="10" rx="1.2" fill={ink} />
          {m.filled && <path d="M0 -8.5C1.6 -6.5 1.6 -4.6 0 -4.2C-1.6 -4.6 -1.6 -6.5 0 -8.5Z" fill="#fff4d6" />}
        </g>
      );
    // The marks of a legend or a completed guest: each ring fills mark by mark.
    case 'spots':
      return <circle transform={at} r="4" fill={ink} opacity={o} />;
    case 'rays':
      return <path transform={at} d="M0 -7 L0 7 M-3.5 -3 L0 -7 L3.5 -3" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity={o} />;
    case 'ticks':
      return <line transform={at} x1="0" y1="-6.5" x2="0" y2="6.5" stroke={ink} strokeWidth="2.6" strokeLinecap="round" opacity={o} />;
    case 'leaves':
      return <path transform={at} d="M0 -7.5 Q4.5 0 0 7.5 Q-4.5 0 0 -7.5 Z" fill={ink} opacity={o} />;
    case 'claws':
      return (
        <g transform={at} fill={ink} opacity={o}>
          <circle cy="1.6" r="3" />
          <circle cx="-3.4" cy="-3.2" r="1.4" />
          <circle cy="-4.6" r="1.4" />
          <circle cx="3.4" cy="-3.2" r="1.4" />
        </g>
      );
    case 'waves':
      return <path transform={at} d="M-5 2 Q-2.5 -4 0 0 T5 -2" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" opacity={o} />;
    case 'forks':
      return <path transform={at} d="M0 7 L0 -1 M0 -1 L-4 -7 M0 -1 L4 -7" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity={o} />;
    case 'hen':
      return <path transform={at} d="M0 7 L0 -1 L-4.5 -6 M0 -1 L0 -7 M0 -1 L4.5 -6" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={o} />;
    default:
      return null;
  }
}

/**
 * The three rings for a theme day: the shape or the marks change, the inks, order and fill do
 * not. Each ring shows its true progress, with the unfilled part dimmed. The one exception to the
 * inks is gold: `gold` marks the rings that have earned it, as on a perfect day.
 */
export function ThemedRings({ style, progress, size = 140, label, center, gold }: { style: RingStyle; progress: [number, number, number]; size?: number; label: string; gold?: readonly boolean[]; center?: string }) {
  const content = CONTENT_STYLES.includes(style);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={label} style={{ flexShrink: 0 }}>
      {RADII.map((r, i) => {
        const ink = gold?.[i] ? 'var(--gold)' : RING_INKS[i];
        const p = Math.max(0, Math.min(1, progress[i]));
        if (content) {
          return (
            <g key={r} className={gold?.[i] ? 'lr-gold' : undefined}>
              {contentMarks(i as 0 | 1 | 2, r, p).map((m, k) => (
                <Glyph key={k} style={style} m={m} ink={ink} i={k} ring={i} arc={(2 * Math.PI * r) / MARKS_PER_RING[i] + 0.4} />
              ))}
            </g>
          );
        }
        return (
          <g key={r} className={gold?.[i] ? 'lr-gold' : undefined}>
            <path d={`${shapePath(style, 100, 100, r)}Z`} fill="none" stroke={ink} strokeOpacity={p >= 1 ? 1 : 0.14} strokeWidth="13" strokeLinejoin="round" />
            {gold?.[i] && p >= 1 && <path className="lr-gold-core" d={`${shapePath(style, 100, 100, r)}Z`} fill="none" strokeWidth="3" strokeLinejoin="round" />}
            {p > 0 && p < 1 && <path d={shapePath(style, 100, 100, r, 0, p)} fill="none" stroke={ink} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        );
      })}
      {center && (
        <text x="100" y="110" textAnchor="middle" fill={gold?.every(Boolean) ? 'var(--gold)' : 'var(--text)'} fontFamily="var(--serif)" fontWeight="300" fontSize="30">
          {center}
        </text>
      )}
    </svg>
  );
}
