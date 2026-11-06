import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clubCrest, crestSvg, kitCrest, realCrest } from '../../src/football/art/crest';
import { BRABO_KITS, kitSvg, PATCH_CREAM } from '../../src/football/art/kit';
import { CLUBS } from '../../src/football/data/load';

describe('crests and kits', () => {
  it('every one of the 108 clubs returns an SVG with a viewBox', () => {
    expect(CLUBS).toHaveLength(108);
    for (const c of CLUBS) {
      const s = clubCrest(c, 40);
      expect(s, c.id).toMatch(/^<svg[^>]*viewBox="0 0 100 100"/);
      expect(s).toContain('</svg>');
    }
  });

  it('crest 1a carries the turret path from the approved file', () => {
    const file = readFileSync('tests/football/fixtures/crest-1a-turret.txt', 'utf8').trim();
    expect(crestSvg(1, 'a', 64)).toContain(file);
  });

  it('all 25 steps render, each with unique ids', () => {
    for (const s of [1, 2, 3, 4, 5] as const) for (const o of ['a', 'b', 'c', 'd', 'e'] as const) {
      const a = crestSvg(s, o, 64), b = crestSvg(s, o, 64);
      expect(a).toMatch(/<path|<circle|<text|<polygon/);
      const ids = (x: string) => [...x.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
      for (const id of ids(a)) expect(ids(b)).not.toContain(id);
    }
  });

  it('a kit with a patch puts it at (100, 82) in cream', () => {
    const s = kitSvg(BRABO_KITS.A[0], 'front', 150, { patch: { text: 'TF' }, sponsor: 'De Kaai' });
    expect(s).toContain('cx="100" cy="82"');
    expect(s).toContain(PATCH_CREAM);
    expect(PATCH_CREAM).toBe('#f3e7d3');
    expect(kitSvg(BRABO_KITS.A[0], 'front', 150)).not.toContain('cy="82"');
  });

  it('kit backs carry the name and number', () => {
    const s = kitSvg(BRABO_KITS.B[1], 'back', 150, { name: 'Brabo United', number: 7 });
    expect(s).toContain('BRABO UNITED');
    expect(s).toContain('>7<');
  });

  it('every real crest is aria-hidden, and kit crests are too unless labelled', () => {
    for (const c of CLUBS.filter((x) => x.kind === 'real')) expect(realCrest(c, 40)).toContain('aria-hidden="true"');
    expect(kitCrest('round', 'anchor', '#fff', 40)).toContain('aria-hidden="true"');
    expect(kitCrest('round', 'anchor', '#fff', 40, 'Delfshaven')).toContain('aria-label="Delfshaven"');
  });

  it('escapes club text', () => {
    expect(kitSvg(BRABO_KITS.A[0], 'front', 100, { sponsor: '<b>' })).not.toContain('<b>');
  });
});
