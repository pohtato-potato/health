import { describe, expect, it } from 'vitest';
import { bestWindow, tally, WINDOW } from '../src/domain/tallies';
import { addDays } from '../src/domain/dates';

const run = (from: string, n: number, every = 1) => Array.from({ length: n }, (_, i) => addDays(from, i * every));

describe('tallies replace streaks (O1)', () => {
  it('the window is 28 days, today included', () => {
    expect(WINDOW).toBe(28);
    const hits = ['2026-10-14', '2026-10-15', '2026-11-10'];
    // 14 Oct is 28 days before 11 Nov: outside; 15 Oct is the first day inside.
    expect(tally(hits, '2026-11-11').last28).toBe(2);
  });

  it('a missed day never takes anything away', () => {
    const before = tally(run('2026-10-01', 10), '2026-10-10');
    const gap = tally([...run('2026-10-01', 10), '2026-10-12'], '2026-10-12');
    expect(gap.last28).toBe(before.last28 + 1);
    expect(gap.season).toBeGreaterThanOrEqual(before.season);
    expect(gap.total).toBe(11);
  });

  it('season counts only go up, from the season start', () => {
    const hits = run('2026-09-01', 60);
    const t = tally(hits, '2026-10-30', '2026-10-01');
    expect(t.season).toBe(30);
    const later = tally(hits, '2026-12-20', '2026-10-01');
    expect(later.season).toBe(30);
    expect(later.last28).toBe(0);
  });

  it('with no season start the season is everything so far', () => {
    expect(tally(run('2026-09-01', 5), '2026-11-01').season).toBe(5);
  });

  it('the record book keeps the best 28 days ever, and when it ended', () => {
    const hits = [...run('2026-08-01', 28), ...run('2026-10-01', 10)];
    const t = tally(hits, '2026-10-10');
    expect(t.best28).toBe(28);
    expect(t.best28End).toBe('2026-08-28');
    expect(t.last28).toBe(10);
  });

  it('counts a day once, and a weight lets sessions count twice in a day', () => {
    expect(tally(['2026-11-01', '2026-11-01'], '2026-11-02').last28).toBe(1);
    expect(bestWindow([{ date: '2026-11-01', n: 2 }, { date: '2026-11-03', n: 1 }]).best).toBe(3);
  });

  it('empty is zero everywhere', () => {
    expect(tally([], '2026-11-11')).toEqual({ last28: 0, season: 0, best28: 0, best28End: undefined, total: 0 });
  });
});
