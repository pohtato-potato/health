import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { DuskFoot } from '../../src/screens/football/club/DuskFoot';

const foot = () => renderToStaticMarkup(<DuskFoot crest="<svg></svg>" name="Test United" under="Division Three · 1st · Season 1" story="The Kaai is a building site."
  facts={[['47', 'squad'], ['€1.2m', 'budget'], ['10', 'built'], ['HAR', 'rival']]} sky={<svg className="sky-x" />} />);

describe('Club, the night slate (c19-dusk)', () => {
  it('the dusk drawing is hidden from screen readers; the name, standing and facts are words', () => {
    const out = foot();
    expect(out).toMatch(/<div class="c19-sky" aria-hidden="true"><svg class="sky-x"><\/svg><div class="c19-refl"><svg class="sky-x">/);
    expect(out).toContain('<b>Test United</b><span>Division Three · 1st · Season 1</span>');
    for (const [v, w] of [['47', 'squad'], ['€1.2m', 'budget'], ['10', 'built'], ['HAR', 'rival']]) expect(out).toContain(`<li><b>${v}</b>${w}</li>`);
    expect(out).toContain('The Kaai is a building site.');
  });

  it('the page runs the eleven, then the doors, then the dusk foot', () => {
    const src = readFileSync('src/screens/football/club/ClubHome.tsx', 'utf8');
    const front = src.slice(src.indexOf('function ClubFront'));
    const at = (s: string) => front.indexOf(s);
    expect(at('c19-frame')).toBeGreaterThan(0);
    expect(at('c19-frame')).toBeLessThan(at('<FamilyDoors'));
    expect(at('<FamilyDoors')).toBeLessThan(at('<DuskFoot'));
  });
});
