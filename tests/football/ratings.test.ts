import { describe, expect, it } from 'vitest';
import { band, shownRating, TIER_AVG } from '../../src/football/ratings';
import { opponentFor, modsFromStyle } from '../../src/football/opponent';
import { clubById } from '../../src/football/data/load';

describe('tier-relative ratings', () => {
  it('shows a value against the tier average', () => {
    expect(TIER_AVG[6]).toBe(7);
    expect(shownRating(12, 6)).toBe(20);
    expect(shownRating(9, 5)).toBe(10);
    expect(shownRating(9, 6) - shownRating(9, 5)).toBe(4);
    expect(shownRating(18, 1)).toBe(10);
  });
  it('bands values like Football Manager', () => {
    expect(band(5)).toBe(1);
    expect(band(6)).toBe(2);
    expect(band(15)).toBe(3);
    expect(band(16)).toBe(4);
  });
});

describe('opponent modifiers', () => {
  it('turns rating into reach', () => {
    expect(opponentFor(clubById('bay')).reach).toBeCloseTo(0.88);
    expect(opponentFor(clubById('bay'), { rating: 40 }).reach).toBeCloseTo(0.6);
  });
  it('uses the data modifiers at the data rating', () => {
    expect(opponentFor(clubById('bay')).shrinks.Pace).toBeCloseTo(-2);
  });
  it('a derby adds 1 to each modifier', () => {
    const o = opponentFor(clubById('bay'), { derby: true });
    expect(o.shrinks.Pace).toBeCloseTo(-3);
    expect(o.presses.Shape).toBeCloseTo(-3);
  });
  it('builds modifiers from style when a club has none', () => {
    const m = modsFromStyle(96, 'press');
    const total = Object.values(m.shrinks).reduce((a, b) => a + b, 0) + Object.values(m.presses).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(-(96 - 30) * 0.14, 5);
    expect(m.shrinks.Pace).toBeCloseTo(-2.03, 1);
  });
});
