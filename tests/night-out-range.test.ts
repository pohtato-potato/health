import { describe, expect, it } from 'vitest';
import { dayRange, fuelSpread, OUT_ORDER, OUT_SIZES, outItem, SPREAD_MAX, SPREAD_MIN } from '../src/domain/nightOut';
import { fuelScore } from '../src/football/axes';
import { playMatch } from '../src/football/engine';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 4 };

describe('a night out, item by item (l-away)', () => {
  it('light, medium and heavy are ranges that grow in order', () => {
    for (let i = 1; i < OUT_ORDER.length; i++) {
      expect(OUT_SIZES[OUT_ORDER[i]].kcal[0]).toBeGreaterThanOrEqual(OUT_SIZES[OUT_ORDER[i - 1]].kcal[0]);
      expect(OUT_SIZES[OUT_ORDER[i]].kcal[1]).toBeGreaterThan(OUT_SIZES[OUT_ORDER[i - 1]].kcal[1]);
    }
  });
  it('an item stores the range, with the middle as its number', () => {
    const e = outItem(' Paneer tikka ', 'medium');
    expect(e.name).toBe('Paneer tikka');
    expect(e.range).toEqual({ size: 'medium', kcal: [350, 700], protein: [15, 35] });
    expect(e.kcal).toBe(525);
    expect(e.protein).toBe(25);
  });
  it('a day adds exact entries to both ends of the range', () => {
    const r = dayRange([{ kcal: 500, protein: 40 }, outItem('Naan', 'light')]);
    expect(r.kcal).toEqual([650, 850]);
    expect(r.protein).toEqual([45, 55]);
    expect(r.ranged).toBe(true);
    expect(dayRange([{ kcal: 500, protein: 40 }]).ranged).toBe(false);
  });
  it('Fuel spreads slightly wider on a ranged day, never on an exact one', () => {
    expect(fuelSpread(dayRange([{ kcal: 2100, protein: 140 }]), T, fuelScore)).toBe(0);
    const s = fuelSpread(dayRange([{ kcal: 1400, protein: 100 }, outItem('Biryani', 'heavy')]), T, fuelScore);
    expect(s).toBeGreaterThanOrEqual(SPREAD_MIN);
    expect(s).toBeLessThanOrEqual(SPREAD_MAX);
  });
});

describe('wider dice stay honest', () => {
  const base = { Pace: 12, Power: 12, Fuel: 12, Rest: 12, Routine: 12, Shape: 12 };
  const match = (seed: number, wide?: number) => playMatch({ seed, values: base, opp: { id: 'tst', rating: 50, reach: 0.65, shrinks: {}, presses: {}, abilities: [] }, home: true, stack: 0, abilities: [], bench: [], pre: [], conds: [], fuelSpread: wide });
  it('each chance names the wider Fuel in its mods', () => {
    const ev = match(7, 2);
    const fuel = ev.chances.flatMap((c) => c.mods).filter((m) => m.kind === 'range');
    expect(fuel.length).toBeGreaterThan(0);
    for (const m of fuel) { expect(m.axis).toBe('Fuel'); expect(Math.abs(m.d)).toBeLessThanOrEqual(2); }
  });
  it('the dice are centred: over many chances Fuel averages what was logged', () => {
    let sum = 0, n = 0;
    for (let s = 1; s <= 300; s++) for (const c of match(s, 2).chances) for (const m of c.mods) if (m.kind === 'range') { sum += m.d; n++; }
    expect(n).toBeGreaterThan(1000);
    expect(Math.abs(sum / n)).toBeLessThan(0.08);
  });
  it('no spread, no change', () => {
    expect(match(7).chances.flatMap((c) => c.mods).some((m) => m.kind === 'range')).toBe(false);
  });
});
