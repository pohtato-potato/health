import { describe, expect, it } from 'vitest';
import { fmtTrackValue, meets, trackStats } from '../src/domain/customTracks';
import type { CustomTrack, TrackValue } from '../src/domain/types';

const track = (extra: Partial<CustomTrack> = {}): CustomTrack => ({ id: 't', name: 'Stretching', kind: 'count', unit: 'min', target: 10, active: true, createdAt: 0, ...extra });
const v = (date: string, value: number): TrackValue => ({ id: date, trackId: 't', date, value, at: 0 });

describe('your own tracks', () => {
  it('judges a day by the target, or by less-is-better', () => {
    expect(meets(track(), 12)).toBe(true);
    expect(meets(track(), 8)).toBe(false);
    expect(meets(track({ lowerIsBetter: true, target: 2 }), 1)).toBe(true);
    expect(meets(track({ kind: 'yesno', target: undefined }), 1)).toBe(true);
    expect(meets(track({ kind: 'yesno', lowerIsBetter: true, target: undefined }), 1)).toBe(false);
    expect(meets(track({ kind: 'scale', target: undefined }), 4)).toBe(true);
  });

  it('formats values by kind', () => {
    expect(fmtTrackValue(track(), 12)).toBe('12 min');
    expect(fmtTrackValue(track({ kind: 'scale' }), 3)).toBe('3 / 5');
    expect(fmtTrackValue(track({ kind: 'yesno' }), 0)).toBe('No');
  });

  it('counts a streak that today can extend but not break', () => {
    const vals = [v('2026-10-01', 12), v('2026-10-02', 15), v('2026-10-03', 11)];
    expect(trackStats(track(), vals, '2026-10-04').streak).toBe(3);
    expect(trackStats(track(), [...vals, v('2026-10-04', 20)], '2026-10-04').streak).toBe(4);
    expect(trackStats(track(), [...vals, v('2026-10-04', 2)], '2026-10-04').streak).toBe(0);
    const s = trackStats(track(), vals, '2026-10-04');
    expect(s.logged7).toBe(3);
    expect(s.hit7).toBe(3);
    expect(s.series).toHaveLength(30);
  });
});
