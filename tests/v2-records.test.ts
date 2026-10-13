import { describe, expect, it } from 'vitest';
import { medalsFor } from '../src/domain/records';
import type { ExerciseDef } from '../src/domain/plan';
import type { SetEntry } from '../src/domain/types';

let n = 0;
const set = (loadKg: number | null, reps: number, extra: Partial<SetEntry> = {}): SetEntry => ({ id: `s${++n}`, sessionId: `x${n}`, date: `2026-10-${String(n).padStart(2, '0')}`, session: 'A', exerciseId: 'row', exercise: 'Row', setNo: 1, side: 'both', loadKg, reps, at: n, ...extra });
const row: ExerciseDef = { id: 'row', order: '1', name: 'Row', sets: 3, reps: [10, 15], load: 'single' };

describe('medals', () => {
  it('gold, silver and bronze by clean reps × load', () => {
    const m = medalsFor(row, [set(10, 15, { cleanReps: 9 }), set(10, 13), set(12.5, 10), set(7.5, 15)]);
    expect(m.map((x) => [x.medal, x.loadKg, x.reps])).toEqual([
      ['gold', 10, 13],
      ['silver', 12.5, 10],
      ['bronze', 7.5, 15],
    ]);
    expect(m[0].clean).toBe(13);
  });

  it('medals ignore skipped and placeholder sets', () => {
    const m = medalsFor(row, [set(null, 1), set(20, 15, { skipped: true }), set(10, 12)]);
    expect(m).toHaveLength(1);
    expect(m[0].loadKg).toBe(10);
  });

  it('empty exercise has no medals', () => {
    expect(medalsFor(row, [])).toEqual([]);
  });
});
