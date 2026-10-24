import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MARKS } from '../src/walk/catalogue';
import { MarkShape, markPath } from '../src/walk/ui/MarkShape';
import { RouteArt } from '../src/walk/ui/RouteArt';
import { RouteMap } from '../src/walk/ui/RouteMap';

const fontSizes = (html: string) => [...html.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));

describe('marks', () => {
  it('draws every mark without a nested svg inside markPath', () => {
    for (const m of MARKS) {
      const html = renderToStaticMarkup(<svg>{markPath(m)}</svg>);
      expect(html.match(/<svg/g), m).toHaveLength(1);
      expect(html, m).toMatch(/<(path|circle|rect)/);
    }
  });
  it('draws a mark in its own svg, hidden from screen readers', () => {
    expect(renderToStaticMarkup(<MarkShape mark="crystal" />)).toMatch(/^<svg[^>]*viewBox="0 0 24 24"[^>]*aria-hidden="true"/);
  });
});

describe('the map card', () => {
  it('labels the card with the route and draws the walked part', () => {
    const html = renderToStaticMarkup(<RouteArt id="dandi" km={100} label="The Dandi March on its map" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="The Dandi March on its map"');
    expect(html).toContain('walk-art-walked');
  });
  it('says how far in words when no label is given', () => {
    expect(renderToStaticMarkup(<RouteArt id="dandi" km={100} />)).toContain('aria-label="The Dandi March: 100 of 387 km walked"');
  });
  it('draws the walked part as one line from the start that ends at your dot, with no dash tricks', () => {
    for (const id of ['deccan', 'xuanzang', 'meerut']) {
      const html = renderToStaticMarkup(<RouteArt id={id} km={id === 'xuanzang' ? 6000 : 300} />);
      const d = html.match(/class="walk-art-walked" d="([^"]+)"/)![1];
      const nums = d.match(/-?[\d.]+/g)!.map(Number);
      const [lx, ly] = nums.slice(-2);
      const you = html.match(/class="walk-you" cx="([^"]+)" cy="([^"]+)"/)!;
      expect(lx, id).toBeCloseTo(Number(you[1]), 3);
      expect(ly, id).toBeCloseTo(Number(you[2]), 3);
      expect(html.match(/class="walk-art-walked"[^>]*>/)![0], id).not.toContain('dasharray');
    }
  });
  it('writes a round trip’s far end at its turn, not on top of its start', () => {
    const html = renderToStaticMarkup(<RouteArt id="xuanzang" km={100} />);
    const at = [...html.matchAll(/<g transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.e-]+)\)"><text[^>]*>([^<]+)</g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]), unit: 1 / Number(m[3]), name: m[4].replace(/&#x27;/g, "'") }));
    const [a, b] = at;
    expect(a.name).toBe("Chang'an");
    expect(b.name).toBe('Nalanda');
    expect(Math.hypot(a.x - b.x, a.y - b.y) * a.unit).toBeGreaterThan(40);
  });
  it('draws no walked part at 0 km', () => {
    expect(renderToStaticMarkup(<RouteArt id="dandi" km={0} />)).not.toContain('walk-art-walked');
  });
  it('writes the end names at 14 px or more, and none on a thumbnail', () => {
    expect(fontSizes(renderToStaticMarkup(<RouteArt id="tokaido" km={50} />)).every((s) => s >= 14)).toBe(true);
    expect(fontSizes(renderToStaticMarkup(<RouteArt id="tokaido" km={50} />)).length).toBeGreaterThan(0);
    expect(renderToStaticMarkup(<RouteArt id="tokaido" km={50} kind="thumb" />)).not.toContain('<text');
  });
});

describe('the route map', () => {
  it('draws one land, not two', () => {
    expect(renderToStaticMarkup(<RouteMap id="xuanzang" km={2610} />).match(/class="walk-land"/g)).toHaveLength(1);
  });
  it('writes place names at 14 px or more', () => {
    const sizes = fontSizes(renderToStaticMarkup(<RouteMap id="xuanzang" km={2610} />));
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(14);
  });
  it('draws the road home differently after the turn', () => {
    expect(renderToStaticMarkup(<RouteMap id="xuanzang" km={2610} />)).toContain('walk-map-home');
    expect(renderToStaticMarkup(<RouteMap id="dandi" km={10} />)).not.toContain('walk-map-home');
  });
});
