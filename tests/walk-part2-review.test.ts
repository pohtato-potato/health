import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import { ALL_STOPS, STRIDE_M } from '../src/domain/walk';
import { HINDI } from '../src/walk/hindi';
import { arrivedToday, nearestPlace, usualAndBig } from '../src/walk/page';

const stepsFor = (km: number) => Math.round((km * 1000) / STRIDE_M);

describe('part 2 review fixes', () => {
  it('says an arrival when a city is reached again, later in the walk', () => {
    const delhiAgain = ALL_STOPS.filter((s) => s.name === 'Delhi')[1];
    expect(delhiAgain).toBeTruthy();
    const steps = new Map([['2026-01-01', stepsFor(delhiAgain.km - 5)], ['2026-01-02', stepsFor(10)]]);
    expect(arrivedToday(steps, '2026-01-02')).toBe('Delhi');
  });

  it('doesn’t say you arrived where you start', () => {
    expect(arrivedToday(new Map([['2026-01-01', 1000]]), '2026-01-01')).toBeUndefined();
  });

  it('names the nearer place for a camp between two', () => {
    expect(nearestPlace(240)).toBe('Agra'); // 10 km past Agra, 110 to Gwalior
    expect(nearestPlace(340)).toBe('Gwalior');
  });

  it('leaves estimated steps out of the usual day, as everywhere else', () => {
    // seven measured days of 10,000 and three estimated days of 40,000
    const days = Array.from({ length: 10 }, (_, i) => ({ date: addDays('2026-03-31', -i - 1), steps: i < 3 ? 40_000 : 10_000, stepsEstimated: i < 3 ? true : undefined }));
    expect(usualAndBig(days, '2026-03-31').bigKm).toBeCloseTo(7.4, 5);
  });

  it('spells Daman as in Hindi', () => expect(HINDI.Daman).toBe('दमन'));
});
