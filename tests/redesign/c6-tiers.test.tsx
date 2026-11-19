import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { DayCard, dayTier, tierLine } from '../../src/screens/close/DayCard';

const shut = (kcal: boolean, protein: boolean, steps: boolean, sleep: boolean) => ({ kcal, protein, steps, sleep });
const short = { kcal: 'in' as const, proteinG: 12, steps: 900, sleepMin: 20 };

describe('Close, the four tiers (c6-tiers)', () => {
  it('names each tier in text', () => {
    expect([0, 1, 2, 3, 4].map((n) => dayTier(n, 4).name)).toEqual(['Closed', 'First light', 'Clean', 'Even', 'Plated']);
    const html = renderToStaticMarkup(<DayCard tier={dayTier(2, 4)} dateLabel="1 Jan" title="Thursday at the office" rings={[0, 1, 1, 0]} stats={[]} />);
    expect(html).toContain('Clean day');
  });

  it('says why: every ring, the two that closed, the one that fell short, or the one that closed', () => {
    expect(tierLine(shut(true, true, true, true), 4, short)).toBe('All four rings');
    expect(tierLine(shut(false, true, true, false), 4, short)).toBe('Protein and steps');
    expect(tierLine(shut(true, true, true, false), 4, short)).toBe('Sleep short by 20 min');
    expect(tierLine(shut(true, false, true, true), 4, short)).toBe('Protein short by 12 g');
    expect(tierLine(shut(false, false, true, false), 4, short)).toBe('Steps closed');
    expect(tierLine(shut(true, true, true, false), 3, short)).toBe('All three rings');
  });

  it('says how calories missed: under or over the aim', () => {
    expect(tierLine(shut(false, true, true, true), 4, { ...short, kcal: 'over' })).toBe('Calories over the aim');
  });

  it('wraps a long title inside the edge', () => {
    const css = readFileSync('src/styles/food.css', 'utf8');
    expect(css).toMatch(/\.dc-title \{[^}]*overflow-wrap: anywhere/);
  });

  it('renders with no data: no ring closed still says something kind', () => {
    expect(tierLine(shut(false, false, false, false), 4, short)).toBe('Counted all the same');
  });
});
