import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RouteRun } from '../src/domain/types';
import { CATALOGUE, withCatalogue, type RouteDef } from '../src/walk/catalogue';
import { RouteSheetView, ShelfView } from '../src/screens/walk/Shelf';
import { VISA_MARK_SCALE, VISA_PX, Visa } from '../src/screens/walk/Visa';

const byId = (id: string) => CATALOGUE.find((r) => r.id === id)!;
const kinds: [string, RouteDef][] = [
  ['challenge', byId('dandi')],
  ['expedition', byId('xuanzang')],
  ['book', byId('harold')],
];

describe('the visa', () => {
  for (const [kind, def] of kinds)
    it(`draws the ${kind} visa with its mark at 20–40 px and no text under 14 px`, () => {
      const html = renderToStaticMarkup(<Visa def={def} />);
      const viewW = Number(html.match(/viewBox="0 0 (\d+)/)![1]);
      const px = 24 * VISA_MARK_SCALE * (VISA_PX / viewW);
      expect(px).toBeGreaterThanOrEqual(20);
      expect(px).toBeLessThanOrEqual(40);
      expect(html).toMatch(/class="walk-visa-mark"><path d="M/);
      for (const m of html.matchAll(/font-size="(\d+)"/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(14);
    });

  it('names the expedition on its rim', () => {
    expect(renderToStaticMarkup(<Visa def={byId('xuanzang')} />)).toContain('EXPEDITION VISA');
  });

  it('fits the longest name by shrinking, never cutting it', () => {
    const longest = [...CATALOGUE].sort((a, b) => b.name.length - a.name.length)[0];
    const html = renderToStaticMarkup(<Visa def={longest} />);
    expect(html).toContain(`>${longest.name.toUpperCase().replace(/'/g, '&#x27;')}</text>`);
    expect(html).toMatch(/textLength="\d+"/);
  });

  it('carries a gold exit stamp once finished', () => {
    expect(renderToStaticMarkup(<Visa def={byId('dandi')} stamp="2026-03-14" />)).toMatch(/walk-visa-exit[\s\S]*FINISHED[\s\S]*14 MAR/);
    expect(renderToStaticMarkup(<Visa def={byId('dandi')} />)).not.toContain('FINISHED');
  });
});

const run = (id: string, extra: Partial<RouteRun> = {}): RouteRun => ({ id, spans: [{ from: '2026-03-01' }], ...extra });

describe('the shelf', () => {
  const sheet = (def: RouteDef, runs: RouteRun[], free = { challenge: 2, expedition: 2 }) =>
    renderToStaticMarkup(<RouteSheetView def={def} runs={runs} km={0} free={free} pinned={false} usualKm={7} onJoin={() => {}} onPage={() => {}} onPin={() => {}} />);

  it('offers Join with a place free', () => {
    const html = sheet(byId('dandi'), []);
    expect(html).toContain('>Join this walk<');
    expect(html).toContain('>See its page<');
    expect(html).toContain('>Pin for later<');
  });

  it('offers no Join with both challenge places taken, and says why', () => {
    const html = sheet(byId('dandi'), [run('kos'), run('meerut')], { challenge: 0, expedition: 2 });
    expect(html).not.toContain('>Join this walk<');
    expect(html).toContain('Both challenge places are taken. Set one down to join this.');
  });

  it('says where a joined route stands, in words', () => {
    expect(sheet(byId('dandi'), [run('dandi')])).toContain('Walking');
    expect(sheet(byId('dandi'), [run('dandi', { doneOn: '2026-03-10' })])).toContain('Finished');
  });

  it('keeps a book’s synopsis spoiler-free', () => {
    const h = byId('harold');
    const html = sheet({ ...h, book: { ...h.book!, fullSynopsis: 'THE ENDING GIVEN AWAY' } }, []);
    expect(html).toContain(h.book!.synopsis.slice(0, 30).replace(/'/g, '&#x27;'));
    expect(html).not.toContain('THE ENDING GIVEN AWAY');
  });

  it('lists only ready routes, by group, unless drafts are asked for', () => {
    const ready = { ...byId('dandi'), ready: true };
    const draft = { ...byId('kos'), ready: false };
    withCatalogue([ready, draft], () => {
      const html = renderToStaticMarkup(<ShelfView defs={[ready, draft]} runs={[]} kmById={new Map()} pinned={new Set()} usualKm={7} onOpen={() => {}} onChoose={() => {}} />);
      expect(html).toContain(ready.name);
      expect(html).not.toContain(draft.name);
      expect(html).toContain('>Indian history<');
      const dev = renderToStaticMarkup(<ShelfView defs={[ready, draft]} runs={[]} kmById={new Map()} pinned={new Set()} usualKm={7} onOpen={() => {}} onChoose={() => {}} drafts />);
      expect(dev).toContain('Drafts (not on the shelf)');
      expect(dev).toContain(draft.name);
    });
  });
});
