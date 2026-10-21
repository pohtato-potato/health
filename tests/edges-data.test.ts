import { describe, expect, it } from 'vitest';
import { addSetup, legSets, setupOn } from '../src/domain/sessionEdges';
import type { ExerciseDef } from '../src/domain/plan';

const ex = (p: Partial<ExerciseDef> = {}): ExerciseDef => ({ id: 'curl', order: '1', name: 'Curl', sets: 3, reps: [10, 15], load: 'pair', ...p });

describe('personal setups', () => {
  const setups = { curl: [{ from: '2026-10-01', text: 'Chair at the wall' }, { from: '2026-10-15', text: 'Chair turned sideways' }] };
  it('picks the latest version on or before the day', () => {
    expect(setupOn({ setups }, ex(), '2026-10-20')).toEqual({ text: 'Chair turned sideways', from: '2026-10-15' });
    expect(setupOn({ setups }, ex(), '2026-10-10')).toEqual({ text: 'Chair at the wall', from: '2026-10-01' });
  });
  it('falls back to the plan, then to nothing', () => {
    expect(setupOn({}, ex({ setup: 'Seat high' }), '2026-10-20')).toEqual({ text: 'Seat high' });
    expect(setupOn({}, ex(), '2026-10-20')).toBeUndefined();
  });
  it('a change on the same day replaces it; on a new day it adds a version', () => {
    expect(addSetup(setups, 'curl', '2026-10-15', 'Bench')).toEqual({ curl: [setups.curl[0], { from: '2026-10-15', text: 'Bench' }] });
    expect(addSetup(setups, 'curl', '2026-10-21', 'Bench').curl).toHaveLength(3);
    expect(addSetup(undefined, 'row', '2026-10-21', 'Knee on chair')).toEqual({ row: [{ from: '2026-10-21', text: 'Knee on chair' }] });
  });
});

describe('the leg check', () => {
  const squat = ex({ id: 'squat', name: 'Goblet squat' });
  it('drops leg work to one set at 4 or 5', () => {
    expect(legSets(squat, 4)).toBe(1);
    expect(legSets(squat, 3)).toBe(3);
    expect(legSets(squat, undefined)).toBe(3);
  });
  it('leaves other work alone', () => expect(legSets(ex({ id: 'press', name: 'Floor press' }), 5)).toBe(3));
});
