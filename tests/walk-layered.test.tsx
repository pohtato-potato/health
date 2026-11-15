import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contrast, REGIONS } from '../src/ui/light';
import { landmarkFor } from '../src/walk/art/landmarks';
import { Layered } from '../src/walk/art/Layered';
import { landInks, LANDS, ROAD, SKY, skylinesFor, todayShare } from '../src/walk/art/land';
import { mixVivid, toOklch } from '../src/walk/art/oklch';
import { festiveSky, wearSky } from '../src/walk/art/festive';

const PARTS = ['dawn', 'day', 'dusk', 'night'] as const;

describe('Walk in layered dusk', () => {
  for (const region of REGIONS)
    for (const part of PARTS)
      it(`draws ${region} at ${part}: sky, three layers, the lit road and the walker`, () => {
        const html = renderToStaticMarkup(<Layered region={region} part={part} todayKm={8} stone />);
        expect(html).not.toMatch(/NaN|undefined|="null"/);
        for (const c of ['ls-far', 'ls-mid', 'ls-road', 'ls-walker', 'ls-stone', 'ls-today']) expect(html).toContain(c);
        expect(html.includes('ls-stars')).toBe(part === 'night');
        expect(html).not.toContain('<text');
      });

  it('gives each kind of land its own outline and trees', () => {
    const outlines = REGIONS.map((r, i) => skylinesFor(r, i + 1).map((s) => s.d).join());
    expect(new Set(outlines).size).toBe(REGIONS.length);
    expect(LANDS.coast.tree).toBe('palm');
    expect(LANDS.himalaya.tree).toBe('conifer');
    expect(renderToStaticMarkup(<Layered region="himalaya" part="day" />)).toContain('#f4f7fc');
  });

  it('keeps every region distinct in colour at every hour', () => {
    for (const part of PARTS) {
      const seen = new Set(REGIONS.map((r) => landInks(r, part).join()));
      expect(seen.size, part).toBe(REGIONS.length);
    }
  });

  it('lets the bands recede: far lightest, near darkest', () => {
    for (const r of REGIONS)
      for (const p of PARTS) {
        const [f, m, n] = landInks(r, p).map((c) => toOklch(c)[0]);
        expect(f, `${r} ${p}`).toBeGreaterThan(m);
        expect(m, `${r} ${p}`).toBeGreaterThan(n);
      }
  });

  it('never mixes the land into a dark brown or olive', () => {
    for (const r of REGIONS)
      for (const p of PARTS)
        for (const c of landInks(r, p)) {
          const [L, C, H] = toOklch(c);
          const muddy = L < 0.6 && C > 0.03 && H >= 40 && H <= 105;
          expect(muddy, `${r} ${p} ${c}`).toBe(false);
        }
    // A jungle green pulled into dusk goes plum, not khaki.
    const [, , h] = toOklch(mixVivid('#7a3f6e', '#86d6a2', 0.46));
    expect(h < 40 || h > 105).toBe(true);
  });

  it('keeps the road legible on the near land at every hour (3:1 or more)', () => {
    for (const r of REGIONS)
      for (const p of PARTS) expect(contrast(ROAD[p], landInks(r, p)[2]), `${r} ${p}`).toBeGreaterThanOrEqual(3);
  });

  it('lights the road green by night and gold the rest of the day', () => {
    expect(ROAD.night).toBe('#8fdcb6');
    expect(ROAD.dusk).toBe('#f2c46d');
  });

  it('brightens more of the road the more you walked today', () => {
    expect(todayShare(0)).toBe(0);
    expect(todayShare(10)).toBeLessThan(todayShare(30));
    expect(todayShare(400)).toBe(1);
    expect(renderToStaticMarkup(<Layered region="plains" part="day" />)).not.toContain('ls-today');
  });

  it('stands the landmark ahead between the far and middle land', () => {
    const html = renderToStaticMarkup(<Layered region="ravines" part="dusk" landmark={landmarkFor('Gwalior')} />);
    expect(html.indexOf('ls-landmark')).toBeGreaterThan(html.indexOf('ls-far'));
    expect(html.indexOf('ls-landmark')).toBeLessThan(html.indexOf('ls-mid'));
  });

  it('wears the theme in the sky', () => {
    wearSky(['#0a1a22', '#2a5a66', '#9be6d0']);
    expect(festiveSky(undefined, SKY.dusk)).not.toEqual(SKY.dusk);
    wearSky(undefined);
    expect(festiveSky(undefined, SKY.dusk)).toEqual(SKY.dusk);
  });

  it('never turns a themed sky olive or brown', () => {
    for (const sky of [['#041018', '#155a4a', '#5ff0b0'], ['#0a1a22', '#2a5a66', '#9be6d0'], ['#1e0d06', '#6a2c0e', '#f5a04a']] as [string, string, string][]) {
      wearSky(sky);
      for (const p of PARTS)
        for (const c of festiveSky(undefined, SKY[p])) {
          const [L, C, H] = toOklch(c);
          expect(L < 0.66 && C > 0.04 && H >= 38 && H <= 108 && sky[2] !== '#f5a04a', `${p} ${c}`).toBe(false);
        }
    }
    wearSky(undefined);
  });

  it('crops to the road for the banner', () => {
    expect(renderToStaticMarkup(<Layered region="coast" part="night" view="band" />)).toContain('viewBox="0 112 360 118"');
  });
});
