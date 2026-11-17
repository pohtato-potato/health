// Match screen round (O44): the axis labels sit at fixed spots outside the play: never inside the landing area (where the ball
// rolls and the markers land), never on each other, and always inside the picture.
import { describe, expect, it } from 'vitest';
import { C, LABEL_SPOTS, onPitch, PLAY, R, VIEWBOX } from '../src/screens/football/match/Pitch';
import { hexagon, inside } from '../src/football/radar';

const TEXTS = ['Pace 20', 'Power 20', 'Fuel 20', 'Rest 20', 'Routine 20', 'Shape 20'];
const box = (s: { x: number; y: number; anchor: string }, text: string) => {
  const w = text.length * 0.62 * 18;
  const x0 = s.anchor === 'start' ? s.x : s.anchor === 'end' ? s.x - w : s.x - w / 2;
  return { x0, x1: x0 + w, y0: s.y - 14.4, y1: s.y + 4.5 };
};

describe('match axis labels', () => {
  const boxes = LABEL_SPOTS.map((s, i) => box(s, TEXTS[i]));
  it('never touch the play: no edge point of a label lies inside the landing area', () => {
    const rim = hexagon(PLAY * 1.04);
    for (const b of boxes) {
      for (let t = 0; t <= 1; t += 0.05) {
        for (const [x, y] of [[b.x0 + (b.x1 - b.x0) * t, b.y0], [b.x0 + (b.x1 - b.x0) * t, b.y1], [b.x0, b.y0 + (b.y1 - b.y0) * t], [b.x1, b.y0 + (b.y1 - b.y0) * t]]) {
          expect(inside([(x - C) / R, (y - C) / R], rim)).toBe(false);
        }
      }
    }
  });
  it('never overlap each other and stay inside the picture', () => {
    const [vx, vy, vw, vh] = VIEWBOX.split(' ').map(Number);
    for (const [i, a] of boxes.entries()) {
      expect(a.x0).toBeGreaterThanOrEqual(vx); expect(a.x1).toBeLessThanOrEqual(vx + vw);
      expect(a.y0).toBeGreaterThanOrEqual(vy); expect(a.y1).toBeLessThanOrEqual(vy + vh);
      for (const b of boxes.slice(i + 1)) expect(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0).toBe(true);
    }
  });
  it('draws far landings on the edge of the play, on the same line from the centre', () => {
    expect(onPitch([0.3, 0.2])).toEqual([0.3, 0.2]);
    const [x, y] = onPitch([0, -1.9]);
    expect(x).toBeCloseTo(0); expect(y).toBeCloseTo(-PLAY);
    const far = onPitch([1.6, 0.4]);
    expect(Math.atan2(far[1], far[0])).toBeCloseTo(Math.atan2(0.4, 1.6));
    expect(inside(far, hexagon(PLAY + 1e-6))).toBe(true);
  });
});
