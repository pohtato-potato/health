import { describe, expect, it } from 'vitest';
import { strongestWeek, surpriseRecord } from '../src/domain/film';
import { pickChallenge, type DaySummary } from '../src/domain/challenges';
import { nextStopLine } from '../src/walk/lines';

const set = (date: string, exercise: string, loadKg: number | null, reps: number, mark?: '!!') => ({ date, exercise, exerciseId: exercise, loadKg, reps, mark, side: 'both' as const });

describe('film frames', () => {
  it('finds the strongest week of the month by weight moved', () => {
    const sets = [
      set('2026-09-02', 'Goblet squat', 10, 10),
      set('2026-09-09', 'Goblet squat', 12, 10),
      set('2026-09-10', 'Goblet squat', 12, 10),
      set('2026-09-16', 'Goblet squat', 14, 8),
      set('2026-08-30', 'Goblet squat', 40, 10),
    ];
    expect(strongestWeek('2026-09', sets)).toEqual({ from: '2026-09-07', kg: 240, sets: 2 });
    expect(strongestWeek('2026-07', sets)).toBeUndefined();
  });

  it('finds the record you did not see coming: the biggest jump over a previous best', () => {
    const sets = [
      set('2026-08-01', 'Goblet squat', 10, 10),
      set('2026-08-03', 'Row', 8, 10),
      set('2026-09-05', 'Goblet squat', 12, 10, '!!'),
      set('2026-09-12', 'Row', 12, 10, '!!'),
    ];
    expect(surpriseRecord('2026-09', sets)).toEqual({ exercise: 'Row', date: '2026-09-12', from: 8, to: 12, pct: 50 });
    expect(surpriseRecord('2026-10', sets)).toBeUndefined();
  });
});

const summary = (date: string, f: Partial<DaySummary>): DaySummary => ({ date, logged: true, perfect: false, proteinOk: true, sleepOk: true, waterSpread: true, morning: true, checklist: true, steps: 8000, ...f });
const month = (n: number, f: (i: number) => Partial<DaySummary>) => Array.from({ length: n }, (_, i) => summary(`2026-08-${String(i + 1).padStart(2, '0')}`, f(i)));

describe('monthly challenge from your data', () => {
  it('picks the weakest habit of the last thirty days and sets the goal a little above it', () => {
    // Sleep is reached on 12 of 30 nights; everything else on most days.
    const history = month(30, (i) => ({ sleepOk: i % 5 < 2, proteinOk: i % 10 !== 0 }));
    const c = pickChallenge('2026-09', history, { checklist: true });
    expect(c.id).toBe('sleep-2026-09');
    expect(c.unit).toBe('nights');
    expect(c.goal).toBeGreaterThan(12);
    expect(c.goal).toBeLessThanOrEqual(18);
    expect(c.progress(history.slice(0, 3), { lastMonthSteps: 0, month: '2026-09' })).toBe(2);
  });

  it('leaves the checklist out when there is none, and falls back with too little history', () => {
    const history = month(30, (i) => ({ checklist: false, morning: i % 3 !== 0 }));
    expect(pickChallenge('2026-09', history, { checklist: false }).id).toBe('mornings-2026-09');
    expect(pickChallenge('2026-09', history.slice(0, 5), { checklist: false }).id).toBe('log-28');
  });

  it('lets Diwali take over its month', () => {
    const history = month(30, () => ({ sleepOk: false }));
    expect(pickChallenge('2026-11', history, { checklist: true }).id).toMatch(/^diwali-/);
  });
});

describe('day closed walk line', () => {
  it('says tomorrow when the next stop is within a typical day', () => {
    expect(nextStopLine('Agra', 6.2, 8.5)).toBe('Agra tomorrow');
    expect(nextStopLine('Agra', 72.4, 8.5)).toBe('Agra in 73 km');
    expect(nextStopLine('Agra', 6, undefined)).toBe('Agra in 6 km');
  });
});

describe('theme days', () => {
  it('tints the sky toward the festival and leaves ordinary days alone', async () => {
    const { festiveSky } = await import('../src/walk/art/festive');
    const sky: [string, string, string] = ['#101020', '#202040', '#404080'];
    expect(festiveSky(undefined, sky)).toEqual(sky);
    const d = festiveSky('diwali', sky);
    expect(d).not.toEqual(sky);
    expect(d).toHaveLength(3);
    expect(festiveSky('holi', sky)).not.toEqual(d);
  });
});

describe('quiet in public', () => {
  it('holds back confetti and sound late at night, early morning, and while the app is in the background', async () => {
    const { quietNow } = await import('../src/ui/quiet');
    const at = (h: number, m = 0) => new Date(2026, 9, 14, h, m).getTime();
    expect(quietNow(true, at(22, 0), false)).toBe(true);
    expect(quietNow(true, at(6, 59), false)).toBe(true);
    expect(quietNow(true, at(7, 0), false)).toBe(false);
    expect(quietNow(true, at(15), true)).toBe(true);
    expect(quietNow(false, at(23), true)).toBe(false);
  });
});
