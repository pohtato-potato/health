import { describe, expect, it } from 'vitest';
import { atOn } from '../src/domain/dates';
import {
  bedDrift,
  bestWeekday,
  discomfortByExercise,
  eveningTopUps,
  formTrend,
  lateShare,
  readinessAfter,
  placeSplit,
  proteinByMeal,
  readinessHits,
  recompVerdict,
  todayAndChange,
  usualRange,
} from '../src/domain/trackStats';

const days = (from: string, vals: (number | null)[]) => {
  const m = new Map<string, number>();
  const d0 = new Date(from + 'T12:00');
  vals.forEach((v, i) => {
    const d = new Date(d0);
    d.setDate(d.getDate() + i);
    const k = d.toISOString().slice(0, 10);
    if (v !== null) m.set(k, v);
  });
  return m;
};

describe('track stats', () => {
  it('today and the change against last week', () => {
    // 1–7 Oct at 10,000; 8–14 Oct at 12,000.
    const m = days('2026-10-01', [...Array(7).fill(10000), ...Array(7).fill(12000)]);
    expect(todayAndChange(m, '2026-10-14')).toEqual({ latest: 12000, thisWeek: 12000, lastWeek: 10000, delta: 2000 });
    expect(todayAndChange(new Map(), '2026-10-14').delta).toBeUndefined();
  });

  it('usual range is the middle half, once there are five values', () => {
    expect(usualRange([1, 2, 3, 4])).toBeUndefined();
    expect(usualRange([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([3, 7]);
  });

  it('office against home', () => {
    const kinds: Record<string, 'office' | 'home'> = { a: 'office', b: 'office', c: 'home', d: 'home' };
    const vals: Record<string, number> = { a: 100, b: 120, c: 140, d: 160 };
    expect(placeSplit(['a', 'b', 'c', 'd'], (d) => vals[d], (d) => kinds[d])).toEqual({ office: 110, home: 150, diff: -40 });
    expect(placeSplit(['c', 'd'], (d) => vals[d], (d) => kinds[d]).diff).toBeUndefined();
  });

  it('best weekday by average', () => {
    // 3 and 10 Oct 2026 are Saturdays.
    const m = new Map([['2026-10-03', 16000], ['2026-10-10', 17800], ['2026-10-05', 9000]]);
    expect(bestWeekday(m)).toEqual({ weekday: 6, avg: 16900 });
  });

  it('late protein share counts protein eaten from 9 pm', () => {
    const e = (date: string, min: number, protein: number) => ({ date, eatenAt: atOn(date, min), protein, at: atOn(date, min) });
    const r = lateShare([e('2026-10-12', 600, 40), e('2026-10-12', 1300, 60), e('2026-10-13', 600, 50), e('2026-10-13', 1290, 10)]);
    expect(r.share).toBeCloseTo(70 / 160);
    expect(r).toMatchObject({ lateDays: 1, days: 2 });
  });

  it('protein by meal', () => {
    expect(proteinByMeal([{ meal: 'dinner', protein: 30 }, { meal: 'lunch', protein: 20 }, { meal: 'dinner', protein: 10 }])).toEqual({ dinner: 40, lunch: 20 });
  });

  it('bedtime drift on office nights, across midnight', () => {
    const d = (date: string, asleep: number) => ({ date, sleep: { asleep, woke: 420 } });
    const list = [d('a', 1410), d('b', 30), d('c', 1380), d('e', 1400)];
    // Office: 23:30 and 00:30 → 24:00; others: 23:00 and 23:20 → 23:10. Drift +50 min.
    expect(bedDrift(list, (x) => x === 'a' || x === 'b')).toBe(50);
    expect(bedDrift(list.slice(2), () => false)).toBeUndefined();
  });

  it('evening top-ups: evening logs that reached the goal', () => {
    const at = (date: string, h: number) => atOn(date, h * 60);
    const list = [
      { date: '2026-10-10', steps: 12500, stepsAt: at('2026-10-10', 21) },
      { date: '2026-10-11', steps: 9000, stepsAt: at('2026-10-11', 22) },
      { date: '2026-10-12', steps: 13000, stepsAt: at('2026-10-12', 13) },
    ];
    expect(eveningTopUps(list, 12000)).toEqual({ tried: 2, reached: 1 });
  });

  it('readiness hits: score and session quality both good or both not (60 and up)', () => {
    const s = [
      { readiness: 85, quality: 90 },
      { readiness: 40, quality: 50 },
      { readiness: 80, quality: 40 },
      { readiness: 30, quality: 35 },
      { readiness: undefined, quality: 70 },
    ];
    expect(readinessHits(s)).toEqual({ agreed: 3, total: 4 });
  });

  it('form trend: clean reps over all reps, now against the fortnight before', () => {
    const set = (date: string, reps: number, cleanReps?: number) => ({ date, reps, cleanReps });
    const r = formTrend([set('2026-10-10', 10, 9), set('2026-10-12', 10, 7), set('2026-09-25', 10, 6), set('2026-09-26', 10)], '2026-10-14');
    expect(r).toEqual({ now: 0.8, before: 0.8 });
  });

  it('discomfort tags grouped by exercise', () => {
    const r = discomfortByExercise([
      { exercise: 'Incline push-up', discomfort: 'wrist' as const },
      { exercise: 'Incline push-up', discomfort: 'wrist' as const },
      { exercise: 'Split squat', discomfort: 'knee' as const },
      { exercise: 'Row' },
    ]);
    expect(r).toEqual([
      { exercise: 'Incline push-up', tags: { wrist: 2 } },
      { exercise: 'Split squat', tags: { knee: 1 } },
    ]);
  });

  it('readiness the day after drinks, against other sessions', () => {
    const list = [
      { date: '2026-10-11', readiness: 50 },
      { date: '2026-10-12', readiness: 80 },
      { date: '2026-10-13', readiness: 70 },
      { date: '2026-10-14', readiness: undefined },
    ];
    expect(readinessAfter(new Set(['2026-10-10']), list)).toEqual({ after: 50, other: 75, sessions: 1 });
    expect(readinessAfter(new Set(), list)).toBeUndefined();
  });

  it('recomposition: flat weight, smaller waist, stronger', () => {
    expect(recompVerdict({ weightKg: 0.2, waistIn: -0.6, strengthPct: 9 })).toBe('recomposition');
    expect(recompVerdict({ weightKg: -1.5, waistIn: -0.8 })).toBe('losing');
    expect(recompVerdict({ weightKg: 1.2, waistIn: 0.5 })).toBe('gaining');
    expect(recompVerdict({ weightKg: 0.1, waistIn: 0 })).toBe('steady');
    expect(recompVerdict({})).toBeUndefined();
  });
});
