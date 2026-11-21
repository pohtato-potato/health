import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { bugShort, MoveScene, ScoreBug, type BugSide } from '../../src/screens/football/match/Broadcast';
import type { ChanceEvent } from '../../src/football/types';

// Invented clubs, players and numbers.
const us: BugSide = { name: 'Brabo', short: 'BRA', crest: '<svg></svg>', n: 2, ours: true };
const them: BugSide = { name: 'Harbour Town', short: 'HAR', crest: '<svg></svg>', n: 1, ours: false };
const chance = (side: 'atk' | 'def'): ChanceEvent => ({ minute: 63, side, type: 'Through ball', mods: [], values: {} as ChanceEvent['values'], reach: 1, pct: 41, land: [0, 0], ok: true, glDist: null });

describe('The floodlit pitch (m15-pitch)', () => {
  it('the score bug renders score and minute as text', () => {
    const h = renderToStaticMarkup(<ScoreBug sides={[us, them]} minute={63} where="League · Day 7 · home" />);
    expect(h).toMatch(/<div class="mb-sc"><b class="us">2<\/b><span aria-hidden="true">–<\/span><b>1<\/b><\/div>/);
    expect(h).toContain('<b>63′</b>');
    expect(h).toContain('aria-label="Brabo 2, Harbour Town 1, 63 minutes"');
    expect(h).toContain('class="mb-lv"');
    expect(h).toContain('League · Day 7 · home');
  });

  it('a short name for narrow screens, readers get the full one', () => {
    expect(bugShort('Harbour Town')).toBe('HAR');
    expect(bugShort('FC Laagwater')).toBe('LAA');
  });

  it('the move names its players in order as text; the drawing is hidden', () => {
    const h = renderToStaticMarkup(<MoveScene c={chance('atk')} chain={['Ada', 'Bo', 'Cy']} inks={{ us: '#ff9a4d', them: '#93c3dc' }} />);
    expect(h).toMatch(/<ol class="mb-names" aria-label="The move"><li[^>]*>Ada<\/li><li[^>]*>Bo<\/li><li[^>]*>Cy<\/li><\/ol>/);
    expect(h).toMatch(/<svg viewBox="0 0 300 190" aria-hidden="true"/);
    expect(h).toContain('mb-pitch atk');
  });

  it('their attack comes the other way', () => {
    const h = renderToStaticMarkup(<MoveScene c={chance('def')} chain={['Ada']} inks={{ us: '#ff9a4d', them: '#93c3dc' }} />);
    expect(h).toContain('mb-pitch def');
    expect(h).toMatch(/class="mb-net" x="0"/);
  });

  it('renders with no data: kick-off, nil-nil, no move names', () => {
    const h = renderToStaticMarkup(<ScoreBug sides={[{ ...us, n: 0 }, { ...them, n: 0 }]} minute={0} live={false} />);
    expect(h).toContain('<b>0′</b>');
    expect(h).not.toContain('mb-lv');
    const s = renderToStaticMarkup(<MoveScene c={chance('atk')} chain={[]} inks={{ us: '#ff9a4d', them: '#93c3dc' }} />);
    expect(s).not.toContain('mb-names');
  });
});
