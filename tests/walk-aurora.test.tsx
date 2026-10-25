import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/ui/light';
import { auroraFor, auroraForInk } from '../src/walk/page';
import { WalkFrame } from '../src/screens/walk/WalkFrame';
import { CATALOGUE } from '../src/walk/catalogue';
import { goldish } from './helpers/goldish';

/** HSL of a #rrggbb colour. */
function hsl(c: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

describe('the aurora’s colours', () => {
  it('uses the approved plum for the ravines, sea blue for the coast and green for the ghats', () => {
    expect(auroraFor('ravines')['--lv-a']).toBe('#4a2a4f');
    expect(auroraFor('coast')['--lv-a']).toBe('#263d63');
    expect(auroraFor('ghats')['--lv-a']).toBe('#2f4a4a');
  });

  for (const r of REGIONS)
    it(`keeps ${r} in its hue: never muddy, never gold`, () => {
      const t = auroraFor(r);
      const [h, s, l] = hsl(t['--lv-a']);
      expect(s, `${r} saturation`).toBeGreaterThanOrEqual(0.2);
      expect(l).toBeGreaterThanOrEqual(0.15);
      expect(l).toBeLessThanOrEqual(0.35);
      // Brown is a low-saturation orange: the muddy look the approved board turned down.
      expect(h >= 15 && h <= 60 && s < 0.45, `${r} is brown`).toBe(false);
      expect(goldish(t['--lv-a'])).toBe(false);
      expect(goldish(t['--lv-accent'])).toBe(false);
      expect(t['--lv-b']).toBe('#0c0e1d');
    });

  it('tints a route’s pages from its own ink, deep and in its hue', () => {
    for (const def of CATALOGUE) {
      const t = auroraForInk(def.ink);
      const [h, sat, l] = hsl(t['--lv-a']);
      const [inkH] = hsl(def.ink);
      expect(l, def.id).toBeLessThanOrEqual(0.35);
      expect(l, def.id).toBeGreaterThanOrEqual(0.15);
      // Pale inks sunk into the night go grey; the board's route pages kept their colour (Dandi's sea, #263d63).
      expect(sat, def.id).toBeGreaterThanOrEqual(0.3);
      expect(Math.min(Math.abs(h - inkH), 360 - Math.abs(h - inkH)), def.id).toBeLessThan(12);
      expect(t['--lv-accent']).toBe(def.ink);
    }
  });
});

describe('the Walk frame', () => {
  it('puts the moving aurora and the tint behind any Walk page', () => {
    const html = renderToStaticMarkup(
      <WalkFrame tint={auroraFor('coast')} className="x">
        <h1>Hi</h1>
      </WalkFrame>,
    );
    expect(html).toMatch(/class="page lv lv-tab walk3 x"/);
    expect(html).toContain('--lv-a:#263d63');
    expect(html).toContain('class="blob b1"');
    expect(html).toContain('<h1>Hi</h1>');
  });
});
