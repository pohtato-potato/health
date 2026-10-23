import { describe, expect, it } from 'vitest';
import { PASSES, passAhead } from '../src/walk/passes';
import { strengthIndex } from '../src/domain/strength';
import { SOUVENIRS, souvenirFor } from '../src/walk/souvenirs';
import { ALL_STATES, kmFromSteps, positionAt, setStride, strideM } from '../src/domain/walk';
import type { SetEntry } from '../src/domain/types';

describe('passes are places on the road', () => {
  it('names the next pass when it comes before the next stop, and never holds the walk back', () => {
    const p = PASSES[0];
    const next = positionAt(p.km - 10).to!.km;
    expect(passAhead(p.km - 10, next)?.id).toBe(p.id);
    expect(passAhead(p.km + 1, positionAt(p.km + 1).to?.km)?.id).not.toBe(p.id);
    expect(passAhead(500, positionAt(500).to!.km)).toBeUndefined();
    expect(positionAt(p.km + 100).km).toBe(p.km + 100);
  });
});

describe('stride', () => {
  it('uses the setting for every distance, and 0.74 m when unset or out of range', () => {
    expect(kmFromSteps(10000)).toBeCloseTo(7.4);
    setStride(0.8);
    expect(strideM()).toBe(0.8);
    expect(kmFromSteps(10000)).toBeCloseTo(8);
    setStride(5);
    expect(strideM()).toBe(0.74);
    setStride(undefined);
    expect(kmFromSteps(10000)).toBeCloseTo(7.4);
  });
});

describe('strength index', () => {
  it('per cent above your first month, across lifts', () => {
    const set = (date: string, exerciseId: string, loadKg: number, reps: number) => ({ id: date + exerciseId, sessionId: date, date, session: 'A', exerciseId, exercise: exerciseId, setNo: 1, side: 'both', loadKg, reps, at: 0 }) as SetEntry;
    const sets = [set('2026-09-01', 'row', 10, 10), set('2026-09-01', 'press', 10, 10), set('2026-11-20', 'row', 12, 10), set('2026-11-20', 'press', 11, 10)];
    expect(strengthIndex(sets, '2026-11-25')).toBe(15);
    expect(strengthIndex(sets.slice(0, 2), '2026-09-05')).toBe(0);
  });
});

describe('souvenirs', () => {
  it('every state and territory still has one named, for the passport round', () => {
    for (const s of new Set(ALL_STATES.map((x) => x.name))) expect(souvenirFor(s), s).toBeTruthy();
    expect(Object.keys(SOUVENIRS).length).toBeGreaterThanOrEqual(36);
  });
});
