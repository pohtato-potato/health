import { describe, expect, it } from 'vitest';
import { CHAPTERS, positionAt } from '../src/domain/walk';
import { routeLayers } from '../src/walk/routeMap';

describe('route map layers', () => {
  it('the walked line ends where you are, and chapter 1 continues ahead', () => {
    const l = routeLayers(300);
    const you = positionAt(300);
    expect(l.walked[l.walked.length - 1]).toEqual({ x: you.x, y: you.y });
    expect(l.ahead[0]).toEqual({ x: you.x, y: you.y });
    expect(l.walked.length).toBeGreaterThan(1);
    expect(l.you).toEqual({ x: you.x, y: you.y });
  });

  it('later chapters are drawn whole until you reach them', () => {
    const l = routeLayers(300);
    expect(l.later.map((c) => c.n)).toEqual([2, 3]);
    const into2 = routeLayers(CHAPTERS[1].start + 50);
    expect(into2.later.map((c) => c.n)).toEqual([3]);
    expect(into2.earlier.map((c) => c.n)).toEqual([1]);
  });

  it('stops reached are every stop at or behind you, once each', () => {
    const l = routeLayers(300);
    expect(l.reached.every((s) => s.km <= 300)).toBe(true);
    expect(l.reached[0].name).toBe('Delhi');
    expect(new Set(l.reached.map((s) => s.name)).size).toBe(l.reached.length);
  });
});
