import { describe, expect, it } from 'vitest';
import { markFor } from '../src/domain/marks';
import { cleanOf, cueFor, FORM_LABELS, topFault } from '../src/domain/quality';
import { challengeRest } from '../src/domain/setChallenges';
import type { ExerciseDef } from '../src/domain/plan';
import type { SetEntry } from '../src/domain/types';

let n = 0;
const set = (sessionId: string, reps: number, extra: Partial<SetEntry> = {}): SetEntry => ({ id: `s${++n}`, sessionId, date: '2026-10-01', session: 'A', exerciseId: 'press', exercise: 'Press', setNo: 1, side: 'both', loadKg: 10, reps, at: n, ...extra });
const press: ExerciseDef = { id: 'press', order: '1', name: 'Press', sets: 3, reps: [10, 15], load: 'pair', restSec: 90, cue: 'Elbows under the wrists.' };

describe('form, clean reps and challenges', () => {
  it('form has five words', () => {
    expect(FORM_LABELS).toEqual(['sloppy', 'shaky', 'okay', 'solid', 'textbook']);
  });

  it('cleanOf uses clean reps when given', () => {
    expect(cleanOf(set('a', 15, { cleanReps: 9 }))).toBe(9);
    expect(cleanOf(set('a', 12))).toBe(12);
  });

  it('challenge at equal reps marks !', () => {
    const last = [set('a', 12)];
    expect(markFor(set('b', 12, { challenges: ['pause-bottom'] }), last, last)).toBe('!');
    expect(markFor(set('b', 12), last, last)).toBe('=');
    const lastWith = [set('a', 12, { challenges: ['pause-bottom'] })];
    expect(markFor(set('b', 12, { challenges: ['pause-bottom'] }), lastWith, lastWith)).toBe('=');
  });

  it('clean-rep record: 13 clean beats 15 with 9 clean', () => {
    const prior = [set('a', 15, { cleanReps: 9 })];
    expect(markFor(set('b', 13), prior, prior, 1, { clean: true })).toBe('!!');
    expect(markFor(set('b', 13), prior, prior, 1, { clean: false })).toBeUndefined();
  });

  it('cue targets most frequent fault in last 3 sessions', () => {
    const sets = [
      set('s1', 12, { faults: ['elbows-flared'], at: 1 }),
      set('s2', 12, { faults: ['rushed-lowering'], at: 2 }),
      set('s3', 12, { faults: ['rushed-lowering', 'partial-range'], at: 3 }),
      set('s4', 12, { faults: ['rushed-lowering'], at: 4 }),
      set('s0', 12, { faults: ['elbows-flared'], at: 0 }),
      set('s0', 12, { faults: ['elbows-flared'], at: 0.5 }),
    ];
    expect(topFault(sets)).toBe('rushed-lowering');
    expect(cueFor(press, sets)).toMatch(/lower/i);
    expect(cueFor(press, [])).toBe('Elbows under the wrists.');
  });

  it('shorter rest cuts the rest by a third', () => {
    expect(challengeRest(press, { challenges: ['shorter-rest'] })).toBe(60);
    expect(challengeRest(press, {})).toBe(90);
  });
});
