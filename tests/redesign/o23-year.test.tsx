import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DayOne, MonthTiles, YearCounts } from '../../src/screens/you/YearParts';

describe('o23-year The year', () => {
  it('months as tiles with their days logged; an empty or waiting month shows a dot, never 0', () => {
    const out = html(<MonthTiles tiles={[{ month: '2026-01', days: 4 }, { month: '2026-02', days: 0 }, { month: '2026-03' }]} />);
    expect(out).toMatch(/>4<\/b><span aria-hidden="true">Jan<\/span>/);
    expect(out).toMatch(/>·<\/b><span aria-hidden="true">Feb<\/span>/);
    expect(out).toMatch(/>·<\/b><span aria-hidden="true">Mar<\/span>/);
    expect(out).not.toMatch(/>0<\/b>/);
    expect(out).toContain('aria-label="Feb: nothing logged"');
    expect(out).toContain('aria-label="Mar: still to come"');
    expect(out).toContain('aria-label="Jan: 4 days logged"');
  });
  it('day one against today, as day numbers and dates', () => {
    const out = html(<DayOne first="2026-01-05" today="2026-03-01" />);
    expect(out).toContain('Day 1');
    expect(out).toContain('5 Jan');
    expect(out).toContain('Day 56');
    expect(out).toContain('1 Mar');
  });
  it('four big counts, each named', () => {
    const out = html(<YearCounts counts={[{ n: 28, what: 'sessions' }, { n: 711, what: 'sets' }]} />);
    expect(out).toContain('28');
    expect(out).toContain('sessions');
  });
});
