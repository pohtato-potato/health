import { describe, expect, it } from 'vitest';
import { CATALOGUE, kindOf, routeById, shelfRoutes } from '../src/walk/catalogue';
import { ROUTE_LINES } from '../src/walk/geo';

/** Gold is kept for what was earned (the app's --gold is #f2c46d, hue 39°): a warm, saturated hue from 30° to 55°. */
function goldish(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  const h = max === min ? 0 : max === r ? (60 * ((g - b) / (max - min)) + 360) % 360 : max === g ? 60 * ((b - r) / (max - min)) + 120 : 60 * ((r - g) / (max - min)) + 240;
  return h >= 30 && h <= 55 && s >= 0.35 && l >= 0.35 && l <= 0.9;
}

for (const r of CATALOGUE)
  describe(r.id, () => {
    it('has a line', () => expect(ROUTE_LINES[r.id]?.line.length).toBeGreaterThanOrEqual(2));
    it('keeps places in order and within its length', () => {
      r.places.forEach((p, i) => {
        expect(p.km, p.name).toBeGreaterThanOrEqual(0);
        expect(p.km, p.name).toBeLessThanOrEqual(r.km);
        if (i) expect(p.km, p.name).toBeGreaterThan(r.places[i - 1].km);
        expect(p.at, p.name).toBeLessThan(ROUTE_LINES[r.id].line.length);
      });
    });
    it('is never gold', () => {
      expect(r.ink).toMatch(/^#[0-9a-f]{6}$/i);
      expect(goldish(r.ink), r.ink).toBe(false);
    });
    it('says nothing of then-and-you without a record', () => {
      if (r.record === 'none') expect(r.then).toBeUndefined();
    });
    it('sorts its pages by km', () => r.pages.forEach((p, i) => i && expect(p.km).toBeGreaterThanOrEqual(r.pages[i - 1].km)));
    it('has a book only when it is in the books group', () => expect(!!r.book).toBe(r.group === 'books'));
    it('keeps its signature marks in order and within its length', () => {
      r.signature?.marks.forEach((m, i) => {
        expect(m.km).toBeGreaterThan(0);
        expect(m.km).toBeLessThanOrEqual(r.km);
        if (i) expect(m.km).toBeGreaterThan(r.signature!.marks[i - 1].km);
      });
    });
    if (r.ready)
      it('is written and sourced before it reaches the shelf', () => {
        expect(r.sources.length).toBeGreaterThan(0);
        expect(r.pages.length).toBeGreaterThan(0);
        if (r.book) expect(r.book.fullSynopsis).not.toBe('');
      });
  });

describe('the catalogue', () => {
  it('knows gold when it sees it', () => {
    expect(goldish('#f2c46d')).toBe(true);
    expect(goldish('#e6c28a')).toBe(true);
    expect(goldish('#9fd3e6')).toBe(false);
  });
  it('ids are unique', () => expect(new Set(CATALOGUE.map((r) => r.id)).size).toBe(CATALOGUE.length));
  it('finds a route by id', () => {
    expect(routeById('dandi')?.name).toBe('The Dandi March');
    expect(routeById('nowhere')).toBeUndefined();
  });
  it('1,500 km is a challenge, 1,501 an expedition', () => {
    expect(kindOf({ ...CATALOGUE[0], km: 1500 })).toBe('challenge');
    expect(kindOf({ ...CATALOGUE[0], km: 1501 })).toBe('expedition');
  });
  it('shows only ready routes on the shelf', () => expect(shelfRoutes().every((r) => r.ready)).toBe(true));
});
