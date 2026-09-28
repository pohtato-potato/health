import { describe, expect, it } from 'vitest';
import { ALL_STATES, ALL_STOPS, CHAPTERS, CITIES, PLACE_COUNT, POSTCARDS, QUAD_DONE_KM, STATE_COUNT, TOTAL_KM, arrivals, chapterAt, positionAt, stateEntries, statesReached } from '../src/domain/walk';

describe('the walk across India', () => {
  it('covers all 28 states and 8 union territories exactly once', () => {
    expect(STATE_COUNT).toBe(28);
    expect(PLACE_COUNT).toBe(36);
    expect(new Set(ALL_STATES.map((s) => s.name)).size).toBe(36);
    expect(statesReached(CHAPTERS[2].end)).toHaveLength(36);
  });

  it('keeps every stop and state crossing in order', () => {
    for (let i = 1; i < ALL_STOPS.length; i++) expect(ALL_STOPS[i].km).toBeGreaterThan(ALL_STOPS[i - 1].km);
    for (const c of CHAPTERS) for (const s of c.states) expect(s.km).toBeGreaterThanOrEqual(c.start);
  });

  it('has a postcard for every city, and 25 of them by the end of chapter 2', () => {
    for (const c of CITIES) expect(POSTCARDS[c], c).toBeTruthy();
    const byQuad = new Set(ALL_STOPS.filter((s) => s.km > 0 && s.km <= QUAD_DONE_KM).map((s) => s.name));
    expect(byQuad.size).toBeGreaterThanOrEqual(25);
  });

  it('runs the Golden Quadrilateral at about 5,850 km', () => {
    expect(QUAD_DONE_KM - CHAPTERS[1].route[1].km).toBe(5850);
    expect(chapterAt(TOTAL_KM).n).toBe(2);
    expect(chapterAt(TOTAL_KM - 1).n).toBe(1);
  });

  it('carries on past Kanyakumari', () => {
    const p = positionAt(TOTAL_KM + 350);
    expect(p.from.name).toBe('Kanyakumari');
    expect(p.to?.name).toBe('Chennai');
    expect(p.done).toBe(false);
    expect(positionAt(1e9).done).toBe(true);
  });

  it('dates arrivals and state entries across chapters', () => {
    // 20,000 steps a day is about 14.8 km, so 250 days reaches past Chennai.
    const steps = new Map<string, number>();
    const d0 = new Date(2026, 0, 1, 12);
    for (let i = 0; i < 250; i++) steps.set(new Date(d0.getTime() + i * 86_400_000).toISOString().slice(0, 10), 20000);
    const a = arrivals(steps);
    expect(a.some((x) => x.name === 'Chennai' && x.chapter === 2)).toBe(true);
    const s = stateEntries(steps);
    expect(new Set(s.map((x) => x.name)).size).toBe(s.length);
  });
});
