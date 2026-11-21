import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LiftDeck, type LiftCard } from '../../src/screens/you/TodaysLift';

const cards: LiftCard[] = Array.from({ length: 9 }, (_, i) => ({
  kind: (['know', 'finding', 'lift', 'surprise'] as const)[i % 4],
  head: `Test head ${i + 1}`,
  sub: `Test line ${i + 1}`,
}));

describe("y6-deck Today's lift, a deck", () => {
  it('nine cards; the top one shows with its place, and each is reachable by a button', () => {
    const out = html(<LiftDeck cards={cards} />);
    expect(out).toContain("Today’s lift");
    expect(out).toContain('9 cards');
    expect(out).toContain('1 of 9');
    expect(out).toContain('Test head 1');
    expect(out).toMatch(/<button[^>]*aria-label="Next card"/);
    expect(out).toMatch(/<button[^>]*aria-label="Previous card"/);
    // the four kinds as buttons that jump to their first card
    for (const k of ['Did you know', 'A finding', 'A lift', 'Surprise']) expect(out).toMatch(new RegExp(`<button[^>]*>${k}</button>`));
    expect(out).toContain('aria-pressed="true"');
  });

  it('a kind with no card has no button', () => {
    const out = html(<LiftDeck cards={cards.filter((c) => c.kind !== 'surprise')} />);
    expect(out).not.toMatch(/>Surprise<\/button>/);
  });

  it('renders with no data', () => {
    expect(html(<LiftDeck cards={[]} />)).toBe('');
  });
});
