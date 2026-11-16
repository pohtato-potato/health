import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DOORS } from '../src/screens/you/doorList';

describe('the doors', () => {
  it('five doors, grouped by kind of place (O40): looking back, then earned, then the body (the Diary is retired, R3 x-screens)', () => {
    expect(DOORS.map((d) => d.label)).toEqual(['Tracks', 'Insights', 'Reports', 'Earned', 'Body']);
    expect(DOORS.map((d) => d.family)).toEqual(['back', 'back', 'back', 'earned', 'body']);
  });

  it('every door opens a route that exists', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    for (const d of DOORS) expect(app).toContain(`'${d.path}':`);
  });
});
