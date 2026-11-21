import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Owner, 12 Nov: three things leave You; everything else on the page stays.
// Look pass L5 (15 Nov): Browse split into DidYouKnow and Surprise; the club's line is FootballLine (same data).
const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

describe('You page removals (12 Nov)', () => {
  it('"Your three questions" and "What would it take" are gone', () => {
    expect(existsSync(new URL('../src/screens/you/Browse.tsx', import.meta.url))).toBe(false);
    expect(src('domain/liftDeck.ts')).not.toMatch(/Your three questions|What would it take|whatWouldItTake|QUESTIONS/);
  });
  it('the Go to a page box is gone', () => {
    expect(src('screens/You.tsx')).not.toMatch(/GoToBox/);
    expect(existsSync(new URL('../src/screens/you/GoToBox.tsx', import.meta.url))).toBe(false);
  });
  // y6-deck (redesign, Nov): Did you know, the finding, the lifts and Surprise are now the kinds of one Today's lift deck.
  it('Did you know, Surprise, Today\'s lift, How\'s today and the momentum panel stay', () => {
    const b = src('screens/you/TodaysLift.tsx');
    expect(b).toMatch(/Did you know/);
    expect(b).toMatch(/Surprise/);
    expect(b).toMatch(/A finding/);
    const y = src('screens/You.tsx');
    for (const c of ['<LiftDeck', '<HowsToday', '<MomentumPanel', '<TrophyCase', '<Doors', '<FootballLine', '<FilmPoster', '<ClockChip', '<DueLines'])
      expect(y).toContain(c);
  });
  it('stored questions stay in settings so old backups restore', () => {
    expect(src('domain/types.ts')).toMatch(/youQuestions\?:/);
  });
});
