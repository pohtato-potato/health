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

describe('far-off dates say their year', () => {
  it('adds the year only when it is not this year', async () => {
    const { fmtDayMonthFrom } = await import('../src/domain/format');
    expect(fmtDayMonthFrom('2026-11-02', '2026-10-13')).toBe('2 Nov');
    expect(fmtDayMonthFrom('2027-10-18', '2026-10-13')).toBe('18 Oct 2027');
  });
});

describe('nothing asks for features v2 removed', () => {
  it('no monthly challenge is about water', async () => {
    const { challengeFor } = await import('../src/domain/challenges');
    for (let m = 1; m <= 12; m++) expect(challengeFor(`2027-${String(m).padStart(2, '0')}`).text).not.toMatch(/water/i);
  });
  it('no active achievement asks to try the voices', async () => {
    const { ACTIVE_ACHIEVEMENTS } = await import('../src/domain/achievements');
    expect(ACTIVE_ACHIEVEMENTS.map((a) => a.name)).not.toContain('Voice of reason');
  });
});

describe('departures board labels (s39)', () => {
  it('flight numbers read HW and carry the board category', async () => {
    const { flightNo, boardTag } = await import('../src/domain/milestones');
    expect(flightNo('city:Agra')).toMatch(/^HW \d{3}$/);
    expect(boardTag({ id: 'city:Agra', kind: 'walk' })).toMatch(/^HW \d{3} · WALK$/);
    expect(boardTag({ id: 'reveal', kind: 'date' })).toMatch(/^HW \d{3}$/);
    expect(boardTag({ id: 'weeks:4', kind: 'training' })).toMatch(/· TRAIN$/);
  });
});

describe('night sky stars spread out', () => {
  it('days next to each other in a month do not land on the same spot', async () => {
    const { skyStars } = await import('../src/domain/nightSky');
    const s = skyStars(['2026-10-05', '2026-10-06', '2026-10-07']);
    const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
    expect(Math.min(d(s[0], s[1]), d(s[1], s[2]), d(s[0], s[2]))).toBeGreaterThan(6);
  });
});
