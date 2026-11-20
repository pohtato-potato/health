import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CameraScene, proj, ScoreBug } from '../../src/screens/football/match/Broadcast';

// Invented players.
const inks = { us: '#ff9a4d', them: '#ece8f4' };

describe('Broadcast camera (m16-cam)', () => {
  it('draws the pitch in perspective: the far goal line narrower and higher than the near one', () => {
    const [nl] = proj(0, 0.4), [nr] = proj(1, 0.4), [fl, fy] = proj(0, 1), [fr] = proj(1, 1);
    expect(fr - fl).toBeLessThan(nr - nl);
    expect(fy).toBeLessThan(proj(0, 0.4)[1]);
  });

  it('names the move in order as text and hides the drawing', () => {
    const h = renderToStaticMarkup(<CameraScene chain={['Ada', 'Bo', 'Cy']} inks={inks} />);
    expect(h).toMatch(/<ol class="mb-names" aria-label="The move"><li[^>]*>Ada<\/li><li[^>]*>Bo<\/li><li[^>]*>Cy<\/li>/);
    expect(h).toMatch(/<svg class="mb-camsvg"[^>]*aria-hidden="true"/);
    expect((h.match(/class="mb-tok"/g) ?? []).length).toBe(3);
  });

  it('keeps the score bug: the camera sits under it, the bug unchanged', () => {
    const bug = renderToStaticMarkup(<ScoreBug sides={[{ name: 'Brabo', short: 'BRA', crest: '', n: 1, ours: true }, { name: 'Harbour Town', short: 'HAR', crest: '', n: 0, ours: false }]} minute={30} />);
    expect(bug).toContain('<b>30′</b>');
  });

  it('renders with no data: no move names, no numbers on their players', () => {
    const h = renderToStaticMarkup(<CameraScene chain={[]} inks={inks} />);
    expect(h).not.toContain('mb-names');
    expect(h).not.toContain('class="mb-no"');
    expect((h.match(/class="mb-tok"/g) ?? []).length).toBe(1);
  });
});
