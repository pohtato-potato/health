import { useId } from 'react';
import type { RingDesign } from '../../domain/themes';
import { shapePath, type RingStyle } from './styles';
import { RADII, RING_STROKE } from './ThemedRings';

/** The gold every ring turns when all four close. */
export const RING_GOLD = '#ffd257';

const C = 100;
/** How each design patterns its band: width, dash pattern (empty for a solid line) and cap. */
const BAND: Record<RingDesign, { w: number; dash?: string; cap: 'round' | 'butt' }> = {
  solid: { w: RING_STROKE, cap: 'round' },
  halo: { w: 10, cap: 'round' },
  lamps: { w: 9, dash: '0.1 10.5', cap: 'round' },
  thrown: { w: RING_STROKE, cap: 'round' },
  scallop: { w: 10, cap: 'round' },
  crescent: { w: 6, cap: 'round' },
  pixel: { w: RING_STROKE, dash: '7 3', cap: 'butt' },
  reverse: { w: RING_STROKE, cap: 'round' },
  notch: { w: RING_STROKE, dash: '15 2', cap: 'butt' },
  rain: { w: 10, dash: '14 7', cap: 'round' },
  pitch: { w: RING_STROKE, dash: '22 5', cap: 'butt' },
  comet: { w: 10, cap: 'round' },
  kite: { w: 11, cap: 'round' },
  blossom: { w: 10, cap: 'round' },
  ripple: { w: 10, cap: 'round' },
};
/** Designs that bend the band's line: drawn with the shared shape paths. */
const SHAPE: Partial<Record<RingDesign, RingStyle>> = { thrown: 'thrown', scallop: 'scallop', kite: 'kite', blossom: 'blossom', ripple: 'ripple' };

export const bandOf = (d: RingDesign) => BAND[d];

/**
 * The rings, glowing (look pass, rule 9): each band glows in its colour; a closed ring burns at full strength with a
 * bright edge; all four closed turns them gold. The theme's design patterns the band; how full each ring is never
 * changes with it. `shown` is what is drawn now (it animates); `closed` is the truth.
 */
export function GlowRings({ design = 'solid', inks, shown, closed, gold, size = 164, label, small }: {
  design?: RingDesign;
  /** Calories, protein, steps and sleep, outer to inner. */
  inks: readonly string[];
  shown: readonly number[];
  closed: readonly boolean[];
  /** Which rings have turned gold. */
  gold?: readonly boolean[];
  size?: number;
  label?: string;
  /** A small preview (the theme picker): softer glow, no centre. */
  small?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const band = BAND[design];
  const shape = SHAPE[design] ?? 'plain';
  const flip = design === 'reverse' ? `translate(${2 * C} 0) scale(-1 1)` : undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} className="gr" style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <filter id={`${uid}-g`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={small ? 4 : 5.5} />
        </filter>
        <radialGradient id={`${uid}-c`}>
          <stop offset="0" stopColor="#1a1636" />
          <stop offset="1" stopColor="#0b0a1a" stopOpacity="0.9" />
        </radialGradient>
        {RADII.map((r, i) => {
          const p = Math.max(0, Math.min(1, shown[i] ?? 0));
          const c = 2 * Math.PI * r;
          return (
            <mask key={r} id={`${uid}-m${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
              <circle className="gr-reveal" cx={C} cy={C} r={r} fill="none" stroke="#fff" strokeWidth={band.w + 22} strokeLinecap={band.cap === 'butt' ? 'butt' : 'round'} strokeDasharray={`${p * c} ${c + 40}`} transform={`rotate(-90 ${C} ${C})`} opacity={p > 0.002 ? 1 : 0} />
            </mask>
          );
        })}
      </defs>
      {!small && <circle cx={C} cy={C} r={31} fill={`url(#${uid}-c)`} />}
      {RADII.map((r, i) => {
        const p = Math.max(0, Math.min(1, shown[i] ?? 0));
        const isGold = !!gold?.[i];
        const ink = isGold ? RING_GOLD : inks[i];
        const done = !!closed[i] && p >= 0.999;
        const full = `${shapePath(shape, C, C, r)}Z`;
        return (
          <g key={r} className={`gr-band${done ? ' closed' : ''}${isGold ? ' lr-gold' : ''}`} style={{ color: ink }}>
            <path d={full} fill="none" stroke={ink} strokeOpacity={0.16} strokeWidth={band.w} />
            <g transform={flip}>
              <g mask={`url(#${uid}-m${i})`}>
                <path d={full} fill="none" stroke={ink} strokeWidth={band.w + (small ? 4 : 6)} filter={`url(#${uid}-g)`} opacity={done ? 0.95 : 0.6} />
                <path className="gr-line" d={full} fill="none" stroke={ink} strokeWidth={band.w} strokeLinecap={band.cap} strokeLinejoin="round" strokeDasharray={band.dash} />
                {design === 'halo' && <path d={`${shapePath('plain', C, C, r + band.w / 2 + 2.5)}Z`} fill="none" stroke={ink} strokeWidth="1.4" opacity="0.75" />}
              </g>
            </g>
            {design === 'comet' && p > 0.02 && (
              <g className="gr-head" style={{ transform: `rotate(${p * 360}deg)`, transformOrigin: '100px 100px' }}>
                <circle cx={C} cy={C - r} r={band.w * 0.95} fill={ink} filter={`url(#${uid}-g)`} />
                <circle cx={C} cy={C - r} r={band.w * 0.5} fill="#fff" opacity="0.9" />
              </g>
            )}
            {done && <path className="gr-edge" d={full} fill="none" stroke="#fff" strokeWidth="2" opacity={isGold ? 0.75 : 0.55} />}
            {isGold && done && <path className="lr-gold-core" d={full} fill="none" strokeWidth="2.5" />}
          </g>
        );
      })}
    </svg>
  );
}
