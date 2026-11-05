import { describe, expect, it } from 'vitest';
import { smoothPath } from '../src/ui/you/paths';

describe('smoothPath', () => {
  it('starts at the first point and ends at the last', () => {
    const d = smoothPath([[0, 10], [5, 5], [10, 0]]);
    expect(d.startsWith('M0 10')).toBe(true);
    expect(d.endsWith('10.0 0.0')).toBe(true);
  });

  it('draws one curve per gap', () => {
    expect(smoothPath([[0, 0], [1, 1], [2, 2], [3, 3]]).match(/C/g)).toHaveLength(3);
  });

  it('a single point draws nothing past its move', () => {
    expect(smoothPath([[4, 4]])).toBe('M4 4');
  });
});
