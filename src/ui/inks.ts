// One colour language (pages rounds 2–5): each axis has its own ink wherever its word appears, and every number on a
// 1–20 or 0–100 scale wears the five-step value scale. Colour is always a second cue beside the number or word.
import type { Axis } from '../football/types';

export const AXIS_INK: Record<Axis, string> = {
  Pace: '#8fdcb6',
  Power: '#ff9a76',
  Fuel: '#c2b2ff',
  Rest: '#93c3dc',
  Routine: '#f4aedb',
  Shape: '#d9e8f3',
};

export type ValueTier = 'v5' | 'v4' | 'v3' | 'v2' | 'v1';

/** The five steps: 19–20 gold, 15–18 green, 11–14 blue, 6–10 coral, 1–5 slate (out of 100: 90 / 70 / 55 / 30). */
export function valueTier(v: number, top: 20 | 100 = 20): ValueTier {
  if (top === 100) return v >= 90 ? 'v5' : v >= 70 ? 'v4' : v >= 55 ? 'v3' : v >= 30 ? 'v2' : 'v1';
  return v >= 19 ? 'v5' : v >= 15 ? 'v4' : v >= 11 ? 'v3' : v >= 6 ? 'v2' : 'v1';
}

export const VALUE_INK: Record<ValueTier, string> = { v5: '#ffd56a', v4: '#3fd98a', v3: '#7fb8ff', v2: '#ff9270', v1: '#aab5cf' };

/** Club colours are often dark; on a dark page each needs to read as text and as a bar. */
export function brighten(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.55) {
    const k = (0.62 - lum) / (1 - lum);
    [r, g, b] = [r, g, b].map((c) => Math.round(c + (255 - c) * k));
  }
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function hueSat(hex: string): [number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return [0, 0];
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, d / (1 - Math.abs(max + min - 1))];
}

/** Brabo's own colour on the chance bar: the orange of the home shirt, light enough to read. */
export const BRABO_INK = '#ff9a4d';
/**
 * The opponent's colour beside Brabo's (the chance bar's loss part, O41): its first club colour that is neither
 * grey nor close to Brabo's orange, brightened to read on the dark page; a plain blue when it has none.
 */
export function rivalInk(colours: string[] | undefined): string {
  const [oh] = hueSat(BRABO_INK);
  for (const c of colours ?? []) {
    if (!/^#?[0-9a-f]{6}$/i.test(c)) continue;
    const ink = brighten(c.startsWith('#') ? c : `#${c}`);
    const [h, s] = hueSat(ink);
    const gap = Math.min(Math.abs(h - oh), 360 - Math.abs(h - oh));
    if (s > 0.25 && gap > 35) return ink;
  }
  return '#93c3dc';
}
