import { describe, expect, it } from 'vitest';
import { RINGS, RIPPLE } from '../src/domain/liveLook';
import { THEMES } from '../src/domain/themes';

function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

describe('the living look per theme', () => {
  for (const t of THEMES) {
    it(`${t.id} has a closed ripple shape`, () => {
      expect(RIPPLE[t.id]).toMatch(/^M.*Z$/);
    });
    it(`${t.id} has three clearly different ring colours`, () => {
      const [a, b, c] = RINGS[t.id].map(hue);
      expect(Math.min(apart(a, b), apart(b, c), apart(a, c))).toBeGreaterThanOrEqual(30);
    });
  }
});
