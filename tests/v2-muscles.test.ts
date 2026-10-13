import { describe, expect, it } from 'vitest';
import { daysSince, hourBreakdown, musclesOf, weeklyHardSets } from '../src/domain/muscles';
import { DEFAULT_PLAN } from '../src/domain/defaultPlan';
import type { SetEntry, TrainingSession } from '../src/domain/types';

let n = 0;
const set = (exerciseId: string, date: string, extra: Partial<SetEntry> = {}): SetEntry => ({ id: `s${++n}`, sessionId: date, date, session: 'A', exerciseId, exercise: exerciseId, setNo: 1, side: 'both', loadKg: 10, reps: 12, at: n, ...extra });

describe('muscles', () => {
  it('every exercise in the built-in plan has primary muscles', () => {
    for (const s of DEFAULT_PLAN.sessions) for (const e of s.exercises) expect(musclesOf(e).primary.length, e.id).toBeGreaterThan(0);
  });

  it('unknown exercises are guessed from their name', () => {
    expect(musclesOf({ id: 'x1', name: 'Incline dumbbell press' }).primary).toContain('chest');
    expect(musclesOf({ id: 'x2', name: 'Something new' }).primary).toEqual([]);
  });

  it('hard sets count rir≤3 only', () => {
    const sets = [set('floor-press', '2026-10-12', { rir: 1 }), set('floor-press', '2026-10-12', { rir: 4 }), set('floor-press', '2026-10-13'), set('floor-press', '2026-10-05', { rir: 1 }), set('floor-press', '2026-10-13', { skipped: true })];
    const hard = weeklyHardSets(sets, DEFAULT_PLAN, '2026-10-12');
    expect(hard.chest).toBe(2);
    expect(hard.triceps).toBe(2);
    expect(hard['front-delts']).toBe(1);
  });

  it('days since a muscle was trained', () => {
    const sets = [set('row', '2026-10-09'), set('rdl', '2026-10-11')];
    expect(daysSince('lats', sets, DEFAULT_PLAN, '2026-10-13')).toBe(4);
    expect(daysSince('hamstrings', sets, DEFAULT_PLAN, '2026-10-13')).toBe(2);
    expect(daysSince('calves', sets, DEFAULT_PLAN, '2026-10-13')).toBeUndefined();
  });

  it('hour breakdown sums to duration', () => {
    const s = { startedAt: 0, endedAt: 3_000_000, restLog: [{ from: 600_000, to: 690_000, kind: 'rest' as const }, { from: 1_000_000, to: 1_300_000, kind: 'rest' as const }] } as TrainingSession;
    const h = hourBreakdown(s);
    expect(h.lift + h.rest).toBe(h.total);
    expect(h.total).toBe(3_000_000);
    expect(h.rest).toBe(390_000);
    expect(h.longestRest).toBe(300_000);
  });
});
