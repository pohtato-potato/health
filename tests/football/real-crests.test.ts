// 17 Nov: every real club's crest is its own drawing of its real badge, never a generic shape or a shared drawing.
import { describe, expect, it } from 'vitest';
import { clubCrest, hasRealCrest, realCrest } from '../../src/football/art/crest';
import { onDark, REAL_CRESTS } from '../../src/football/art/realCrests';
import { WORLD_CHAMPS_2, CONT_REAL } from '../../src/football/data/continental';
import { CLUBS, worldDef } from '../../src/football/data/load';
import { WORLD_CLUBS } from '../../src/football/data/world';

const real = [...WORLD_CLUBS.map(worldDef), ...WORLD_CHAMPS_2, ...CONT_REAL, ...CLUBS.filter((c) => c.kind === 'real')];
const ids = [...new Set(real.map((c) => c.id))];

describe('real clubs’ crests', () => {
  it('every real club the app can show has its own drawn crest', () => {
    expect(ids.length).toBeGreaterThanOrEqual(135);
    for (const id of ids) expect(hasRealCrest(id), id).toBe(true);
    for (const c of real) expect(realCrest(c, 28), c.id).toContain('fb-rc');
  });

  it('no two clubs share a drawing, and none is a bare outline with letters', () => {
    const seen = new Map<string, string>();
    for (const id of ids) {
      const body = REAL_CRESTS[id];
      expect(seen.get(body), `${id} draws the same as ${seen.get(body)}`).toBeUndefined();
      seen.set(body, id);
      // A motif or field beyond one outline and its letters.
      expect((body.match(/<(path|circle)/g) ?? []).length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('only real clubs are drawn: no crest is kept for a club that is not in the data', () => {
    for (const id of Object.keys(REAL_CRESTS)) expect(ids, id).toContain(id);
  });

  it('two crests on one page keep their own clips', () => {
    const c = real.find((x) => x.id === 'bar')!;
    const clipIds = (s: string) => [...s.matchAll(/clipPath id="([^"]+)"/g)].map((m) => m[1]);
    const a = clipIds(clubCrest(c, 40)), b = clipIds(clubCrest(c, 40));
    expect(a.length).toBeGreaterThan(0);
    for (const id of a) expect(b).not.toContain(id);
  });

  it('dark and black club colours are lifted so the outline shows on the night page', () => {
    expect(onDark('#000000')).toBe('#f3eee6');
    expect(onDark('#ffe600')).toBe('#ffe600');
    const navy = onDark('#1c2c5b');
    expect(navy).not.toBe('#1c2c5b');
    expect(navy).not.toBe('#f3eee6');
  });
});
