/**
 * Ring styles for theme days. A theme changes a ring's SHAPE or its CONTENT, never its
 * colour, order or how full it is: calories, protein and steps keep their inks on every day.
 */
export const RING_STYLES = ['plain', 'scallop', 'kite', 'lantern', 'thrown', 'blossom', 'ripple', 'stars', 'marigold', 'cane', 'sparks', 'digits', 'candles'] as const;
export type RingStyle = (typeof RING_STYLES)[number];

/** Styles that reshape the ring's outline. */
export const SHAPE_STYLES: RingStyle[] = ['plain', 'scallop', 'kite', 'lantern', 'thrown', 'blossom', 'ripple'];
/** Styles that fill the ring with marks instead of a stroke. */
export const CONTENT_STYLES: RingStyle[] = ['stars', 'marigold', 'cane', 'sparks', 'digits', 'candles'];

/** The fixed metric inks, outer to inner. */
export const RING_INKS = ['var(--kcal)', 'var(--protein)', 'var(--steps)'] as const;

/**
 * Radius multiplier around the ring at angle theta (radians, 0 at the top): 1 is a circle.
 * Each shape keeps within ±10 % so the three rings never touch.
 */
export function shapeRadius(style: RingStyle, theta: number): number {
  switch (style) {
    case 'scallop':
      return 1 + 0.05 * Math.abs(Math.sin(theta * 6));
    case 'kite': {
      // A rounded diamond: closer at the sides, further at top and bottom.
      const c = Math.abs(Math.cos(theta));
      const s = Math.abs(Math.sin(theta));
      return 1.04 / Math.max(0.85, Math.pow(Math.pow(c, 1.6) + Math.pow(s, 1.6), 1 / 1.6));
    }
    case 'lantern':
      return 1 + 0.06 * Math.cos(theta * 2) * (Math.cos(theta) > 0 ? 0.6 : 1);
    case 'thrown':
      return 1 + 0.035 * Math.sin(theta * 3) + 0.025 * Math.sin(theta * 7 + 1.3);
    case 'blossom':
      return 1 + 0.07 * Math.pow(Math.abs(Math.cos(theta * 2.5)), 3);
    case 'ripple':
      return 1 + 0.03 * Math.sin(theta * 14);
    default:
      return 1;
  }
}

/** A closed path for a shaped ring of base radius r around (cx, cy), sampled finely. */
export function shapePath(style: RingStyle, cx: number, cy: number, r: number, from = 0, to = 1, steps = 180): string {
  const n = Math.max(2, Math.round(steps * (to - from)));
  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    const theta = t * Math.PI * 2;
    const rr = r * shapeRadius(style, theta);
    const x = cx + rr * Math.sin(theta);
    const y = cy - rr * Math.cos(theta);
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

export interface Mark {
  x: number;
  y: number;
  angle: number;
  filled: boolean;
}

/** How many marks go round each ring, outer to inner, for the content styles. */
export const MARKS_PER_RING = [30, 24, 18];

/**
 * The marks that make up a content-styled ring, in order from the top clockwise. The first
 * round(progress × total) are filled; the rest are dimmed.
 */
export function contentMarks(ring: 0 | 1 | 2, r: number, progress: number, cx = 100, cy = 100): Mark[] {
  const total = MARKS_PER_RING[ring];
  const filled = Math.round(Math.max(0, Math.min(1, progress)) * total);
  return Array.from({ length: total }, (_, i) => {
    const a = (i / total) * Math.PI * 2;
    return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a), angle: (a * 180) / Math.PI, filled: i < filled };
  });
}
