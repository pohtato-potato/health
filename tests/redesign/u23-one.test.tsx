import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WonRun } from '../../src/screens/football/cup/CupScreens';

const d = { cup: 1, result: 'won', date: '2026-03-11', stopsCleared: 14, reachedFinal: true, stops: 14, paid: 0, album: false, endedAt: 0,
  stats: { played: 9, won: 9, goalsFor: 30, goalsAgainst: 0, combos: { 'One-two': 48, Overlap: 31, 'Third-man run': 46 }, beaten: [], cards: 385, biggest: { for: 4, against: 0, club: 'Testville' } } } as never;

describe('u23 One won cup', () => {
  it('a W tile for each win, the score, stops, biggest win and cards played', () => {
    const out = html(<WonRun d={d} />);
    expect(out).toContain('Won · 11 Mar');
    expect(out.match(/<i[^>]*>W<\/i>/g)).toHaveLength(9);
    expect(out).toContain('30–0');
    expect(out).toContain('14 of 14');
    expect(out).toContain('biggest: Testville');
    expect(out).toContain('385');
  });
  it('the moves as bars, most first, each with its number', () => {
    const out = html(<WonRun d={d} />);
    const names = [...out.matchAll(/class="cmb-n">([^<]+)</g)].map((m) => m[1]);
    expect(names).toEqual(['One-two', 'Third-man run', 'Overlap']);
    expect(out).toMatch(/One-two[\s\S]*?>48</);
  });
});
