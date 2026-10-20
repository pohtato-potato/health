import { describe, expect, it } from 'vitest';
import { loadOptions } from '../src/domain/loads';
import { heldBackBy, heldBackText } from '../src/domain/readiness';
import { loggedLater, looksUnfinished, movementKind, neglectedExercises, suspiciousSets } from '../src/domain/trainingChecks';
import type { TrainingSession } from '../src/domain/types';
import { PLAN, sets } from './fixtures';

const at = (xs: ReturnType<typeof sets>, t0: number, gap: number) => xs.map((s, i) => ({ ...s, at: t0 + i * gap }));

describe('unfinished sets (#13, #14)', () => {
  it('asks under 30% of the reference, or at 1 rep with no weight', () => {
    expect(looksUnfinished({ reps: 1, loadKg: 10 }, 8)).toBe(true);
    expect(looksUnfinished({ reps: 5, loadKg: 10 }, 15)).toBe(false);
    expect(looksUnfinished({ reps: 1, loadKg: null }, undefined)).toBe(true);
  });
  it('finds RDL 8, 1, 1 and band "x1" rows in history, and leaves kept ones alone', () => {
    const rdl = at(sets('rdl', 'RDL', 's1', '2026-10-12', 10, [8, 1, 1]), 0, 60_000);
    const band = at(sets('face-pull', 'Band face pull', 's1', '2026-10-12', null, [1, 1]), 10, 60_000);
    const odd = suspiciousSets([...rdl, ...band]);
    expect(odd.map((s) => `${s.exerciseId}:${s.reps}`).sort()).toEqual(['face-pull:1', 'face-pull:1', 'rdl:1', 'rdl:1']);
    expect(suspiciousSets([...rdl, ...band], odd.map((s) => s.id))).toEqual([]);
  });
});

describe('always skipped (#15)', () => {
  it('names an exercise left out of the last 3 sessions that listed it', () => {
    const s = (id: string, t: number): TrainingSession => ({ id, date: '2026-10-01', session: 'A', planName: 'x', startedAt: t, status: 'done', short: false, exercises: ['row', 'carry'] });
    const sessions = [s('a', 1), s('b', 2), s('c', 3)];
    const done = ['a', 'b', 'c'].flatMap((id) => sets('row', 'Row', id, '2026-10-01', 10, [12]));
    expect(neglectedExercises(PLAN, sessions, done).map((n) => n.exerciseId)).toEqual(['carry']);
    expect(neglectedExercises(PLAN, sessions, done, 3, { carry: 2 })).toEqual([]);
  });
});

describe('swaps keep the movement type (#16)', () => {
  it('split squat is legs, curl is pull', () => {
    expect(movementKind({ id: 'split-squat', name: 'Split squat' })).toBe('legs');
    expect(movementKind({ id: 'goblet-squat', name: 'Goblet squat' })).toBe('legs');
    expect(movementKind({ id: 'curl', name: 'Curl' })).toBe('pull');
  });
});

describe('bar capacity (#24)', () => {
  it('only counts loads whose plates fit on the sleeve', () => {
    const eq = { plates: [{ kg: 2.5, count: 8, owned: true, thicknessMm: 30 }], fixed: [], band: true, bench: '' };
    expect(loadOptions(eq, 'single')).toEqual([5, 10, 15, 20]);
    expect(loadOptions({ ...eq, sleeveMm: 60 }, 'single')).toEqual([5, 10]);
    const iron = { ...eq, sleeveMm: 60, plates: [...eq.plates, { kg: 5, count: 4, owned: true, thicknessMm: 20 }] };
    expect(loadOptions(iron, 'single')).toContain(15);
  });
});

describe('readiness explains a low score (#25)', () => {
  it('names the two biggest drags', () => {
    const r = { score: 66, parts: [{ key: 'sleep' as const, label: 'Slept 6 h, 1 h short', delta: -5 }, { key: 'energy' as const, label: 'Energy 4 of 5', delta: 3 }, { key: 'restDays' as const, label: 'Trained yesterday', delta: -3 }, { key: 'office' as const, label: 'Office day', delta: -2 }] };
    expect(heldBackBy(r).map((p) => p.key)).toEqual(['sleep', 'restDays']);
    expect(heldBackText(r)).toBe('Held back most by slept 6 h, 1 h short (−5) and trained yesterday (−3).');
    expect(heldBackBy({ ...r, score: 85 })).toEqual([]);
  });
});

describe('logged later (#26)', () => {
  it('28 sets in 9 minutes is logged later; a real session is not', () => {
    expect(loggedLater(Array.from({ length: 28 }, (_, i) => ({ at: i * 19_000 })))).toBe(true);
    expect(loggedLater(Array.from({ length: 20 }, (_, i) => ({ at: i * 150_000 })))).toBe(false);
  });
});
