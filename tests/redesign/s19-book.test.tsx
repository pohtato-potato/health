import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { scrapbook } from '../../src/football/seasonStory';
import type { FbSeason, StoredMatch } from '../../src/football/store/tables';
import { allAxes, type ChanceEvent } from '../../src/football/types';
import { Scrapbook } from '../../src/screens/football/story/Moments';

const ch = (minute: number, pct: number, tag?: ChanceEvent['tag']) => ({ minute, pct, tag, side: 'atk', ok: true }) as ChanceEvent;
const m = (day: number, opp: string, result: 'W' | 'D' | 'L', score: [number, number], chances: ChanceEvent[] = []): StoredMatch => ({
  id: `m${day}`, date: `2026-10-${String(day).padStart(2, '0')}`, season: 1, day, comp: 'league', home: 'bra', away: opp, opp, braboHome: true, values: allAxes(10), flags: {},
  events: { seed: 1, chances, score, xg: [1, 1], moments: [] }, score, result, watched: true, rotation: false, auto: false,
});
const season = { id: 1, tierOf: { bra: 5, up: 2, same: 5 }, bigcup: { id: 'bigcup', name: 'The Big Cup', size: 128, rounds: [] }, tiercups: {} } as unknown as FbSeason;
const name = (id: string) => ({ up: 'Hill Town', same: 'Flat FC' })[id] ?? 'Brabo';
const ms = [
  m(1, 'same', 'W', [3, 0], [ch(61, 14, 'SCREAMER')]), m(2, 'same', 'W', [1, 0], [ch(24, 22, 'WONDER SAVE')]), m(3, 'up', 'W', [1, 0]),
  m(4, 'same', 'W', [2, 0], [ch(64, 18, 'SCREAMER'), ch(81, 19, 'SCREAMER')]), m(5, 'same', 'W', [2, 1]), m(6, 'same', 'D', [0, 0]),
];

describe('s19 the scrapbook', () => {
  it('builds a card per screamer match, wonder save, giant beaten and run of five or more wins, newest first', () => {
    const cards = scrapbook(ms, [season], name);
    expect(cards.map((c) => c.kind)).toEqual(['run', 'scr', 'giant', 'sav', 'scr']);
    expect(cards.find((c) => c.kind === 'giant')).toMatchObject({ title: 'Giant beaten', line: 'Brabo 1–0 Hill Town', gap: 3 });
    expect(cards[1]).toMatchObject({ title: 'Two screamers', sub: '18% at 64′ · 19% at 81′' });
    expect(cards[0]).toMatchObject({ title: '5 wins in a row' });
  });
  it('filters All, Screamers, Saves, Giants and Runs, each with its count, as pressed buttons; giants open', () => {
    const out = html(<Scrapbook cards={scrapbook(ms, [season], name)} />);
    for (const [n, w] of [[5, 'All'], [2, 'Screamers'], [1, 'Saves'], [1, 'Giants'], [1, 'Runs']] as const) expect(out).toMatch(new RegExp(`aria-pressed="(true|false)"[^>]*><b>${n}</b>${w}<`));
    expect(out).toMatch(/aria-pressed="true"[^>]*><b>5<\/b>All/);
    expect(out.match(/class="sk19-c/g)).toHaveLength(5);
    expect(out.match(/>Open</g)).toHaveLength(1);
  });
});
