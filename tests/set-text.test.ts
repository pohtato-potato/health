import { describe, expect, it } from 'vitest';
import { fmtSet } from '../src/domain/setText';
import type { SetEntry } from '../src/domain/types';

const set = (o: Partial<SetEntry>) => ({ loadKg: 10, reps: 12, ...o }) as SetEntry;
describe('fmtSet: a set in words, as Train and Today show records', () => {
  it('load and reps', () => expect(fmtSet(set({}))).toBe('10 kg × 12'));
  it('bodyweight shows only reps', () => expect(fmtSet(set({ loadKg: null }))).toBe('12'));
  it('a timed set shows seconds', () => expect(fmtSet(set({ loadKg: null, reps: undefined, seconds: 45 }))).toBe('45 s'));
});
