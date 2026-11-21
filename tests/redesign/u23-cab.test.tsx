import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyBook } from '../../src/football/cup/book';
import { CUPS } from '../../src/football/cup/ladder';
import { Cabinet } from '../../src/screens/football/cup/CupScreens';

const book = { ...emptyBook(), cups: { 1: { furthest: 9, won: 1, runs: 1 }, 2: { furthest: 8, won: 1, runs: 2 }, 3: { furthest: 4, won: 0, runs: 1 } } };

describe('u23 Cups, the cabinet', () => {
  it('twelve slots on the shelf: won, next and locked each named in words', () => {
    const out = html(<Cabinet book={book} open={3} onPick={() => {}} />);
    expect(out.match(/class="sl-23/g)).toHaveLength(CUPS.length);
    expect(out.match(/class="sl-23 won/g)).toHaveLength(2);
    expect(out).toMatch(/class="sl-23 nx"[\s\S]*?Next/);
    expect(out.match(/class="sl-23 lk/g)).toHaveLength(CUPS.length - 3);
    expect(out).toContain('Locked');
    for (const c of CUPS) expect(out).toContain(c.name);
  });
  it('open cups are buttons; locked ones are not', () => {
    const out = html(<Cabinet book={book} open={3} onPick={() => {}} />);
    expect(out.match(/<button[^>]*class="sl-23/g)).toHaveLength(3);
  });
});
