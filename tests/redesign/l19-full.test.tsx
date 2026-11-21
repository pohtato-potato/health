import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CLUBS } from '../../src/football/data/load';
import { OWN } from '../../src/football/store/season';
import { Table } from '../../src/screens/football/league/Table';

const others = CLUBS.filter((c) => c.kind !== 'own').slice(0, 11).map((c) => c.id);
const ids = [others[0], OWN, ...others.slice(1)];
const rows = ids.map((id, i) => ({ id, p: 2, w: 1, d: 0, l: 1, gf: 4 - (i % 5), ga: 2, pts: 20 - i, form: ['W', 'L'] })) as never;

describe('l19 League, the full table', () => {
  it('every club with its crest, form, goal difference and points', () => {
    const out = html(<Table tier={3} rows={rows} world={2} own='<svg data-own="1"></svg>' />);
    expect(out.match(/class="fb-tcrest"/g)).toHaveLength(ids.length);
    expect(out).toContain('data-own="1"');
    expect(out).toMatch(/class="fb-tgd"[^>]*>\+2</);
    expect(out).toMatch(/class="fb-tgd"[^>]*>-1</);
    expect(out).toMatch(/goal difference \+2/);
  });
  it('the three lines are labelled in words', () => {
    const out = html(<Table tier={3} rows={rows} world={2} />);
    expect(out).toContain('Top two go up');
    expect(out).toContain('3rd to 6th: playoffs');
    expect(out).toContain('Bottom three');
  });
});
