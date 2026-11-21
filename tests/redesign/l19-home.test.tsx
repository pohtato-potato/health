import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CLUBS } from '../../src/football/data/load';
import { OWN } from '../../src/football/store/season';
import { CrestLadder, LeagueHead } from '../../src/screens/football/league/LeagueHome';

const others = CLUBS.filter((c) => c.kind !== 'own').slice(0, 5).map((c) => c.id);
const ids = [others[0], OWN, ...others.slice(1)];
const rows = ids.map((id, i) => ({ id, p: 2, w: 1, d: 0, l: 1, gf: 3, ga: 2, pts: 10 - i, form: [] })) as never;

describe('l19 League, the current page', () => {
  it('your crest sits beside your position, with the division and how far in', () => {
    const out = html(<LeagueHead crest="<svg></svg>" pos={2} division="Division Three" line="of 12 · 2 of 22 played" />);
    expect(out).toContain('class="lh19');
    expect(out).toMatch(/2<sup>nd<\/sup>/);
    expect(out).toContain('Division Three');
    expect(out).toContain('of 12 · 2 of 22 played');
  });
  it('the ladder lists every crest in table order, yours marked in words', () => {
    const out = html(<CrestLadder rows={rows} own="<svg></svg>" up={2} down={2} division="Division Three" />);
    expect(out.match(/<li/g)).toHaveLength(ids.length);
    expect(out).toContain('class="me"');
    expect(out).toMatch(/aria-label="2, Brabo United \(you\), promotion place"/);
  });
});
