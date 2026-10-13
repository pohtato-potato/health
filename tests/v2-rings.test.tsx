import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemedRings } from '../src/ui/rings/ThemedRings';
import { contentMarks, MARKS_PER_RING, RING_INKS, RING_STYLES, shapeRadius } from '../src/ui/rings/styles';

describe('ring styles for theme days', () => {
  it('every style keeps three rings in metric colours', () => {
    for (const style of RING_STYLES) {
      const html = renderToStaticMarkup(<ThemedRings style={style} progress={[0.5, 0.8, 1]} label="Rings" />);
      for (const ink of RING_INKS) expect(html, `${style} ${ink}`).toContain(ink);
      const colours = [...html.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1]).filter((c) => c !== 'none');
      for (const c of colours) expect([...RING_INKS, 'var(--text)', '#fff4d6', 'var(--ink)'], `${style} uses ${c}`).toContain(c);
    }
  });

  it('progress mapping: filled marks / total = progress ±1 mark', () => {
    for (const ring of [0, 1, 2] as const) {
      for (const p of [0, 0.13, 0.5, 0.77, 1]) {
        const marks = contentMarks(ring, 60, p);
        const filled = marks.filter((m) => m.filled).length;
        expect(Math.abs(filled - p * MARKS_PER_RING[ring])).toBeLessThanOrEqual(1);
      }
    }
  });

  it('shapes stay within 10 % so rings never touch', () => {
    for (const style of RING_STYLES) for (let t = 0; t < Math.PI * 2; t += 0.05) expect(Math.abs(shapeRadius(style, t) - 1), style).toBeLessThanOrEqual(0.1);
  });
});
