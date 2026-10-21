import type { ThemeId } from './themes';

const polar = (r: (t: number) => number, n = 120) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return `${i ? 'L' : 'M'}${(r(t) * Math.cos(t)).toFixed(1)},${(r(t) * Math.sin(t)).toFixed(1)}`;
  }).join(' ') + 'Z';

const star = (points: number, outer: number, inner: number) =>
  Array.from({ length: points * 2 }, (_, i) => {
    const t = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? inner : outer;
    return `${i ? 'L' : 'M'}${(r * Math.cos(t)).toFixed(1)},${(r * Math.sin(t)).toFixed(1)}`;
  }).join(' ') + 'Z';

/** The shape a tap ripples out in, per theme, in a −50…50 box. */
export const RIPPLE: Record<ThemeId, string> = {
  dusk: polar(() => 46),
  diwali: polar((t) => 38 + 9 * Math.cos(8 * t)), // a marigold
  holi: polar((t) => 38 + 7 * Math.sin(5 * t) + 4 * Math.sin(3 * t + 1)), // a powder splash
  birthday: star(5, 48, 22),
  sunrise: star(12, 48, 38), // a sun
  moonlight: star(4, 48, 14), // a sparkle
  retro: 'M-40,-40 L40,-40 L40,40 L-40,40 Z', // a pixel
  antimatter: polar(() => 46, 6), // a hexagon
  platinum: star(4, 48, 30), // a cut stone
};

/** The three ring colours per theme, for the rest ring and the recap rings: always three different hues. */
export const RINGS: Record<ThemeId, [string, string, string]> = {
  dusk: ['#b7a6f0', '#6fe0b0', '#ff9f80'],
  diwali: ['#ffd23d', '#ff6b3d', '#e0479e'],
  holi: ['#ff5c9e', '#3fd68f', '#5c9dff'],
  birthday: ['#f7c96b', '#d6a8ff', '#ff8fb8'],
  sunrise: ['#ffd166', '#ff7a59', '#c44dff'],
  moonlight: ['#d9e4f2', '#8fe0d0', '#a58cf0'],
  retro: ['#6ff07a', '#f6d743', '#ff5f5f'],
  antimatter: ['#4ff5e6', '#ff5fd2', '#b7ff5f'],
  platinum: ['#dde8f2', '#f2c8a0', '#c9a7e8'],
};
