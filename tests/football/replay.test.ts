import './helpers/windowStub';
import { describe, expect, it } from 'vitest';
import { lengthOf, MAX_BIG_MS, MAX_NORMAL_MS, skipToEnd, timeline, WAVES, type Step } from '../../src/screens/football/match/Replay';
import type { ChanceEvent, MatchEvents } from '../../src/football/types';
import { allAxes } from '../../src/football/types';

const ch = (i: number, side: 'atk' | 'def', ok: boolean, extra: Partial<ChanceEvent> = {}): ChanceEvent => ({
  minute: 5 + i * 11, side, type: side === 'atk' ? 'Counter-attack' : 'Corner', mods: [], values: allAxes(12), reach: 0.5, pct: 45, land: [0.1, 0.1], ok, glDist: null, ...extra,
});
const match = (chances: ChanceEvent[]): MatchEvents => {
  let a = 0, b = 0;
  for (const c of chances) if (c.side === 'atk' && c.ok) a++; else if (c.side === 'def' && !c.ok) b++;
  return { seed: 1, chances, score: [a, b], xg: [1.2, 0.8], moments: [] };
};
const kinds = (s: Step[], i: number) => s.filter((x) => x.chance === i).map((x) => x.kind);

describe('replay timeline', () => {
  it('8 chances on a big night stay under 180 s, even all goals with goal-line checks', () => {
    const m = match(Array.from({ length: 8 }, (_, i) => ch(i, 'atk', true, { glDist: 0.01, tag: i === 0 ? 'SCREAMER' : undefined })));
    expect(lengthOf(timeline(m, true))).toBeLessThanOrEqual(MAX_BIG_MS);
  });

  it('6 chances on a normal night stay under 90 s', () => {
    const m = match(Array.from({ length: 6 }, (_, i) => ch(i, i % 2 ? 'def' : 'atk', i % 3 === 0, { glDist: i === 2 ? 0.02 : null })));
    expect(lengthOf(timeline(m, false))).toBeLessThanOrEqual(MAX_NORMAL_MS);
    const worst = match(Array.from({ length: 6 }, (_, i) => ch(i, 'atk', true, { glDist: 0.01 })));
    expect(lengthOf(timeline(worst, false))).toBeLessThanOrEqual(MAX_NORMAL_MS);
  });

  it('every chance plays phase, mods, pct, fly, result in that order', () => {
    const m = match([ch(0, 'atk', true), ch(1, 'def', true), ch(2, 'atk', false)]);
    const s = timeline(m, false);
    for (let i = 0; i < 3; i++) expect(kinds(s, i).filter((k) => k !== 'feed')).toEqual(['phase', 'mod', 'pct', 'fly', 'result']);
    for (let k = 1; k < s.length; k++) expect(s[k].at).toBeGreaterThanOrEqual(s[k - 1].at);
  });

  it('goal-line steps appear only when glDist is set', () => {
    const s = timeline(match([ch(0, 'atk', true, { glDist: 0.02 }), ch(1, 'atk', false)]), false);
    expect(kinds(s, 0)).toContain('goalline');
    expect(kinds(s, 1)).not.toContain('goalline');
  });

  it('a retake says Chance 2 of 2 and flies twice', () => {
    const s = timeline(match([ch(0, 'atk', true, { pct: 40, retake: { land: [0, 0], ok: true, why: 'Second wind' } })]), false);
    const b = s.find((x) => x.kind === 'banner')!;
    expect(b.data.text).toContain('Chance 2 of 2');
    expect(kinds(s, 0).filter((k) => k === 'fly')).toHaveLength(2);
    expect(s.filter((x) => x.kind === 'result' && x.chance === 0)[0].data.ok).toBe(false);
  });

  it('takeovers come for a screamer, and for every goal on a big night', () => {
    const normal = timeline(match([ch(0, 'atk', true, { tag: 'SCREAMER', pct: 12 }), ch(1, 'atk', true)]), false).filter((x) => x.kind === 'result');
    expect(normal.map((x) => x.data.takeover)).toEqual(['screamer', undefined]);
    const big = timeline(match([ch(0, 'atk', true), ch(1, 'atk', true), ch(2, 'def', false)]), true).filter((x) => x.kind === 'result');
    expect(big.map((x) => x.data.takeover)).toEqual(['big', 'big', undefined]);
  });

  it('the shockwave cycles through five kinds in order across the goals', () => {
    const s = timeline(match(Array.from({ length: 7 }, (_, i) => ch(i, 'atk', true))), false);
    expect(s.filter((x) => x.data.wave).map((x) => x.data.wave)).toEqual([...WAVES, WAVES[0], WAVES[1]]);
  });

  it('a stopped attack is a save and a conceded one is a goal against', () => {
    const s = timeline(match([ch(0, 'def', true), ch(1, 'def', false)]), false).filter((x) => x.kind === 'result');
    expect(s[0].data.save).toBe(true);
    expect(s[1].data.goal).toBe('against');
  });

  it('bookends: kick-off, half-time once, full time with the score', () => {
    const m = match([ch(0, 'atk', true), ch(5, 'def', false)]);
    const s = timeline(m, false).filter((x) => x.data.bookend);
    expect(s.map((x) => x.data.bookend)).toEqual(['kickoff', 'halftime', 'fulltime']);
    expect(s[2].data.score).toEqual(m.score);
  });

  it('skipToEnd gives the stored score', () => {
    const m = match([ch(0, 'atk', true), ch(1, 'atk', true), ch(2, 'def', false)]);
    expect(skipToEnd(m).score).toEqual([2, 1]);
  });
});

import { viewAt } from '../../src/screens/football/Match';
describe('match view', () => {
  it('a takeover stays up after the feed line that follows it, until the next chance', () => {
    const m = match([ch(0, 'atk', true, { tag: 'SCREAMER' }), ch(1, 'def', true)]);
    const s = timeline(m, false);
    const r = s.findIndex((x) => x.kind === 'result');
    expect(s[r + 1].kind).toBe('feed');
    expect(viewAt(s, m.chances, r + 1).takeover?.kind).toBe('screamer');
    const next = s.findIndex((x, k) => k > r && x.kind === 'phase');
    expect(viewAt(s, m.chances, next).takeover).toBeUndefined();
  });
  it('the end view carries the stored score', () => {
    const m = match([ch(0, 'atk', true), ch(1, 'def', false), ch(2, 'atk', true)]);
    const s = timeline(m, false);
    const v = viewAt(s, m.chances, s.length - 1);
    expect(v.score).toEqual(m.score);
    expect(v.done).toBe(true);
  });
});
