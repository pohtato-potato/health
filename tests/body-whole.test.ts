import { describe, expect, it } from 'vitest';
import { bodyTileWords, isWholeBody, kindOf, labelFor, WHOLE_BODY } from '../src/domain/bodyLog';
import { lighterCase } from '../src/domain/deload';

describe('whole-body entries in the body log (y-body)', () => {
  it('headache, constipation, stomach and a poor night, one tap each', () => {
    expect(WHOLE_BODY.map((w) => w.part)).toEqual(['Headache', 'Constipation', 'Stomach', 'Poor night']);
    expect(isWholeBody('Headache')).toBe(true);
    expect(isWholeBody('Knee')).toBe(false);
  });
  it('they read plainly on Today', () => {
    expect(labelFor('Poor night')).toBe('A poor night');
    expect(kindOf('felt').label).toBe('Felt');
    expect(bodyTileWords([{ id: '1', date: '2026-11-12', at: 1, part: 'Headache', kind: 'felt' }], '2026-11-12')).toBe('Headache');
  });
  it('never count as pain for the lighter-week rule', () => {
    const body = ['2026-11-10', '2026-11-11', '2026-11-12'].map((date) => ({ date, kind: 'felt' as const }));
    const r = lighterCase({ sessions: [], sets: [], days: [], body }, '2026-11-12');
    expect(r.evidence.some((e) => /Pain/.test(e))).toBe(false);
  });
});
