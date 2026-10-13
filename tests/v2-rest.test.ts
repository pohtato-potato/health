import { describe, expect, it } from 'vitest';
import { batteryMode, restSpans, restState } from '../src/domain/rest';

describe('rest and battery', () => {
  it('rest ends at zero and reports endedAgo', () => {
    const rest = { endsAt: 100_000, total: 90 };
    expect(restState(rest, 40_000)).toEqual({ left: 60 });
    expect(restState(rest, 100_000)).toEqual({ left: 0, endedAgo: 0 });
    expect(restState(rest, 320_000)).toEqual({ left: 0, endedAgo: 220 });
  });

  it('spans sum to session duration', () => {
    const start = 0;
    const end = 3_600_000;
    const rests = [
      { from: 600_000, to: 690_000 },
      { from: 900_000, to: 1_100_000 },
      { from: 3_500_000, to: 3_700_000 },
    ];
    const spans = restSpans(start, end, rests);
    expect(spans.reduce((n, s) => n + (s.to - s.from), 0)).toBe(end - start);
    expect(spans.filter((s) => s.kind === 'rest').reduce((n, s) => n + (s.to - s.from), 0)).toBe(90_000 + 200_000 + 100_000);
    expect(spans[0]).toEqual({ from: 0, to: 600_000, kind: 'lift' });
    for (let i = 1; i < spans.length; i++) expect(spans[i].from).toBe(spans[i - 1].to);
  });

  it('batteryMode without getBattery uses manual', () => {
    expect(batteryMode(undefined, true)).toBe(true);
    expect(batteryMode(undefined, false)).toBe(false);
    expect(batteryMode(0.29, false)).toBe(true);
    expect(batteryMode(0.3, false)).toBe(false);
    expect(batteryMode(0.8, true)).toBe(true);
  });
});
