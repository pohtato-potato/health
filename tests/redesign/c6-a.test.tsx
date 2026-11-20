import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { DayCard, dayTier } from '../../src/screens/close/DayCard';

// Invented numbers.
const card = (closed = 4) =>
  renderToStaticMarkup(
    <DayCard
      tier={dayTier(closed, 4)}
      dateLabel="2 Jan"
      title="Friday at home"
      rings={[1, 1, 0.5, 1]}
      stats={[
        { name: 'Calories', value: '2,000', ink: 'var(--kcal)' },
        { name: 'Protein', value: '120 g', ink: 'var(--protein)' },
      ]}
      foot="Shape sealed"
    />,
  );

describe('Close, reveal A (c6-a)', () => {
  it('names the tier, the date and the day on the card', () => {
    const html = card();
    expect(html).toMatch(/<b class="dc-tier">Plated day<\/b><span class="dc-date">2 Jan<\/span>/);
    expect(html).toContain('Friday at home');
    expect(html).toMatch(/<span>Calories<\/span><b[^>]*>2,000<\/b>/);
    expect(html).toContain('Shape sealed');
  });

  it('draws the rings as decoration with the closed count in words', () => {
    expect(card()).toMatch(/<svg[^>]*role="img"[^>]*aria-label="3 of 4 rings closed"/);
  });

  it('puts "The week" and "Good night" on one row, each at least 44 px', () => {
    const src = readFileSync('src/screens/DayClosed.tsx', 'utf8');
    expect(src).toMatch(/className="dc-acts"[\s\S]*The week[\s\S]*Good night/);
    const css = readFileSync('src/styles/food.css', 'utf8');
    expect(css).toMatch(/\.dc-acts \{[^}]*display: flex[^}]*\}/);
    expect(css).toMatch(/\.dc-acts > \* \{[^}]*min-height: (4[4-9]|[5-9][0-9])px/);
  });

  it('flips the card in once and draws the rings once; no reduced-motion variant', () => {
    const css = readFileSync('src/styles/food.css', 'utf8');
    const rule = css.slice(css.indexOf('.dc.reveal {'));
    expect(rule.slice(0, rule.indexOf('}'))).not.toMatch(/infinite/);
    expect(css).not.toContain('prefers-reduced-motion'); // no reduced-motion variants (PRODUCT.md)
  });

  it('renders with no data: a closed day with no rings closed is still a card, with dashes', () => {
    const html = renderToStaticMarkup(<DayCard tier={dayTier(0, 4)} dateLabel="2 Jan" title="Friday" rings={[0, 0, 0, 0]} stats={[{ name: 'Steps', value: '—', ink: 'var(--steps)' }]} />);
    expect(html).toContain('Closed day');
    expect(html).toContain('0 of 4 rings closed');
    expect(html).toContain('—');
  });
});
