import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CLUBS, clubById } from '../../src/football/data/load';
import { OWN } from '../../src/football/store/season';
import { Cup } from '../../src/screens/football/league/Cups';

const [a, b, c] = CLUBS.filter((x) => x.kind !== 'own').slice(0, 3).map((x) => x.id);
const cup = { id: 'bigcup', name: 'The Big Cup', size: 128, rounds: [
  { name: 'Last 128', day: 3, ties: [{ home: OWN, away: a, score: [2, 0], winner: OWN }, { home: b, away: c, score: [1, 0], winner: b }] },
  { name: 'Last 64', day: 7, ties: [{ home: b, away: OWN }] },
  { name: 'Last 32', day: 7, ties: [] },
  { name: 'Final', day: 27, ties: [] },
] } as never;

describe('u23 The Big Cup', () => {
  it('tonight’s tie leads: both sides named with their crests', () => {
    const out = html(<Cup b={cup} tierOf={{}} />);
    expect(out).toMatch(/class="tie-23"[\s\S]*Brabo United[\s\S]*v[\s\S]*/);
    expect(out).toContain(clubById(b).name);
  });
  it('the road: every round in order, the one you are on marked in words', () => {
    const out = html(<Cup b={cup} tierOf={{}} />);
    expect(out.match(/class="rd-r/g)).toHaveLength(4);
    expect(out).toMatch(/class="rd-r now"[\s\S]*?This round/);
    expect(out).toMatch(/class="rd-r w"[\s\S]*?Won 2–0/);
  });
});
