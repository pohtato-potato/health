import { describe, expect, it } from 'vitest';
import { pendingSwaps } from '../src/state/derived';
import { PLAN } from './fixtures';
import type { TrainingSession } from '../src/domain/types';

const at = (iso: string) => Date.parse(iso);
const session = (id: string, kind: string, started: string): TrainingSession => ({ id, date: started.slice(0, 10), session: kind, planName: 'Test', startedAt: at(started), endedAt: at(started) + 3.6e6, status: 'done', short: false, exercises: [] });

describe('pain logged mid-set does what the finale flag does (d-pain)', () => {
  const pain = { kind: 'pain' as const, exerciseId: 'lunge', at: at('2026-11-10T18:20:00Z'), date: '2026-11-10' };
  it('the next session of that kind offers the plan’s own swap', () => {
    const s = pendingSwaps(PLAN, [session('a', 'A', '2026-11-10T18:00:00Z')], [], [pain]);
    expect(s.map((x) => `${x.from}>${x.to}`)).toEqual(['lunge>squat']);
    expect(s[0].date).toBe('2026-11-10');
  });
  it('once that session is done, the swap has been used', () => {
    expect(pendingSwaps(PLAN, [session('b', 'B', '2026-11-12T18:00:00Z')], [], [pain])).toEqual([]);
  });
  it('soreness, tightness and whole-body entries never swap; nor does pain with no exercise', () => {
    for (const kind of ['sore', 'tight', 'felt'] as const) expect(pendingSwaps(PLAN, [], [], [{ ...pain, kind }])).toEqual([]);
    expect(pendingSwaps(PLAN, [], [], [{ ...pain, exerciseId: undefined }])).toEqual([]);
  });
  it('a strain counts like pain', () => {
    expect(pendingSwaps(PLAN, [], [], [{ ...pain, kind: 'strain' }])).toHaveLength(1);
  });
});
