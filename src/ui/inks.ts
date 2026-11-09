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
