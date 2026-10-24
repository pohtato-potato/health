import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../src/walk/catalogue';
import { planWalkMoments } from '../src/walk/moments';
import { laterItem } from '../src/walk/news';
import { FinishView } from '../src/screens/walk/FinishMoment';

const byId = (id: string) => CATALOGUE.find((r) => r.id === id)!;
const finish = { kind: 'finish' as const, key: 'walk-finish:dandi', path: '/finish?id=dandi' };
const arrival = { kind: 'arrival' as const, key: 'city:Agra', path: '/arrive?c=Agra&ch=1' };

describe('the day’s budget, played', () => {
  it('opens the finish, keeps the arrival for a banner, and spends the day', () => {
    const p = planWalkMoments([arrival, finish], new Set(), '2026-03-02');
    expect(p.open).toBe('/finish?id=dandi');
    expect(p.seen).toEqual(expect.arrayContaining(['walk-finish:dandi', 'walk-moment:2026-03-02', 'city:Agra', 'walk-later:2026-03-02:/arrive?c=Agra&ch=1']));
  });

  it('opens nothing on a second save the same day', () => {
    const p = planWalkMoments([arrival], new Set(['walk-moment:2026-03-02']), '2026-03-02');
    expect(p.open).toBeUndefined();
    expect(p.seen).toContain('walk-later:2026-03-02:/arrive?c=Agra&ch=1');
  });

  it('does nothing with nothing to play', () => {
    expect(planWalkMoments([], new Set(), '2026-03-02')).toEqual({ open: undefined, seen: [] });
  });
});

describe('a moment that waited', () => {
  it('becomes a banner item in words', () => {
    expect(laterItem('walk-later:2026-03-02:/arrive?c=Agra&ch=1')).toMatchObject({ what: 'You reached Agra', open: '/arrive?c=Agra&ch=1', kind: 'walk' });
    expect(laterItem('walk-later:2026-03-02:/arrive?s=Rajasthan')?.what).toBe('You walked into Rajasthan');
    expect(laterItem('walk-later:2026-03-02:/finish?id=dandi')).toMatchObject({ what: 'You finished The Dandi March', routeId: 'dandi', open: '/finish?id=dandi' });
    expect(laterItem('walk-later:2026-03-02:/arrive?c=Kanyakumari&ch=1&end=1')?.what).toBe('You reached Kanyakumari: chapter 1 is done');
    expect(laterItem('walk-news:dandi:10')).toBeUndefined();
  });
});

describe('the finish', () => {
  it('draws the route whole, stamps the visa in gold, and says what you did', () => {
    const html = renderToStaticMarkup(<FinishView def={byId('dandi')} doneOn="2026-03-14" from="2026-03-01" onPage={() => {}} onClose={() => {}} />);
    expect(html).toContain('You finished The Dandi March');
    expect(html).toContain('walk-visa-exit');
    expect(html).toContain('in 14 days');
    expect(html).toContain('>See its page<');
  });
});
