import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { regionAt } from '../src/domain/regions';
import { RegionFrameView } from '../src/ui/live/RegionFrame';
import { auroraFor } from '../src/walk/page';
import { grepSrc } from './helpers/grepSrc';

describe('RegionFrame: a page Today opens sits on the region aurora', () => {
  it('draws the aurora tinted by where the walk is, behind the page', () => {
    const html = renderToStaticMarkup(
      <RegionFrameView km={300} className="bare">
        <p>Body</p>
      </RegionFrameView>,
    );
    expect(html).toContain('class="lv rg-ground"');
    expect(html).toContain(`--lv-a:${auroraFor(regionAt(300))['--lv-a']}`);
    expect(html).toContain('lv-field');
    expect(html).toMatch(/<div class="page rg-page bare"><p>Body<\/p><\/div>/);
  });
  it('keeps the page where it is before the steps load (night ground, no tint yet)', () => {
    const html = renderToStaticMarkup(<RegionFrameView km={undefined}>x</RegionFrameView>);
    expect(html).toContain('class="lv rg-ground"');
    expect(html).not.toContain('--lv-a');
    expect(html).toContain('class="page rg-page"');
  });
  it('passes the page its own style', () => {
    expect(renderToStaticMarkup(<RegionFrameView km={0} style={{ gap: 14 }}>x</RegionFrameView>)).toContain('class="page rg-page" style="gap:14px"');
  });
});

describe('the pages Today opens opt in, with no list of paths', () => {
  const PAGES = ['src/screens/FoodToday.tsx', 'src/screens/CloseDay.tsx', 'src/screens/Readiness.tsx', 'src/screens/Week.tsx', 'src/screens/CheckIn.tsx'];
  it.each(PAGES)('%s uses RegionFrame', (f) => expect(readFileSync(f, 'utf8')).toMatch(/<RegionFrame\b/));
  it('the prototype path list is gone', () => expect(grepSrc(/REGION_PAGES/)).toEqual([]));
  it('the weekly receipt stays paper, off the aurora', () => {
    const week = readFileSync('src/screens/Week.tsx', 'utf8');
    const receipt = week.slice(week.indexOf('export function ReceiptPage'));
    expect(receipt).not.toMatch(/<RegionFrame\b/);
  });
});

describe('sheets: a solid tint of the land, glass inside', () => {
  const css = readFileSync('src/styles/region.css', 'utf8');
  const sheetRule = css.match(/\n\.sheet \{ (background:[^}]*)\}/)?.[1] ?? '';
  it('the sheet itself is solid, never see-through: a third of the region into the night', () => {
    expect(sheetRule).toMatch(/background: color-mix\(in srgb, var\(--region-a\) 34%, #0c0e1d\)/);
    expect(sheetRule).not.toMatch(/transparent/);
  });
  it('cards, tiles, wells and rules inside sheets and region pages are the Walk glass and its edge', () => {
    const scoped = css.match(/\.rg-page,\n\.sheet \{([^}]*)\}/)?.[1] ?? '';
    for (const v of ['--surface: var(--glass)', '--raised: var(--glass)', '--hairline: var(--glass-edge)', '--divider: var(--glass-edge)']) expect(scoped).toContain(v);
    expect(css).toMatch(/--glass: color-mix\(in srgb, #0c0e1d 50%, transparent\)/);
    expect(css).toMatch(/--glass-edge: color-mix\(in srgb, var\(--text\) 18%, transparent\)/);
  });
  it('leaves the live session its full state colours: nothing here touches st-* or a session frame', () => {
    expect(css).not.toMatch(/\.st-|\.lc\b/);
  });
  it('new class names are prefixed, so no global class restyles them', () => {
    expect(css).not.toMatch(/\.(sky|glow|band|region)\b/);
  });
});
