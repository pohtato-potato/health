import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DayKey } from '../src/domain/dates';
import type { RouteRun } from '../src/domain/types';
import { CATALOGUE, type RouteDef } from '../src/walk/catalogue';
import { NotOnShelf, RoutePageView } from '../src/screens/walk/RoutePage';

const byId = (id: string) => CATALOGUE.find((r) => r.id === id)!;
const run = (id: string, extra: Partial<RouteRun> = {}): RouteRun => ({ id, spans: [{ from: '2026-03-01' }], ...extra });
const none = () => {};
const view = (def: RouteDef, r: RouteRun | undefined, km: number, steps = new Map<DayKey, number>()) =>
  renderToStaticMarkup(<RoutePageView def={def} run={r} km={km} steps={steps} usualKm={7.4} today="2026-03-20" free={{ challenge: 2, expedition: 2 }} onJoin={none} onDown={none} onUp={none} onPause={none} onResume={none} onTarget={none} onBack={none} />);

const book: RouteDef = {
  ...byId('harold'),
  book: { by: 'Rachel Joyce', synopsis: 'No spoilers here.', fullSynopsis: 'THE ENDING GIVEN AWAY', chapters: [{ km: 5, text: 'Chapter one, in our words.' }, { km: 50, text: 'Chapter two, in our words.' }] },
};

describe('the route page', () => {
  it('heads with its kind, era, name, ends and kind of record', () => {
    const html = view(byId('xuanzang'), run('xuanzang'), 1234);
    expect(html).toContain('Expedition · 629–645');
    expect(html).toContain('Xuanzang&#x27;s road');
    expect(html).toContain('Chang&#x27;an to Nalanda and home · Recorded place by place');
    expect(html).toContain('of about 17,000 km · 7%');
    expect(html).toContain('The road out');
    expect(html).toContain('The road home');
  });

  it('shows then and you only where a record exists', () => {
    expect(view(byId('xuanzang'), run('xuanzang'), 1234)).toContain('Then and you');
    const noRecord = { ...byId('dandi'), record: 'none' as const, then: undefined, years: undefined };
    expect(view(noRecord, run('dandi'), 10)).not.toContain('Then and you');
  });

  it('shows today’s page, the collection with names reached, and the chronicle', () => {
    const html = view(byId('xuanzang'), run('xuanzang'), 2600);
    expect(html).toContain('The king of Gaochang');
    expect(html).toContain('The kingdoms of the Records');
    expect(html).toContain('Gaochang: collected');
    expect(html).toContain('The chronicle');
  });

  it('keeps the full synopsis out of the page until the route is finished', () => {
    expect(view(book, run('harold'), 20)).not.toContain('THE ENDING GIVEN AWAY');
    expect(view(book, run('harold'), 20)).toContain('Full synopsis · spoilers');
    expect(view(book, run('harold', { doneOn: '2026-03-19' }), book.km)).toContain('THE ENDING GIVEN AWAY');
  });

  it('with the story paused, offers Resume and no chapter past the pause', () => {
    const html = view(book, run('harold', { storyPauseKm: 10 }), 80);
    expect(html).toContain('>Resume the story<');
    expect(html).not.toContain('Pause the story here');
    expect(html).not.toContain('Chapter two, in our words.');
    expect(html).toContain('1 chapter waiting');
    const on = view(book, run('harold'), 80);
    expect(on).toContain('Pause the story here');
    expect(on).toContain('Chapter two, in our words.');
  });

  it('aims for a target date, never says behind, and drops a missed one quietly', () => {
    expect(view(byId('dandi'), run('dandi', { target: '2026-04-14' }), 10)).toContain('aiming for 14 April');
    const missed = view(byId('dandi'), run('dandi', { target: '2026-03-10' }), 10);
    expect(missed).not.toContain('aiming for');
    expect(missed).not.toMatch(/behind/i);
  });

  it('sets a walking route down, and picks a set-down one up', () => {
    expect(view(byId('dandi'), run('dandi'), 10)).toContain('>Set it down<');
    expect(view(byId('dandi'), run('dandi', { spans: [{ from: '2026-03-01', to: '2026-03-05' }] }), 10)).toContain('>Pick it up<');
    expect(view(byId('dandi'), undefined, 0)).toContain('>Join this walk<');
  });

  it('says plainly when a route is not on the shelf', () => {
    expect(renderToStaticMarkup(<NotOnShelf onShelf={none} />)).toContain('This route isn’t on the shelf');
  });
});

describe('the route map’s names', async () => {
  const { RouteMap } = await import('../src/walk/ui/RouteMap');
  it('keeps names from piling up: the ends and the turn always, others where there’s room', () => {
    const html = renderToStaticMarkup(<RouteMap id="xuanzang" km={0} width={328} />);
    const names = [...html.matchAll(/class="walk-map-name"[^>]*>([^<]+)</g)].map((m) => m[1]);
    const labelled = byId('xuanzang').places.filter((p) => p.label).length;
    expect(names).toEqual(expect.arrayContaining(['Chang&#x27;an', 'Nalanda']));
    expect(names.length).toBeLessThan(labelled);
    expect(html.match(/class="walk-map-place"/g)?.length).toBe(labelled);
  });
});

describe('the places list', () => {
  it('shows the places around you, with the rest a tap away', () => {
    const html = view(byId('xuanzang'), run('xuanzang'), 5200);
    const shown = html.match(/<ol class="walk-halts">([\s\S]*?)<\/ol>/)![1].match(/<li/g)!.length;
    expect(shown).toBeLessThanOrEqual(9);
    expect(html).toContain(`>Show all ${byId('xuanzang').places.length} places<`);
    expect(html).toContain('>Samarkand<');
    expect(html).toContain('Next · ');
  });
});
