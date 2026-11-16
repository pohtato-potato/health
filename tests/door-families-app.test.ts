// Ledger O40, the other tabs: door colours by kind of place on Today, Train, Walk and You. Every word on a family door
// keeps 4.5:1 or more, high contrast on or off; family headings and the header's small line keep 4.5:1 on every
// theme's page light. Worked out from the same mixes kit.css draws with.
import { describe, expect, it } from 'vitest';
import { THEMES } from '../src/domain/themes';
import { APP_FAMILY_ORDER, FAMILIES, FAMILY_ORDER, type Family } from '../src/ui/kit/families';

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const rgba = (s: string): [Rgb, number] => {
  const [r, g, b, a] = s.replace(/rgba?\(|\)/g, '').split(',').map(Number);
  return [[r, g, b], a];
};
/** color-mix(in srgb, a p%, b). */
const mix = (a: Rgb, p: number, b: Rgb): Rgb => a.map((x, i) => x * p + b[i] * (1 - p)) as Rgb;
const lum = (c: Rgb) => {
  const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: Rgb, b: Rgb) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const CREAM = hex('#ede6da'), QUIET = hex('#c4c1cf'), CHIP = hex('#10121f');
const DARK = hex('#141730'), LOCKED = hex('#12142a'), CONTRAST = hex('#0b0c1a');
/** The lightest part of a family door's fill; Settings and upkeep has no wash, only the dark. */
const fill = (f: Family) => (f === 'upkeep' ? DARK : mix(hex(FAMILIES[f].ink), 0.2, DARK));
/** A theme's page light where headings sit: its ground, lit by the brighter corner's glow at half strength. */
const pages = THEMES.map((t) => {
  const ground = hex(t.look.light.ground);
  const glows = [t.look.light.warm, t.look.light.cool].map((s) => { const [c, a] = rgba(s); return mix(c, a / 2, ground); });
  return { id: t.id, page: glows.sort((x, y) => lum(y) - lum(x))[0] };
});

describe('door families outside Football (O40)', () => {
  it('seven families in a fixed order, each with its own icon, none sharing a name or icon with Football', () => {
    expect(APP_FAMILY_ORDER).toEqual(['food', 'training', 'walk', 'back', 'earned', 'body', 'upkeep']);
    const all = [...FAMILY_ORDER, ...APP_FAMILY_ORDER];
    expect(new Set(all.map((f) => FAMILIES[f].icon)).size).toBe(all.length);
    expect(new Set(all.map((f) => FAMILIES[f].name)).size).toBe(all.length);
    expect(new Set(APP_FAMILY_ORDER.map((f) => FAMILIES[f].ink)).size).toBe(APP_FAMILY_ORDER.length);
  });

  it('metric doors wear their metric colour', () => {
    expect(FAMILIES.food.ink).toBe('#e98a5b');
    expect(FAMILIES.training.ink).toBe('#ff9a76');
    expect(FAMILIES.walk.ink).toBe('#8fdcb6');
    expect(FAMILIES.earned.ink).toBe('#f2c46d');
  });

  for (const f of [...FAMILY_ORDER, ...APP_FAMILY_ORDER]) {
    const ink = hex(FAMILIES[f].ink);
    it(`${FAMILIES[f].name}: every word on the door keeps 4.5:1, high contrast on or off`, () => {
      expect(ratio(ink, fill(f))).toBeGreaterThanOrEqual(4.5); // the door's name
      expect(ratio(CREAM, fill(f))).toBeGreaterThanOrEqual(4.5); // its value
      expect(ratio(mix(ink, 0.22, hex('#e4e0ee')), fill(f))).toBeGreaterThanOrEqual(4.5); // a line door's line
      expect(ratio(CHIP, ink)).toBeGreaterThanOrEqual(4.5); // the count chip
      expect(ratio(QUIET, LOCKED)).toBeGreaterThanOrEqual(4.5); // a locked door's why
      expect(ratio(mix(ink, 0.75, QUIET), LOCKED)).toBeGreaterThanOrEqual(4.5); // a locked door's name
      expect(ratio(ink, CONTRAST)).toBeGreaterThanOrEqual(7); // high contrast on
      expect(ratio(CREAM, CONTRAST)).toBeGreaterThanOrEqual(7);
    });
    it(`${FAMILIES[f].name}: its heading and the header's small line keep 4.5:1 on every theme`, () => {
      for (const p of pages) expect([p.id, ratio(ink, p.page) >= 4.5]).toEqual([p.id, true]);
    });
  }
});
