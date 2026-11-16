// Finding 12 (O42): every building says what counts, which days counted, and roughly how long is left.
import { describe, expect, it } from 'vitest';
import { noteDay } from '../../src/football/counted';
import { countedLine, countsLine, daysLeft, leftLine } from '../../src/football/tree/buildingWords';
import { bundleDay, BUNDLES } from '../../src/football/ground';

const needs = [{ what: 'steps', count: 30 }, { what: 'training', count: 12 }];
describe('a building in plain words', () => {
  it('says what counts', () => {
    expect(countsLine(needs)).toBe('Counts days at the step goal and training sessions.');
  });
  it('keeps the days that counted, and when it began', () => {
    let s = { id: 'x', progress: {} } as { id: string; progress: Record<string, number>; from?: string; counted?: string[] };
    s = noteDay(s, '2026-11-16', false);
    s = noteDay(s, '2026-11-17', true);
    s = noteDay(s, '2026-11-21', true);
    expect(s).toMatchObject({ from: '2026-11-16', counted: ['2026-11-17', '2026-11-21'] });
    expect(countedLine(s)).toBe('Counted lately: Tue 17 Nov, Sat 21 Nov.');
    expect(countedLine({ progress: {}, from: '2026-11-16' })).toBe('No day has counted since Mon 16 Nov.');
  });
  it('the 28 days before arrival are said once', () => {
    expect(countedLine({ progress: {}, credit: '2026-11-15', counted: ['2026-11-01'] })).toBe('Your 28 days before arrival counted once. No day has counted since arrival.');
  });
  it('time left from the rate so far; none when a need has never moved', () => {
    expect(daysLeft(needs, { progress: { steps: 14, training: 6 }, from: '2026-10-18' }, '2026-11-14')).toBe(Math.ceil(16 / (14 / 28)));
    expect(leftLine(needs, { progress: { steps: 14, training: 6 }, from: '2026-10-18' }, '2026-11-14')).toBe('About 5 weeks to go at this rate.');
    expect(leftLine(needs, { progress: { steps: 1, training: 0 }, from: '2026-11-17' }, '2026-11-21')).toBe('No rate yet: it moves from the first day that counts.');
  });
  it('a ground bundle notes the day it counted', () => {
    const b = BUNDLES.find((x) => x.needs.some((n) => n.what === 'steps'))!;
    const counts = Object.fromEntries(['steps', 'training', 'sleep', 'protein', 'kcal', 'bedtime', 'meds', 'youth', 'none'].map((k) => [k, k === 'steps' ? 1 : 0])) as never;
    expect(bundleDay(b, { id: b.id, progress: {} }, counts, -1, '2026-11-17').state.counted).toEqual(['2026-11-17']);
  });
});

describe('finding 14: each open tech says when', async () => {
  const { etaWords, researchRate } = await import('../../src/football/tree/buildingWords');
  it('banks about 6 a day: 140 from 88 is about 9 days', () => {
    const gains = Array.from({ length: 14 }, (_, i) => ({ on: `2026-11-${String(8 + i).padStart(2, '0')}`, n: 6 }));
    const r = researchRate(gains, '2026-11-21');
    expect(r).toBe(6);
    expect(etaWords(140, 88, r)).toBe('In about 9 days at this rate.');
    expect(etaWords(80, 88, r)).toBe('The bank covers it now.');
    expect(etaWords(140, 88, 0)).toBe('No research came in lately, so no date yet.');
  });
});
