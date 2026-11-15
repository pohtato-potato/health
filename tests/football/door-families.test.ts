// Ledger O40: door colours by kind of place. Every word on a family door keeps 4.5:1 or more, high contrast on or
// off, worked out from the same mixes kit.css draws with.
import { describe, expect, it } from 'vitest';
import { FAMILIES, FAMILY_ORDER } from '../../src/ui/kit/families';

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
/** color-mix(in srgb, a p%, b). */
const mix = (a: Rgb, p: number, b: Rgb): Rgb => a.map((x, i) => x * p + b[i] * (1 - p)) as Rgb;
const lum = (c: Rgb) => {
  const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: Rgb, b: Rgb) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const CREAM = hex('#ede6da'), QUIET = hex('#c4c1cf'), CHIP = hex('#10121f');
/** The lightest part of a family door's fill, and a lighter-than-real page behind the headings. */
const fill = (ink: Rgb) => mix(ink, 0.2, hex('#141730'));
const PAGE = hex('#1c1f3a'), LOCKED = hex('#12142a'), CONTRAST = hex('#0b0c1a');

describe('door families (O40)', () => {
  it('six families in a fixed order, each with its own colour and icon', () => {
    expect(FAMILY_ORDER).toEqual(['people', 'place', 'money', 'plans', 'world', 'record']);
    expect(new Set(FAMILY_ORDER.map((f) => FAMILIES[f].ink)).size).toBe(6);
    expect(new Set(FAMILY_ORDER.map((f) => FAMILIES[f].icon)).size).toBe(6);
  });
  for (const f of FAMILY_ORDER) {
    const ink = hex(FAMILIES[f].ink);
    it(`${FAMILIES[f].name}: every word keeps 4.5:1`, () => {
      expect(ratio(ink, fill(ink))).toBeGreaterThanOrEqual(4.5); // the door's name
      expect(ratio(CREAM, fill(ink))).toBeGreaterThanOrEqual(4.5); // its value
      expect(ratio(CHIP, ink)).toBeGreaterThanOrEqual(4.5); // the count chip
      expect(ratio(ink, PAGE)).toBeGreaterThanOrEqual(4.5); // the family heading and the header's small line
      expect(ratio(QUIET, LOCKED)).toBeGreaterThanOrEqual(4.5); // a locked door's why
      expect(ratio(mix(ink, 0.75, QUIET), LOCKED)).toBeGreaterThanOrEqual(4.5); // a locked door's name
      expect(ratio(ink, CONTRAST)).toBeGreaterThanOrEqual(7); // high contrast on
      expect(ratio(CREAM, CONTRAST)).toBeGreaterThanOrEqual(7);
    });
  }
});
