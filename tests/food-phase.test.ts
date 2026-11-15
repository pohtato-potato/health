import { describe, expect, it } from 'vitest';
import { phaseLine } from '../src/domain/phase';
import type { Targets, TargetsRecord } from '../src/domain/types';

const t = (kcalMin: number, kcalMax: number, proteinG: number): Targets => ({ kcalMin, kcalMax, proteinG, steps: 8000, waterMl: 2500, sleepMin: 420, sessionsPerWeek: 3 });

describe('Food’s phase line, read from settings', () => {
  const recs: TargetsRecord[] = [
    { from: '2026-01-01', targets: t(1000, 1100, 50), name: 'Test phase' },
    { from: '2026-02-10', targets: t(900, 1000, 60), name: 'Next test' },
  ];
  it('names the phase on now, until the day before the next one, with its aims', () => {
    expect(phaseLine(recs, '2026-01-20')).toEqual({ title: 'Test phase until 9 Feb', line: 'Aim 1,000 to 1,100 and 50 g of protein. The next test starts on 10 Feb at about 950.' });
  });
  it('without names says "These aims" and "New aims start"', () => {
    const plain = recs.map(({ name: _n, ...r }) => r);
    expect(phaseLine(plain, '2026-01-20')?.title).toBe('These aims until 9 Feb');
    expect(phaseLine(plain, '2026-01-20')?.line).toContain('New aims start on 10 Feb');
  });
  it('the last phase has no "until"', () => {
    expect(phaseLine(recs, '2026-03-01')).toEqual({ title: 'Next test', line: 'Aim 900 to 1,000 and 60 g of protein.' });
  });
  it('says nothing before any targets', () => {
    expect(phaseLine(recs, '2025-12-01')).toBeUndefined();
    expect(phaseLine([], '2026-01-20')).toBeUndefined();
  });
});
