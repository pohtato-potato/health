import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import { CITIES, kmFromSteps } from '../src/domain/walk';
import { HINDI } from '../src/walk/hindi';
import { stoneFor, timeAtPace, tomorrowLine, usualAndBig, whereLine, whereNow } from '../src/walk/page';

// The real road starts Delhi 0, Agra 230, Gwalior 350.
describe('where you are, and tomorrow', () => {
  it('says near within 20 km of a place, between otherwise', () => {
    expect(whereLine(whereNow(210))).toBe('Near Agra');
    expect(whereLine(whereNow(250))).toBe('Near Agra');
    expect(whereLine(whereNow(250.1))).toBe('Between Agra and Gwalior');
    expect(whereLine(whereNow(330))).toBe('Near Gwalior');
    expect(whereLine(whereNow(0))).toBe('Near Delhi');
  });

  it('says the end of the road past the last stop', () => {
    expect(whereLine(whereNow(1e9))).toBe('Leh, the end of the road');
    expect(stoneFor(1e9)).toBeUndefined();
    expect(tomorrowLine(1e9, 10, 15)).toBeUndefined();
  });

  it('takes the usual and a big day from the last 28 days with steps', () => {
    const days = Array.from({ length: 30 }, (_, i) => ({ date: addDays('2026-03-31', -i - 1), steps: 10_000 + i * 100 }));
    const u = usualAndBig(days, '2026-03-31');
    expect(u.known).toBe(true);
    expect(u.usualKm).toBeCloseTo(kmFromSteps(11_350), 5); // median of 10,000…12,700
    expect(u.bigKm).toBeCloseTo(kmFromSteps(12_500), 5); // 90th percentile, nearest rank (the 26th of 28)
  });

  it('falls back to 10 km with fewer than 7 days, and ignores today', () => {
    expect(usualAndBig([{ date: '2026-03-31', steps: 40_000 }], '2026-03-31')).toEqual({ usualKm: 10, bigKm: 15, known: false });
    expect(usualAndBig([], '2026-03-31').usualKm).toBe(10);
  });

  it('says how long at your pace', () => {
    expect(timeAtPace(90, 10)).toBe('about 9 days');
    expect(timeAtPace(387, 10)).toBe('about 6 weeks');
    expect(timeAtPace(1200, 10)).toBe('about 4 months');
    expect(timeAtPace(10_000, 10)).toBe('about 2.7 years');
  });

  it('says what tomorrow reaches', () => {
    expect(tomorrowLine(225, 10, 15)).toBe('Tomorrow: a usual day reaches Agra.');
    expect(tomorrowLine(300, 10, 55)).toBe('Tomorrow: a usual day takes you to 40 km from Gwalior. A big day reaches it.');
    expect(tomorrowLine(240, 10, 15)).toBe('Tomorrow: a usual day takes you to 100 km from Gwalior.');
  });

  it('puts the next stop on the stone, in Hindi, for every city', () => {
    expect(stoneFor(238)).toEqual({ name: 'Gwalior', hindi: 'ग्वालियर', km: 112 });
    for (const c of CITIES) expect(HINDI[c], c).toMatch(/[ऀ-ॿ]/);
  });
});
