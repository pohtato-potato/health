import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { DawnView, nightLine, type DawnCard } from '../../src/screens/Dawn';

// Invented numbers.
const cards: DawnCard[] = [
  { id: 'night', body: <><span className="dawn-lab">Last night</span><p className="dawn-big tn">7 h 10 m</p></> },
  { id: 'rings', body: <span className="dawn-lab">Yesterday’s rings</span> },
  { id: 'ahead', body: <span className="dawn-lab">The day ahead</span> },
];
const view = (i: number) => renderToStaticMarkup(<DawnView cards={cards} i={i} onNext={() => {}} onLeave={() => {}} />);

describe('The morning reveal (o23-dawn)', () => {
  it('shows one card at a time, and says which in words', () => {
    const html = view(1);
    expect((html.match(/class="dawn-panel"/g) ?? []).length).toBe(1);
    expect(html).toContain('Yesterday’s rings');
    expect(html).not.toContain('Last night');
    expect(html).toContain('Card 2 of 3');
  });

  it('has "Tap to go on" and "Skip" as buttons', () => {
    const html = view(0);
    expect(html).toMatch(/<button type="button" class="dawn-next">Tap to go on<\/button>/);
    expect(html).toMatch(/<button type="button" class="dawn-skip">Skip<\/button>/);
    const css = readFileSync('src/styles/creatures.css', 'utf8');
    expect(css).toMatch(/\.dawn-next, \.dawn-skip \{[^}]*min-height: 48px/);
  });

  it('ends on "To today" in their place', () => {
    const html = view(2);
    expect(html).toContain('To today');
    expect(html).not.toContain('Tap to go on');
  });

  it('keeps the sun and the dots as decoration; the sun rises once, with no reduced-motion variant', () => {
    const html = view(0);
    expect(html).toMatch(/<div class="dawn-sky" aria-hidden="true"><span class="dawn-sun"><\/span><\/div>/);
    expect(html).toMatch(/<span class="dawn-pips" aria-hidden="true">/);
    const css = readFileSync('src/styles/creatures.css', 'utf8');
    const rule = css.slice(css.indexOf('.dawn-sun {'));
    expect(rule.slice(0, rule.indexOf('}'))).not.toMatch(/infinite/);
    expect(css).not.toContain('prefers-reduced-motion'); // no reduced-motion variants (PRODUCT.md)
  });

  it('says how the night went in words', () => {
    expect(nightLine(430)).toBe('A good night.');
    expect(nightLine(300)).toBe('A short night.');
  });

  it('renders with no data: no cards, nothing drawn', () => {
    expect(renderToStaticMarkup(<DawnView cards={[]} i={0} onNext={() => {}} onLeave={() => {}} />)).toBe('');
  });
});
