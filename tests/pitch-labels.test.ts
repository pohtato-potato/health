// Tidy fix: the live match's axis labels never sit over a marker dot, the ball or the shape's line.
import { describe, expect, it } from 'vitest';
import { C, R, placeLabels } from '../src/screens/football/match/Pitch';
import { polygon } from '../src/football/radar';

const TEXTS = ['Pace 18', 'Power 14', 'Fuel 20', 'Rest 13', 'Routine 10', 'Shape 15'];
const SHAPE = polygon([0.9, 0.7, 1, 0.65, 0.5, 0.75]).map(([x, y]) => [C + x * R, C + y * R] as [number, number]);
const box = (s: { x: number; y: number; anchor: string }, text: string) => {
  const w = text.length * 0.62 * 18;
  const x0 = s.anchor === 'start' ? s.x : s.anchor === 'end' ? s.x - w : s.x - w / 2;
  return { x0, x1: x0 + w, y0: s.y - 14.4, y1: s.y + 4.5 };
};
const clear = (b: ReturnType<typeof box>, [x, y, r]: [number, number, number]) => {
  const dx = Math.max(b.x0 - x, 0, x - b.x1), dy = Math.max(b.y0 - y, 0, y - b.y1);
  return dx * dx + dy * dy >= r * r;
};

describe('live match axis labels', () => {
  it('stay at their usual spot when nothing is in the way', () => {
    const plain = placeLabels(TEXTS, [SHAPE], []);
    expect(plain[3].y).toBeCloseTo(C + R + 20 + 16, 0);
  });
  it('move off a dot sitting where Pace and Rest would be', () => {
    const base = placeLabels(TEXTS, [SHAPE], []);
    const marks: [number, number, number][] = [[base[0].x, base[0].y - 6, 10], [base[3].x, base[3].y - 6, 10], [base[3].x + 30, base[3].y - 6, 10]];
    const moved = placeLabels(TEXTS, [SHAPE], marks);
    for (const i of [0, 3]) for (const m of marks) expect(clear(box(moved[i], TEXTS[i]), m)).toBe(true);
  });
});
