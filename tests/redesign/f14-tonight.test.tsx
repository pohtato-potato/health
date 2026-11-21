import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { heroLook, TonightHero, type HeroSide } from '../../src/screens/football/TonightHero';

// Invented clubs and numbers.
const us: HeroSide = { name: 'Brabo', crest: '<svg aria-label="our crest"></svg>', pos: 3, form: ['W', 'D', 'W'], ink: '#ff9a4d' };
const them: HeroSide = { name: 'Harbour Town', crest: '<svg aria-label="their crest"></svg>', pos: 4, form: ['L', 'W'], ink: '#93c3dc' };
const where = 'League · Day 7 of 42 · away';
const html = (look: 'stadium' | 'poster' | 'split', extra = {}) =>
  renderToStaticMarkup(<TonightHero look={look} us={us} them={them} where={where} chance={{ p: [31, 26, 43], usual: false }} {...extra} />);

describe('Tonight hero (f14-stadium, f14-poster, f14-split)', () => {
  it('most matches use Stadium; cups and big nights Poster; rivalries Split', () => {
    expect(heroLook({ comp: 'league', rival: false, big: false })).toBe('stadium');
    expect(heroLook({ comp: 'event', rival: false, big: false })).toBe('stadium');
    expect(heroLook({ comp: 'bigcup', rival: false, big: false })).toBe('poster');
    expect(heroLook({ comp: 'league', rival: false, big: true })).toBe('poster');
    expect(heroLook({ comp: 'league', rival: true, big: true })).toBe('split');
  });

  it('Stadium: both crests whole, both names and the fixture as text', () => {
    const h = html('stadium');
    expect(h).toContain('aria-label="our crest"');
    expect(h).toContain('aria-label="their crest"');
    expect(h).toMatch(/<b class="lth-nm">Brabo<\/b><small>3rd · W D W<\/small>/);
    expect(h).toContain('Harbour Town');
    expect(h).toMatch(/<p class="lth-where">League<span>Day 7 of 42 · away<\/span><\/p>/);
  });

  it('the chance as numbers with words, and the crowd and beams hidden from readers', () => {
    const h = html('stadium');
    expect(h).toContain('role="img" aria-label="31% win, 26% draw, 43% loss"');
    expect(h).toContain('<b>43%</b><span>loss</span>');
    expect(h).toContain('Tonight’s chance, as it stands');
    expect(h).toMatch(/class="lth-stand" aria-hidden="true"/);
    expect(h).toMatch(/class="lth-bm l" aria-hidden="true"/);
  });

  it('Poster: crests whole in medallions, the chance as three numbers, the largest marked', () => {
    const h = html('poster', { tag: 'Top-of-the-table clash' });
    expect(h).toContain('data-look="poster"');
    expect((h.match(/class="lth-med /g) ?? []).length).toBe(2);
    expect(h).toMatch(/<div class="big"[^>]*><b>43%<\/b>/);
    expect(h).toContain('Top-of-the-table clash');
    expect(h).toContain(`<p class="lth-chip">${where}</p>`);
  });

  it('Split: two halves and bubbles, the bolt decoration only', () => {
    const h = html('split');
    expect(h).toContain('class="lth-h a"');
    expect(h).toContain('class="lth-h b"');
    expect(h).toMatch(/class="lth-bolt"[^>]*aria-hidden="true"/);
    expect(h).toContain('class="lth-bub" role="img"');
  });

  it('renders with no data: no opponent yet, no chance, no table', () => {
    const h = renderToStaticMarkup(<TonightHero look="stadium" us={{ name: 'Brabo', crest: '<svg></svg>', ink: '#ff9a4d' }} where="Friendly" />);
    expect(h).toContain('Drawn on the night');
    expect(h).toContain('lth-unknown');
    expect(h).not.toContain('lth-board');
    expect(h).not.toContain('<small>');
    expect(h).not.toMatch(/>0%?</);
  });
});
