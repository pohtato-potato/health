import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NewsBannerView, readKeys } from '../src/screens/walk/NewsBanner';
import type { NewsBannerData } from '../src/walk/news';

const one: NewsBannerData = { title: 'Expedition · Xuanzang’s road', text: 'A pious king wants to keep him.', action: 'Read what happened', items: [{ key: 'walk-news:xuanzang:2490', what: 'A pious king wants to keep him.', open: '/route?id=xuanzang', routeId: 'xuanzang', kind: 'expedition' }] };
const two: NewsBannerData = {
  title: '2 things happened on the road',
  text: 'Xuanzang’s road and The walk',
  action: 'See both',
  items: [...one.items, { key: 'walk-later:2026-03-02:/arrive?c=Agra&ch=1', what: 'You reached Agra', open: '/arrive?c=Agra&ch=1', kind: 'walk' }],
};
const view = (b: NewsBannerData) => renderToStaticMarkup(<NewsBannerView banner={b} kmById={new Map([['xuanzang', 2500]])} onOpen={() => {}} onDismiss={() => {}} />);

describe('news from the road, as a banner', () => {
  it('says one thing, in its route’s ink, with one action', () => {
    const html = view(one);
    expect(html).toContain('Expedition · Xuanzang’s road');
    expect(html).toContain('A pious king wants to keep him.');
    expect(html).toContain('>Read what happened<');
    expect(html).toContain('--route-ink');
    expect(html).toContain('aria-label="Dismiss until something new happens"');
  });

  it('gathers two things, with See both and the list folded', () => {
    const html = view(two);
    expect(html).toContain('2 things happened on the road');
    expect(html).toContain('>See both<');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('You reached Agra');
  });

  it('marks every item read when dismissed', () => {
    expect(readKeys(two)).toEqual(['walk-read:walk-news:xuanzang:2490', 'walk-read:walk-later:2026-03-02:/arrive?c=Agra&ch=1']);
  });
});
