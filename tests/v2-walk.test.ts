import { describe, expect, it } from 'vitest';
import { loadedSteps } from '../src/walk/lines';
import type { SetEntry } from '../src/domain/types';

describe('carried steps', () => {
  it('loaded steps from carry sets', () => {
    const sets = [
      { date: '2026-10-01', steps: 70, exerciseId: 'farmer-carry' },
      { date: '2026-10-01', steps: 80, exerciseId: 'farmer-carry' },
      { date: '2026-10-02', reps: 12, exerciseId: 'row' },
      { date: '2026-10-02', steps: 60, exerciseId: 'farmer-carry', skipped: true },
    ] as SetEntry[];
    const l = loadedSteps(sets);
    expect(l.get('2026-10-01')).toBe(150);
    expect(l.has('2026-10-02')).toBe(false);
  });
});
