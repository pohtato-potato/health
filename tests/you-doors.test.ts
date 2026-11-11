import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DOORS } from '../src/screens/you/doorList';

describe('the doors', () => {
  it('five doors in the fixed order (the Diary is retired, R3 x-screens)', () => {
    expect(DOORS.map((d) => d.label)).toEqual(['Reports', 'Earned', 'Body', 'Tracks', 'Insights']);
  });

  it('every door opens a route that exists', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    for (const d of DOORS) expect(app).toContain(`'${d.path}':`);
  });
});
