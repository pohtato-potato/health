import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Owner, 12 Nov: three things leave You; everything else on the page stays.
const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

describe('You page removals (12 Nov)', () => {
  it('"Your three questions" and "What would it take" are gone', () => {
    const b = src('screens/you/Browse.tsx');
    expect(b).not.toMatch(/Your three questions|What would it take|whatWouldItTake|QUESTIONS/);
  });
  it('the Go to a page box is gone', () => {
    expect(src('screens/You.tsx')).not.toMatch(/GoToBox/);
    expect(existsSync(new URL('../src/screens/you/GoToBox.tsx', import.meta.url))).toBe(false);
  });
  it('Did you know, Surprise me, Today\'s lift, How\'s today and the momentum panel stay', () => {
    const b = src('screens/you/Browse.tsx');
    expect(b).toMatch(/Did you know/);
    expect(b).toMatch(/Surprise me/);
    const y = src('screens/You.tsx');
    for (const c of ['<TodaysLift', '<HowsToday', '<MomentumPanel', '<Browse', '<TrophyCase', '<Doors', '<FindingCard', '<LeagueLine', '<FilmPoster', '<ClockCard', '<DueLines'])
      expect(y).toContain(c);
  });
  it('stored questions stay in settings so old backups restore', () => {
    expect(src('domain/types.ts')).toMatch(/youQuestions\?:/);
  });
});
