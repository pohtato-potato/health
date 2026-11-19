import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonthBinder, type BinderDay } from '../../src/screens/close/MonthBinder';
import { dayTier } from '../../src/screens/close/DayCard';

// Invented month: 1 Jan 2026 is a Thursday.
const days: BinderDay[] = [
  { date: '2026-01-01', tier: dayTier(4, 4), rings: [1, 1, 1, 1] },
  { date: '2026-01-02' },
  { date: '2026-01-03', tier: dayTier(2, 4), rings: [1, 0.5, 1, 0.2], ribbon: 'var(--dc-record)' },
];
const binder = () => renderToStaticMarkup(<MonthBinder month="January" days={days} total={31} today="2026-01-03" onOpen={() => {}} />);

describe('Close, the month (c5-binder)', () => {
  it('says how many days of the month are closed', () => {
    expect(binder()).toMatch(/<h2[^>]*>January<\/h2><span[^>]*>2 of 31 closed<\/span>/);
  });

  it('draws one small card per closed day, each a button that names it', () => {
    const html = binder();
    expect((html.match(/class="mb-card /g) ?? []).length).toBe(2);
    expect(html).toMatch(/<button type="button" class="mb-card [^"]*"[^>]*aria-label="1 January, Plated day"/);
  });

  it('leaves a day not closed empty, never 0', () => {
    const html = binder();
    expect(html).toMatch(/<span class="mb-empty"[^>]*><span class="mb-n">2<\/span><\/span>/);
    expect(html).not.toMatch(/>0</);
  });

  it('starts the grid on the right weekday, Monday first', () => {
    expect((binder().match(/class="mb-pad"/g) ?? []).length).toBe(3);
  });

  it('keeps a breakout’s ribbon and marks today in words', () => {
    const html = binder();
    expect(html).toContain('mb-rib');
    expect(html).toMatch(/aria-label="3 January, Clean day, today"/);
  });

  it('renders with no data: a month with nothing closed', () => {
    const html = renderToStaticMarkup(<MonthBinder month="January" days={[{ date: '2026-01-01' }]} total={31} today="2026-01-01" onOpen={() => {}} />);
    expect(html).toContain('0 of 31 closed');
    expect(html).not.toContain('mb-card ');
  });
});
