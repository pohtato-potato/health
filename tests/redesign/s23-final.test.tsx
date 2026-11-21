import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CLUBS, clubById } from '../../src/football/data/load';
import { OWN } from '../../src/football/store/season';
import { FinalTable } from '../../src/screens/football/league/Table';

const others = CLUBS.filter((c) => c.kind !== 'own').slice(0, 17).map((c) => c.id);
const rowsOf = (first: string[]) => [...first, ...others.filter((x) => !first.includes(x))].slice(0, 18).map((id, i) => ({ id, p: 8, w: 8 - Math.min(8, i), d: 0, l: Math.min(8, i), gf: 30 - i * 2, ga: i, pts: 24 - i, form: [] })) as never;

describe('s23 The final table', () => {
  it('the champions lead in their own row, then the top eight, then All N clubs', () => {
    const out = html(<FinalTable tier={6} rows={rowsOf([OWN])} division="Division Six" own="<svg></svg>" ended="15 Nov" />);
    expect(out).toContain('Champions');
    expect(out.match(/class="ft23-r/g)).toHaveLength(8);
    expect(out).toMatch(/class="ft23-r ch me"/);
    expect(out).toContain('All 18 clubs');
    expect(out).toMatch(/class="p"[^>]*>P</);
    expect(out).toContain('Division Six · 8 played, 8 won · ended 15 Nov');
  });
  it('when someone else wins it, they are named and your place is said in words', () => {
    const out = html(<FinalTable tier={6} rows={rowsOf([others[0], others[1], OWN])} division="Division Six" own="<svg></svg>" ended="15 Nov" />);
    expect(out).toContain(`${clubById(others[0]).name}`);
    expect(out).toContain('You finished 3rd');
  });
});
