import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryCard, memoryDates } from '../../src/screens/OnThisDay';

// Invented numbers.
const card = (over: Partial<Parameters<typeof MemoryCard>[0]> = {}) =>
  renderToStaticMarkup(
    <MemoryCard
      when="Three months ago, on 19 Aug."
      dateLabel="Wed 19 Aug"
      line="6,000 steps, Session A."
      rows={[{ name: 'Weight', then: '80.0', now: '78.5 kg' }, { name: 'Steps', then: '6,000', now: '9,000' }]}
      extras={['Win: walked to work']}
      open={false}
      onToggle={() => {}}
      {...over}
    />,
  );

describe('On this day (h10-onthis)', () => {
  it('says when, and puts the day’s line in text on the snapshot', () => {
    const html = card();
    expect(html).toMatch(/<h2[^>]*>On this day<\/h2>/);
    expect(html).toContain('Three months ago, on 19 Aug.');
    expect(html).toMatch(/<span class="otd-date">Wed 19 Aug<\/span><p class="otd-line">6,000 steps, Session A.<\/p>/);
  });

  it('keeps the tape as decoration', () => {
    expect(card()).toMatch(/<i class="otd-tape" aria-hidden="true"><\/i>/);
  });

  it('sets that day’s numbers against today’s, with "now" in words', () => {
    const html = card();
    expect(html).toMatch(/<dt>Weight<\/dt><dd><span class="otd-then tn">80.0<\/span>/);
    expect(html).toContain('78.5 kg');
    expect(html).toContain(', now');
  });

  it('opens more as a button, at least 44 px', () => {
    expect(card()).toMatch(/<button type="button" class="otd-more" aria-expanded="false">Remember more<\/button>/);
    expect(card({ open: true })).toContain('Win: walked to work');
    const css = readFileSync('src/styles/today.css', 'utf8');
    expect(css).toMatch(/\.otd-more \{[^}]*min-height: 44px/);
  });

  it('drops in once; reduced motion shows it landed', () => {
    const css = readFileSync('src/styles/today.css', 'utf8');
    const rule = css.slice(css.indexOf('.otd-snap {'));
    expect(rule.slice(0, rule.indexOf('}'))).not.toMatch(/infinite/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.otd-snap \{ animation: none/);
  });

  it('renders only on a memory date: the card returns nothing otherwise, and shows on Home', () => {
    const src = readFileSync('src/screens/OnThisDay.tsx', 'utf8');
    expect(src).toMatch(/if \(!pick\) return null;/);
    expect(readFileSync('src/screens/Today.tsx', 'utf8')).toContain('<OnThisDayCard />');
    expect(memoryDates('2026-03-31').map((m) => m.date)).toEqual(['2025-03-31', '2025-12-31']);
  });

  it('renders with no data: no rows and no extras still says the day', () => {
    const html = card({ rows: [], extras: [], line: 'A quiet day, logged all the same.' });
    expect(html).toContain('A quiet day, logged all the same.');
    expect(html).not.toContain('otd-rows');
    expect(html).not.toContain('otd-more');
  });
});
