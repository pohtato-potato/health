// Finding 17 (O42): an open session quiet for four hours is asked about once, and its clock stops at the last set.
import { describe, expect, it } from 'vitest';
import { askQuiet, QUIET_MS, sessionClock } from '../src/domain/quietSession';

const start = Date.UTC(2026, 10, 16, 12, 0);
const s = { startedAt: start };
const sets = [{ at: start + 10 * 60_000 }, { at: start + 20 * 60_000 }];

describe('a quiet session', () => {
  it('runs while sets come in, stops at the last set after four quiet hours', () => {
    expect(sessionClock(s, sets, start + 60 * 60_000)).toBe(60 * 60_000);
    expect(sessionClock(s, sets, start + 20 * 60_000 + QUIET_MS + 1)).toBe(20 * 60_000);
    expect(sessionClock(s, sets, start + 7 * 24 * 3_600_000)).toBe(20 * 60_000);
  });
  it('asks once: not before four hours, not again after "carry on" for the same last set', () => {
    const later = start + 20 * 60_000 + QUIET_MS;
    expect(askQuiet(s, sets, later - 1)).toBe(false);
    expect(askQuiet(s, sets, later)).toBe(true);
    expect(askQuiet({ ...s, quietAsked: start + 20 * 60_000 }, sets, later + 99)).toBe(false);
    expect(askQuiet({ ...s, quietAsked: start + 20 * 60_000 }, [...sets, { at: later }], later + QUIET_MS)).toBe(true);
  });
});
