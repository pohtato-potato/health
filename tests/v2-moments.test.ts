import { describe, expect, it } from 'vitest';
import { detectFirsts, MOMENT_KINDS, styleFor } from '../src/domain/firsts';
import type { SetEntry } from '../src/domain/types';

let n = 0;
const set = (loadKg: number | null, reps: number, extra: Partial<SetEntry> = {}): SetEntry => ({ id: `s${++n}`, sessionId: 'x', date: '2026-10-12', session: 'A', exerciseId: 'curl', exercise: 'Hammer curl', setNo: 1, side: 'both', loadKg, reps, at: n, ...extra });

describe('firsts', () => {
  it('first 7.5 kg detected once', () => {
    const history = [set(5, 12), set(5, 14)];
    const first = detectFirsts(history, [set(7.5, 10)]);
    expect(first.map((f) => f.key)).toEqual(['load:7.5']);
    expect(first[0].title).toBe('Your first 7.5 kg');
    expect(detectFirsts([...history, set(7.5, 10)], [set(7.5, 11)])).toEqual([]);
  });

  it('first 20-rep set and first clean set at a new weight', () => {
    const f = detectFirsts([set(5, 18)], [set(5, 20, { form: 5 })]);
    expect(f.map((x) => x.key).sort()).toEqual(['clean:curl:5', 'reps:20']);
  });

  it('skipped and placeholder sets are never firsts', () => {
    expect(detectFirsts([set(5, 12)], [set(10, 12, { skipped: true }), set(null, 1)])).toEqual([]);
  });

  it('nothing is a first on the very first session (it is the baseline)', () => {
    expect(detectFirsts([], [set(5, 12)])).toEqual([]);
  });
});

describe('moment styles', () => {
  it('style map covers every kind', () => {
    for (const k of MOMENT_KINDS) expect(styleFor(k), k).toBeTruthy();
    expect(styleFor('perfect')).toBe('stars');
    expect(styleFor('first')).toBe('polaroid');
    expect(styleFor('arrival')).toBe('train');
    expect(styleFor('chapter')).toBe('fireworks');
  });
});
