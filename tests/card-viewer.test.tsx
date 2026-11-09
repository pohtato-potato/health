import './football/helpers/windowStub';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { closeCard, GlassCard, openCard, SimpleBack, Viewable, type CardView } from '../src/ui/CardViewer';
import { PlayerCard, playerBack } from '../src/screens/football/players/Card';
import { albumView } from '../src/screens/football/tree/PackScreens';
import { ALBUM, ALBUM_CARDS } from '../src/football/content/album';

const view: CardView = { face: <GlassCard ink="#ffd56a"><svg /></GlassCard>, back: <SimpleBack kicker="Gold" title="A card" lines={['A fact']} />, label: 'A card' };
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('the card viewer', () => {
  it('a viewable card is a keyboard button that names itself', () => {
    const html = renderToStaticMarkup(<Viewable view={() => view}><span>x</span></Viewable>);
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="A card. Open full screen"');
  });
  it('the store opens and closes', async () => {
    const { useOpenCard } = await import('../src/ui/CardViewer');
    expect(typeof useOpenCard).toBe('function');
    openCard(view);
    closeCard();
  });
  it('a player card opens on a tap unless told not to', () => {
    const p = { name: 'Rest', overall: 71, best: 74, kind: 'habit' as const, versions: [{ tier: 'silver' as const, step: 2, on: '2026-10-01', overall: 66 }] };
    const on = renderToStaticMarkup(<PlayerCard card={{ tier: 'gold', step: 1 }} seed="x" art={undefined!} player={p as never} />);
    expect(on).toContain('role="button"');
    expect(on).toContain('Rest');
    const off = renderToStaticMarkup(<PlayerCard card={{ tier: 'gold', step: 1 }} seed="x" art={undefined!} noView />);
    expect(off).not.toContain('role="button"');
  });
  it('the player back has name, step, rating and history', () => {
    const t = text(renderToStaticMarkup(<>{playerBack({ tier: 'gold', step: 1 }, undefined, { name: 'Rest', overall: 71, best: 74, kind: 'habit', versions: [{ tier: 'silver', step: 2, on: '2026-10-01', overall: 66 }] } as never)}</>));
    expect(t).toContain('Rest');
    expect(t).toContain('71');
    expect(t).toContain('best 74');
    expect(t).toContain('66');
  });
  it('an album card: no words on the face, the fact and set on the back', () => {
    const c = ALBUM_CARDS[0];
    const set = ALBUM.find((s) => s.cards.some((x) => x.id === c.id))!;
    const v = albumView(c, set.title);
    expect(text(renderToStaticMarkup(<>{v.face}</>)).trim()).toBe('');
    const back = text(renderToStaticMarkup(<>{v.back}</>));
    expect(back).toContain(c.title);
    expect(back).toContain(set.title);
    expect(v.label).toContain(c.title);
  });
});
