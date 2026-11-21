import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { castById } from '../../src/football/cast/bonds';
import { BondPage } from '../../src/screens/football/desk/Congress';

const c = castById('physio')!;
const x = { id: 'physio', name: c.name, role: c.role, points: 12, rank: 2, toNext: 6, tone: 'warm', askOpen: true } as never;

describe('b21 A bond', () => {
  it('the rank strip shows this rank and the next as text', () => {
    const out = html(<BondPage c={c} x={x} seen={1} />);
    expect(out).toContain('class="ru21"');
    expect(out).toContain('Rank 2 now; rank 3 next, 6 to go');
    expect(out).toContain('>2</b>');
    expect(out).toContain('>3</b>');
  });
  it('the ask, then every rank: seen scenes named, the reached one waiting, locked ones say not yet, perks shown', () => {
    const out = html(<BondPage c={c} x={x} seen={1} ask="Test ask text" />);
    expect(out).toContain('has asked you something');
    expect(out).toContain('Test ask text');
    expect(out.match(/<li class="/g)).toHaveLength(10);
    expect(out).toContain(c.ranks[0].title);
    expect(out).toContain('A new scene is waiting');
    expect(out).toContain('Not yet');
    const perk = c.ranks.find((r) => r.perk)!;
    expect(out).toContain(`Perk: ${perk.perk!.text.slice(0, 20)}`);
  });
});
