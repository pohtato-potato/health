import { describe, expect, it } from 'vitest';
import { doneTodayLine, unfinishedInSession } from '../src/domain/trainingChecks';
import { sets } from './fixtures';

const at = (xs: ReturnType<typeof sets>, t0: number, gap: number) => xs.map((s, i) => ({ ...s, at: t0 + i * gap }));

describe('Today tells the same truth as Train about a session', () => {
  const clean = at(sets('row', 'Row', 'today', '2026-10-21', 10, [10, 10, 10]), 0, 60_000);
  const odd = at(sets('rdl', 'RDL', 'today', '2026-10-21', 10, [8, 1, 1, 1, 1]), 10, 60_000);
  const before = at(sets('rdl', 'RDL', 'before', '2026-10-19', 10, [8, 8]), -86_400_000, 60_000);

  it('counts only the unfinished sets of that session, with the same check Train uses', () => {
    expect(unfinishedInSession('today', [...before, ...clean, ...odd])).toBe(4);
    expect(unfinishedInSession('before', [...before, ...clean, ...odd])).toBe(0);
  });

  it('leaves out sets the owner kept as real', () => {
    expect(unfinishedInSession('today', [...clean, ...odd], odd.slice(1, 3).map((s) => s.id))).toBe(2);
  });

  it('a clean session reads as done, with its length and sets', () => {
    expect(doneTodayLine({ mins: 52, later: false, sets: 12, short: false, unfinished: 0 })).toEqual({ clean: true, text: '52 min · 12 sets' });
    expect(doneTodayLine({ mins: 52, later: true, sets: 1, short: true, unfinished: 0 }).text).toBe('Logged later · 1 set · short');
  });

  it('unfinished sets replace the finish line with a plain pointer to Train', () => {
    expect(doneTodayLine({ mins: 234, later: false, sets: 3, short: false, unfinished: 4 })).toEqual({ clean: false, text: '4 sets look unfinished · check on Train' });
    expect(doneTodayLine({ mins: 234, later: false, sets: 3, short: false, unfinished: 1 }).text).toBe('1 set looks unfinished · check on Train');
  });
});
