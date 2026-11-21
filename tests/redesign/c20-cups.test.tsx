import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { cupByN } from '../../src/football/cup/ladder';
import { CupsWon } from '../../src/screens/football/cup/CupScreens';

const run = (cup: number, result: string, played: number, won: number, gf: number, ga: number, beaten: string[], date: string, big?: [number, number, string]) =>
  ({ cup, result, date, stopsCleared: played, reachedFinal: result === 'won', stops: played, paid: 0, album: false, endedAt: 0,
    stats: { played, won, goalsFor: gf, goalsAgainst: ga, combos: {}, beaten, cards: 100, biggest: big && { for: big[0], against: big[1], club: big[2] } } }) as never;
const done = [
  run(1, 'won', 9, 9, 30, 0, ['a', 'b', 'c'], '2026-03-11', [4, 0, 'Testville']),
  run(2, 'lost', 4, 3, 8, 5, ['d'], '2026-03-12'),
  run(2, 'won', 8, 8, 26, 3, ['e', 'f'], '2026-03-14', [4, 0, 'Harbour Town']),
];

describe('c20 The cups', () => {
  it('the won trophies rise, and the record: cups, matches won from played, goals and clubs beaten', () => {
    const out = html(<CupsWon done={done} />);
    expect(out.match(/class="tc20-t"/g)).toHaveLength(2);
    expect(out).toContain('2 cups, 17 from 17');
    expect(out).toContain('56 scored, 3 let in, 5 clubs beaten');
  });
  it('each run won, with its cup, wins of played, score and best win', () => {
    const out = html(<CupsWon done={done} />);
    expect(out).toContain(cupByN(1).name);
    expect(out).toContain('9/9');
    expect(out).toMatch(/30–0 · best 4–0 v Testville · 11 Mar/);
  });
  it('nothing won yet says so', () => {
    expect(html(<CupsWon done={[]} />)).toBe('');
  });
});
