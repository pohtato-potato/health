import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { STOPS, STRETCHES } from '../src/walk/content';
import { stripFor } from '../src/walk/strip';
import { WalkStrip } from '../src/screens/walk/WalkStrip';

const bandit = STRETCHES.find((s) => s.id === 'bandit-country')!;

describe('the strip', () => {
  it('runs from the stretch’s start to its end, with you and today’s walk on it', () => {
    const s = stripFor(bandit.fromKm + 20, 8, bandit, STOPS);
    expect(s.from).toBe('Agra');
    expect(s.to).toBe('Morena');
    expect(s.toKm).toBe(Math.ceil(bandit.toKm - (bandit.fromKm + 20)));
    expect(s.youFrac).toBeCloseTo(20 / (bandit.toKm - bandit.fromKm), 5);
    expect(s.todayFrom).toBeCloseTo(12 / (bandit.toKm - bandit.fromKm), 5);
  });

  it('marks each small stop on the stretch by its kind, in words', () => {
    const s = stripFor(bandit.fromKm + 1, 0, bandit, STOPS);
    const inStretch = STOPS.filter((x) => x.km >= bandit.fromKm && x.km < bandit.toKm);
    expect(s.stops.length).toBe(inStretch.length);
    expect(s.stops.every((x) => ['River', 'Border', 'Food', 'Forts and temples', 'Wildlife', 'Strange but true'].includes(x.word))).toBe(true);
    expect(s.stops.find((x) => !x.passed)?.next).toBe(true);
  });

  it('drops labels that would overlap at 324 px, keeping their dots', () => {
    const s = stripFor(bandit.fromKm + 1, 0, bandit, STOPS);
    const shown = s.stops.filter((x) => x.label);
    for (let i = 1; i < shown.length; i++) expect((shown[i].frac - shown[i - 1].frac) * 300).toBeGreaterThan((shown[i].word.length + shown[i - 1].word.length) * 3.9);
  });

  it('with no stretch written, runs from the last city to the next', () => {
    const s = stripFor(2950, 5, undefined, STOPS);
    expect(s.from).toBeTruthy();
    expect(s.to).toBeTruthy();
    expect(s.stops).toEqual([]);
  });

  it('draws the comp: road, sage walked part, dots, words at 14 px, and the end with its distance', () => {
    const html = renderToStaticMarkup(<WalkStrip strip={stripFor(bandit.fromKm + 20, 8, bandit, STOPS)} onOpen={() => {}} />);
    expect(html).toContain('walk-strip2');
    expect(html).toMatch(/>Morena · \d+ km</);
    expect(html).toContain('>Agra<');
    for (const m of html.matchAll(/font-size="(\d+)"/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(14);
    expect(html).toMatch(/aria-label="The stretch from Agra to Morena/);
  });
});
