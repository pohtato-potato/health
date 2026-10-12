import { describe, expect, it } from 'vitest';
import { dialSnap, wheelIndexFor } from '../src/ui/pick';

describe('picker helpers', () => {
  it('dialSnap rounds to step and clamps', () => {
    expect(dialSnap(7.4, 2.5, 0, 50)).toBe(7.5);
    expect(dialSnap(8.9, 2.5, 0, 50)).toBe(10);
    expect(dialSnap(-3, 2.5, 0, 50)).toBe(0);
    expect(dialSnap(61, 2.5, 0, 50)).toBe(50);
    expect(dialSnap(0.30000000000000004, 0.1, 0, 1)).toBe(0.3);
    expect(dialSnap(13, 5, 2, 40)).toBe(12);
  });

  it('wheelIndexFor finds nearest', () => {
    expect(wheelIndexFor(30, [0, 15, 30, 45])).toBe(2);
    expect(wheelIndexFor(37, [0, 15, 30, 45])).toBe(2);
    expect(wheelIndexFor(38, [0, 15, 30, 45])).toBe(3);
    expect(wheelIndexFor('b', ['a', 'b', 'c'])).toBe(1);
    expect(wheelIndexFor('z', ['a', 'b', 'c'])).toBe(0);
    expect(wheelIndexFor(5, [])).toBe(-1);
  });
});
