// LG-4 (ledger O38): the owner's decisions of 15 Nov, each held by a test. Others are held where they were built:
// the Division Eight floor and the level check (pyramid-movement), the Pair Cup's name and the Big Cup on league
// nights (pyramid-cups-olds, pyramid-shape), Old Selves needing seven nights and never drifting (pyramid-cups-olds,
// pyramid-level-drift), the neighbours, the champions and RBB (world2-neighbours).
import { describe, expect, it } from 'vitest';
import { STAFF } from '../../src/football/content/staff';
import { incomeFor } from '../../src/football/money';
import { pairCupName } from '../../src/football/pyramid/cups';
import { SEASON_MONEY_2, seasonMoneyScale } from '../../src/football/pyramid/shape';
import { payWages, wageBill } from '../../src/football/tree/staff';
import { BIGCUP_DAYS_2, seasonDays2 } from '../../src/football/calendar';

describe('season money by two thirds (choice b)', () => {
  it('world 2 pays two thirds a season; world 1 is unchanged', () => {
    expect(SEASON_MONEY_2).toBeCloseTo(2 / 3);
    expect(seasonMoneyScale({ world: 2 })).toBeCloseTo(2 / 3);
    expect(seasonMoneyScale({})).toBe(1);
    expect(seasonMoneyScale({ world: 1 })).toBe(1);
  });
  it('so money per real day stays the same: 2/3 of a 42-day season over 28 days', () => {
    const season42 = incomeFor(4, 6, false, 0);
    expect((season42 * SEASON_MONEY_2) / 28).toBeCloseTo(season42 / 42, 6);
  });
  it('wages too: a 28-day season pays two thirds of the bill', () => {
    const researched = STAFF.slice(0, 3).map((s) => s.tech);
    const full = wageBill(researched, 3), scaled = wageBill(researched, 3, SEASON_MONEY_2);
    expect(scaled).toBeCloseTo(full * SEASON_MONEY_2, 2);
    expect(payWages(researched, 3, 100, SEASON_MONEY_2).paid).toBeCloseTo(scaled, 3);
    expect(payWages(researched, 3, 100).paid).toBeCloseTo(full, 3);
  });
});

describe('the cups as decided', () => {
  it('"The Pair Cup" (choice a)', () => {
    expect(pairCupName(5)).toMatch(/^The Pair Cup: /);
  });
  it('Big Cup rounds stay on league nights, with two Big Cup days (choice a)', () => {
    const days = seasonDays2();
    const league = new Set(days.filter((d) => d.kind === 'league').map((d) => d.day));
    const bigDays = Object.keys(BIGCUP_DAYS_2).map(Number);
    expect(days.filter((d) => d.kind === 'bigcup')).toHaveLength(2);
    expect(bigDays.some((d) => league.has(d))).toBe(true);
  });
});
