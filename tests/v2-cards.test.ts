import { describe, expect, it } from 'vitest';
import { cardFor, reachedCards, walkForecast } from '../src/walk/cards';
import { CITIES, TOTAL_KM } from '../src/domain/walk';

describe('arrival cards', () => {
  it('every stop has a complete card', () => {
    for (const c of CITIES) {
      const card = cardFor(c);
      expect(card, c).toBeTruthy();
      expect(card!.fact.length, c).toBeGreaterThan(20);
      expect(card!.eat.length, c).toBeGreaterThan(3);
      expect(card!.hear.length, c).toBeGreaterThan(3);
      expect(card!.land.length, c).toBeGreaterThan(5);
      expect(card!.keep, c).toBeTruthy();
    }
    expect(cardFor('Leh')!.next).toBeUndefined();
    expect(cardFor('Delhi')!.next).toEqual({ name: 'Agra', km: 230 });
  });

  it('retro cards for reached stops', () => {
    expect(reachedCards(0).map((c) => c.city)).toEqual(['Delhi']);
    expect(reachedCards(400).map((c) => c.city)).toEqual(['Delhi', 'Agra', 'Gwalior']);
    expect(reachedCards(TOTAL_KM + 1).length).toBe(9);
  });

  it('walk forecast with a range, nothing without a pace', () => {
    const f = walkForecast(400, 10000, '2026-10-13')!;
    expect(f.name).toBe('Kanyakumari');
    expect(f.range[0] <= f.date && f.date <= f.range[1]).toBe(true);
    expect(walkForecast(400, undefined, '2026-10-13')).toBeUndefined();
  });
});
