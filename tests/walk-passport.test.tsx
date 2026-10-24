import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { STRIDE_M } from '../src/domain/walk';
import { PassportView } from '../src/screens/walk/Passport';
import { passportPages } from '../src/walk/arrivals';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);
const road = new Map([['2026-01-01', steps(100)], ['2026-01-02', steps(140)], ['2026-01-03', steps(115)]]);
const html = renderToStaticMarkup(<PassportView pages={passportPages(road)} startDay="2026-01-01" onReplay={() => {}} />);

describe('the passport', () => {
  it('counts states, territories and cities on its cover, and the pages still to find', () => {
    expect(html).toContain('4 of 28 states · 1 of 8 union territories · 3 of 46 cities');
    expect(html).toContain('31 still to find');
  });

  it('has a page per state reached, in order, and none for the rest', () => {
    const order = ['Delhi', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh'].map((s) => html.indexOf(`aria-label="${s},`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).not.toContain('aria-label="Bihar,');
  });

  it('stamps each city, states and territories differently, with a replay for each', () => {
    expect(html).toContain('walk-stamp ut'); // Delhi
    expect(html).toContain('walk-stamp state'); // Agra, Gwalior
    for (const c of ['Delhi', 'Agra', 'Gwalior']) expect(html).toMatch(new RegExp(`<button[^>]*>Replay ${c}</button>`));
  });

  it('keeps a souvenir on each state page', () => {
    expect(html).toContain('Kept: Marble inlay tile, a flower in pietra dura, from Agra');
  });

  it('ends on the places you’ve been', () => {
    expect(html).toContain('Places I’ve been');
    expect(html).toMatch(/<b>\d+%<\/b> of India’s area/);
  });

  it('opens empty with only the cover before you set off', () => {
    const empty = renderToStaticMarkup(<PassportView pages={[]} startDay="2026-01-01" onReplay={() => {}} />);
    expect(empty).toContain('0 of 28 states');
    expect(empty).toContain('36 still to find');
  });
});
