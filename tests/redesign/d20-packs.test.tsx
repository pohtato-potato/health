import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ALBUM_CARDS } from '../../src/football/content/album';
import { emptyUser } from '../../src/football/tree/types';
import { PackHaul } from '../../src/screens/football/tree/PackScreens';

const cards = ALBUM_CARDS.slice(0, 3);
const user = { ...emptyUser(), opened: [
  { id: 'p1', on: '2026-03-01', items: [{ kind: 'album', id: cards[0].id }, { kind: 'boost', id: 'x' }, { kind: 'research', n: 2 }] },
  { id: 'p2', on: '2026-03-04', items: [{ kind: 'album', id: cards[1].id }, { kind: 'album', id: cards[2].id }, { kind: 'album', id: cards[0].id, duplicate: true, n: 3 }] },
] } as never;

describe('d20 Packs and the album', () => {
  it('the album cards from packs fan out, each named with its rarity in words', () => {
    const out = html(<PackHaul user={user} />);
    expect(out.match(/class="fn20-c/g)).toHaveLength(3);
    for (const c of cards) expect(out).toContain(c.title);
    expect(out).toContain('2 packs opened');
    expect(out).toContain('3 album cards and 1 boost since 1 Mar');
  });
  it('rarity counts as words, and the sets you have started with their progress', () => {
    const out = html(<PackHaul user={user} />);
    expect(out).toContain('class="rk20"');
    expect(out).toMatch(/of \d+<\/span>/);
  });
});
