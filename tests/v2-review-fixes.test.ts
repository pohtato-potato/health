import { describe, expect, it } from 'vitest';
import { logMinutes, logWeekdaySun } from '../src/domain/dates';

describe('the logging day runs 4 am to 4 am', () => {
  it('minutes into the logging day carry past midnight', () => {
    expect(logMinutes(new Date(2026, 9, 13, 12, 0).getTime())).toBe(720);
    expect(logMinutes(new Date(2026, 9, 14, 0, 30).getTime())).toBe(1470);
    expect(logMinutes(new Date(2026, 9, 14, 4, 0).getTime())).toBe(240);
  });

  it('a Sunday-night session after midnight is still Sunday', () => {
    // 11 Oct 2026 is a Sunday; 00:30 on the 12th still belongs to it.
    expect(logWeekdaySun(new Date(2026, 9, 12, 0, 30).getTime())).toBe(0);
    expect(logWeekdaySun(new Date(2026, 9, 12, 9, 0).getTime())).toBe(1);
  });
});

describe('nothing active needs water, which v2 no longer logs', () => {
  it('water-only secrets are retired and the rest no longer ask for water', async () => {
    const { ACTIVE_ACHIEVEMENTS } = await import('../src/domain/achievements');
    const names = ACTIVE_ACHIEVEMENTS.map((a) => a.name);
    expect(names).not.toContain('Pi day');
    expect(names).toContain('Mogambo khush hua');
    expect(names).toContain('Apun hi bhagwan hai');
    for (const a of ACTIVE_ACHIEVEMENTS) if (typeof a.desc === 'string') expect(a.desc).not.toMatch(/water/i);
    for (const a of ACTIVE_ACHIEVEMENTS) expect(String(a.test)).not.toMatch(/waterOk|\.water\b/);
  });
});
