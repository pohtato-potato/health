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
  monsoon: polar((t) => 40 + 6 * Math.sin(6 * t)), // a raindrop's ring
  matchday: polar(() => 46, 64), // the centre circle
  aurora: polar((t) => 40 + 8 * Math.sin(3 * t)), // a ribbon
  glacier: polar(() => 46, 8), // a cut crystal
  blossom: polar((t) => 34 + 14 * Math.abs(Math.cos(2.5 * t))), // five petals
  reef: polar((t) => 40 + 6 * Math.cos(9 * t)), // a coral
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
  monsoon: ['#5abeaa', '#6cc8ff', '#c2b2ff'],
  matchday: ['#ff7a1a', '#b478ff', '#5fe08a'],
  aurora: ['#5ff0b0', '#8a7dff', '#ff8ad8'],
  glacier: ['#7fd6ff', '#c2a8ff', '#7ff0b0'],
  blossom: ['#ff9cc8', '#9df0c8', '#d9a8ff'],
  reef: ['#ff7f6a', '#42e0d0', '#ffd36b'],
};
