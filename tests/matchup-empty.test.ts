import { describe, expect, it } from 'vitest';
import { nothingLoggedYet } from '../src/football/matchup';

describe('the matchup bar before the first log', () => {
  it('says nothing logged yet while every daily axis is in fog', () => {
    expect(nothingLoggedYet({ Pace: 'not-logged', Fuel: 'not-logged', Rest: 'not-logged', Routine: 'no-data' })).toBe(true);
  });
  it('Power and Shape carry over, so they never count as a log today', () => {
    expect(nothingLoggedYet({ Pace: 'not-logged', Fuel: 'not-logged', Rest: 'not-logged', Routine: 'not-logged' })).toBe(true);
  });
  it('one log of the day brings the score back', () => {
    expect(nothingLoggedYet({ Pace: 'not-logged', Fuel: 'not-logged', Routine: 'not-logged' })).toBe(false);
  });
});
