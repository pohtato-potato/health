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

describe('readiness without a morning log', () => {
  it('a session keeps no score that was mostly guessed', async () => {
    const { readinessToStore, readinessText } = await import('../src/domain/readiness');
    expect(readinessToStore({ score: 81, known: false, x: { restDays: 1 } })).toEqual({});
    expect(readinessToStore({ score: 72, known: true, x: { sleep: 0.2 } })).toEqual({ readiness: 72, readinessX: { sleep: 0.2 } });
    expect(readinessText({ score: 81, known: false })).toBe('—');
    expect(readinessText({ score: 72, known: true })).toBe('72');
  });
});

describe('a rest survives leaving the session screen', () => {
  it('resumes with the ding rescheduled, or shows how long ago it ended', async () => {
    const { resumeRest } = await import('../src/domain/rest');
    const active = { from: 1_000_000, endsAt: 1_090_000, total: 90 };
    expect(resumeRest(active, 1_030_000)).toEqual({ rest: active, dingSec: 60 });
    expect(resumeRest(active, 1_150_000)).toEqual({ rest: active });
    expect(resumeRest(undefined, 1_150_000)).toEqual({ rest: null });
  });
});

describe('a crossed pass stays crossed', () => {
  it('passes open on the best strength reached, not just the last two weeks', async () => {
    const { bestStrengthIndex, effectiveKm, PASSES, strengthIndex } = await import('../src/walk/passes');
    const set = (date: string, loadKg: number) => ({ id: date, sessionId: date, date, exerciseId: 'row', exercise: 'Row', setNo: 1, side: undefined, loadKg, reps: 10, at: 0 }) as never;
    const sets = [set('2026-01-05', 10), set('2026-02-20', 12)];
    // Two months on with no lifting, the recent index has fallen to 0, but the best stays.
    expect(strengthIndex(sets, '2026-04-20')).toBe(0);
    const best = bestStrengthIndex(sets, '2026-04-20');
    expect(best).toBeGreaterThanOrEqual(PASSES[0].need);
    expect(effectiveKm(PASSES[0].km + 50, best)).toBe(PASSES[0].km + 50);
  });
});
