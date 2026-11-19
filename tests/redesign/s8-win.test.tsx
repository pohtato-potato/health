import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResultRow, carriedLine } from '../../src/screens/today/MatchToday';
import { OWN } from '../../src/football/store/season';
import type { FbSave, StoredMatch } from '../../src/football/store/tables';

// An invented match against an invented club id from the game's own data.
const save = { crest: { step: 1, opt: 'a' } } as unknown as FbSave;
const values = { Pace: 11, Power: 12, Fuel: 14, Rest: 16, Routine: 9, Shape: 13 };
const m = { id: 'm1', date: '2026-01-07', comp: 'league', home: OWN, away: 'bay', opp: 'bay', result: 'W', score: [2, 1], round: 'Matchday 3', watched: true, values, flags: {}, events: { xg: [1.4, 0.9] } } as unknown as StoredMatch;

describe('The morning after a win (s8-win)', () => {
  it('names last night, the result in words and the score', () => {
    const html = renderToStaticMarkup(<ResultRow m={m} save={save} today="2026-01-08" pos={4} />);
    expect(html).toMatch(/<h2 id="tm-res-h" class="tm-res-h">Last night<\/h2><span class="tm-res-word">Won<\/span>/);
    expect(html).toMatch(/<b class="tm-res-score tn">2–1<\/b>/);
    expect(html).toContain('aria-label="Won 2–1 against');
  });

  it('says which two parts carried it, and the points and place in the league', () => {
    const html = renderToStaticMarkup(<ResultRow m={m} save={save} today="2026-01-08" pos={4} />);
    expect(html).toContain('Rest 16 and Fuel 14 carried it');
    expect(html).toContain('+3 pts · 4th');
  });

  it('names the two lowest on a loss, and leaves out a part with no data', () => {
    expect(carriedLine({ values, flags: { Routine: 'no-data' }, result: 'L' })).toBe('Pace 11 and Power 12 let it slip');
    expect(carriedLine({ values, flags: {}, result: 'D' })).toBe('Rest 16 and Fuel 14 held it level');
  });

  it('sits between Next and the meals', () => {
    const src = readFileSync('src/screens/today/TodayLayout.tsx', 'utf8');
    expect(src).toMatch(/id="next"[\s\S]*<\/TodayPanel>\s*\{p\.football\}[\s\S]*\{p\.log\}/);
  });

  it('renders with no data: a cup match with no values has no line and no points', () => {
    const html = renderToStaticMarkup(<ResultRow m={{ ...m, comp: 'bigcup', values: undefined } as unknown as StoredMatch} save={save} today="2026-01-08" />);
    expect(html).toContain('2–1');
    expect(html).not.toContain('tm-res-foot');
    expect(html).not.toContain('pts');
  });
});
