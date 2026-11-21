import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SeasonSummary } from '../../src/football/seasonStory';
import { SeasonsView } from '../../src/screens/football/story/Seasons';

const s = (season: number, pos?: number, move?: 'up'): SeasonSummary => ({ season, tier: 6, pos, move, cups: [], record: { W: 3, D: 1, L: 0 } } as unknown as SeasonSummary);

describe('s21 Seasons carousel', () => {
  it('pennants newest first, each with its finish, plus previous and next buttons and a dot per season', () => {
    const out = html(<SeasonsView list={[s(1, 1, 'up'), s(2)]} />);
    const order = [...out.matchAll(/class="cs21-p[^"]*"[^>]*>[\s\S]*?<small>([^<]+)<\/small>/g)].map((m) => m[1]);
    expect(order[0]).toMatch(/Season 2 · now/);
    expect(order).toHaveLength(2);
    expect(out).toContain('<strong>1st</strong>');
    expect(out).toMatch(/<button[^>]*aria-label="Newer season"[^>]*disabled=""/);
    expect(out).toMatch(/<button[^>]*aria-label="Older season"/);
    expect(out.match(/class="cs21-dot/g)).toHaveLength(2);
    expect(out).toMatch(/aria-live="polite"[^>]*>Season 2, 1 of 2</);
    expect(out.match(/Season Wrapped/g)).toHaveLength(2);
  });
});
