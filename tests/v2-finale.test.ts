import { describe, expect, it } from 'vitest';
import { sessionQuality } from '../src/domain/sessionQuality';
import type { SetEntry } from '../src/domain/types';

let n = 0;
const set = (extra: Partial<SetEntry> = {}): SetEntry => ({ id: `s${++n}`, sessionId: 'x', date: '2026-10-13', session: 'A', exerciseId: 'row', exercise: 'Row', setNo: 1, side: 'both', loadKg: 10, reps: 12, at: n, ...extra });

describe('session quality', () => {
  it('quality 0–100 and stable with skipped sets', () => {
    const good = [set({ form: 5, rir: 2 }), set({ form: 4, rir: 1 }), set({ form: 5, rir: 2 })];
    const q = sessionQuality(good);
    expect(q).toBeGreaterThan(85);
    expect(q).toBeLessThanOrEqual(100);
    const withSkip = sessionQuality([...good, set({ skipped: true, reps: undefined, loadKg: null })]);
    expect(Number.isFinite(withSkip)).toBe(true);
    expect(withSkip).toBeLessThan(q);
    expect(withSkip).toBeGreaterThan(q - 15);
    expect(sessionQuality([set({ skipped: true })])).toBeGreaterThanOrEqual(0);
    expect(sessionQuality([])).toBe(0);
  });

  it('sloppy, all-out sets score lower than solid ones', () => {
    const sloppy = sessionQuality([set({ form: 2, rir: 0 }), set({ form: 1, rir: 0 })]);
    const solid = sessionQuality([set({ form: 4, rir: 2 }), set({ form: 4, rir: 1 })]);
    expect(sloppy).toBeLessThan(solid);
  });

  it('unrated sets count as middling, not zero', () => {
    const q = sessionQuality([set(), set()]);
    expect(q).toBeGreaterThan(50);
    expect(q).toBeLessThan(90);
  });
});
