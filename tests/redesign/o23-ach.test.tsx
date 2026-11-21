import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AchWall, wallMonths } from '../../src/screens/earned/Wall';

const cells = [
  { id: 'a', date: '2026-01-04' as const },
  { id: 'b', date: '2026-02-02' as const },
  { id: 'c', date: '2026-02-09' as const, secret: true },
  { id: 'd' },
  { id: 'e' },
];

describe('o23-ach Achievements wall', () => {
  it('counts the earned by month, oldest first', () => {
    expect(wallMonths(cells).map((m) => [m.month, m.n])).toEqual([['2026-01', 1], ['2026-02', 2]]);
  });
  it('one cell per achievement, the earned count as text, and a key by month', () => {
    const out = html(<AchWall cells={cells} today="2026-02-20" />);
    expect(out.match(/<i class="aw-c/g)).toHaveLength(5);
    expect(out).toContain('3 earned');
    expect(out).toContain('aria-label="3 earned of 5"');
    expect(out).toContain('1 in January, 2 so far in February');
    expect(out).toMatch(/Jan · 1/);
    expect(out).toMatch(/Secret found/);
    expect(out.match(/aw-c s/g)).toHaveLength(1);
    expect(out.match(/aw-c n/g)).toHaveLength(2);
  });
  it('says so when nothing is earned yet', () => {
    expect(html(<AchWall cells={[{ id: 'x' }]} today="2026-02-20" />)).toContain('Nothing earned yet');
  });
});
