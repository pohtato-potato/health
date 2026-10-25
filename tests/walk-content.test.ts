import { describe, expect, it } from 'vitest';
import { STOPS, STRETCHES, WRITTEN_FROM_KM, WRITTEN_TO_KM } from '../src/walk/content';
import { STOP_KINDS } from '../src/walk/content/types';

describe('the written road', () => {
  it('tiles the written range with stretches, no gap or overlap', () => {
    expect(STRETCHES[0].fromKm).toBe(WRITTEN_FROM_KM);
    expect(STRETCHES.at(-1)!.toKm).toBe(WRITTEN_TO_KM);
    STRETCHES.forEach((s, i) => i && expect(s.fromKm, s.id).toBe(STRETCHES[i - 1].toKm));
  });

  for (const s of STRETCHES)
    it(`${s.id}: one to two weeks long, with a page and a source`, () => {
      expect(s.toKm - s.fromKm).toBeGreaterThanOrEqual(50);
      expect(s.toKm - s.fromKm).toBeLessThanOrEqual(220);
      expect(s.page.length).toBeGreaterThanOrEqual(2);
      expect(s.sources.length).toBeGreaterThan(0);
      expect(s.plain).toMatch(/ to /);
    });

  it('keeps stops in order inside the written range, never more than 45 km apart', () => {
    let last = WRITTEN_FROM_KM;
    for (const s of STOPS) {
      expect(s.km, s.id).toBeGreaterThan(last - 0.001);
      expect(s.km - last, s.id).toBeLessThanOrEqual(45);
      last = s.km;
    }
    expect(WRITTEN_TO_KM - last).toBeLessThanOrEqual(45);
  });

  for (const s of STOPS)
    it(`${s.id}: three to five short facts and a source`, () => {
      expect(s.facts.length).toBeGreaterThanOrEqual(3);
      expect(s.facts.length).toBeLessThanOrEqual(5);
      for (const f of s.facts) expect(f.length, f).toBeLessThanOrEqual(220);
      expect(s.sources.length).toBeGreaterThan(0);
    });

  it('shows every kind of stop in the batch', () => {
    for (const k of STOP_KINDS) expect(STOPS.some((s) => s.kind === k), k).toBe(true);
  });

  it('ids are unique', () => {
    expect(new Set([...STOPS, ...STRETCHES].map((x) => x.id)).size).toBe(STOPS.length + STRETCHES.length);
  });

  it('writes in our own words: no quotation marks around borrowed lines', () => {
    for (const t of [...STOPS.flatMap((s) => s.facts), ...STRETCHES.flatMap((s) => s.page)]) expect(t, t).not.toMatch(/[“"]/);
  });
});
