import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CLUBS } from '../../src/football/data/load';
import type { ScrapPage } from '../../src/football/seasonStory';
import { GiantBeaten } from '../../src/screens/football/story/Moments';

const opp = CLUBS.find((c) => c.kind !== 'own')!;
const m = { id: 'g1', date: '2026-11-10', season: 1, day: 9, comp: 'bigcup', round: 'Big Cup · Last 128', home: opp.id, away: 'bra', opp: opp.id, braboHome: false, score: [1, 0], result: 'W' } as never;
const c: ScrapPage = { id: 'g1-giant', kind: 'giant', date: '2026-11-10', season: 1, title: 'Giant beaten', line: `${opp.name} 0–1 Brabo`, sub: 'x', m, gap: 3 };

describe('s19 Giant beaten', () => {
  it('both crests, the score as text, the tier gap, and a way to watch it back and to go back', () => {
    const out = html(<GiantBeaten c={c} onBack={() => {}} />);
    expect(out).toMatch(/class="big"><span class="cup-svg ?"><svg[\s\S]*class="sm"><span class="cup-svg ?"><svg class="fb-crest"/);
    expect(out).toContain('Giant beaten');
    expect(out).toContain(`${opp.name} 0–1 Brabo`);
    expect(out).toMatch(/<b>3 tiers<\/b>\s*above you/);
    expect(out).toContain('Clean sheet');
    expect(out).toContain('Big Cup · Last 128');
    expect(out).toMatch(/<button[^>]*>Watch it back<\/button>/);
    expect(out).toMatch(/<button[^>]*>Back to the scrapbook<\/button>/);
  });
});
