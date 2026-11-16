// Ledger O40, finding D: every tech has an effect the owner can reach, and the page that shows it is a real route.
import { describe, expect, it } from 'vitest';
import { TECHS } from '../../src/football/content/tree';
import { NOT_RUN_YET, techReach } from '../../src/football/tree/reach';
import { readFileSync } from 'node:fs';

const routes = readFileSync('src/App.tsx', 'utf8');

describe('every tech reaches somewhere (O40)', () => {
  it('each tech names at least one change, with a door to a real page', () => {
    for (const t of TECHS) {
      const r = techReach(t);
      expect(r.length, t.id).toBeGreaterThan(0);
      for (const x of r) expect(routes.includes(`'${x.place.to}'`), `${t.id} → ${x.place.to}`).toBe(true);
    }
  });
  it('only Gegenpress has nothing running yet', () => {
    // Gegenpress would change match odds and waits for the owner; Testimonials was wired on 16 Nov.
    expect(TECHS.filter((t) => !techReach(t).some((x) => !x.waiting)).map((t) => t.id)).toEqual(['n-gegenpress']);
  });
  it('the effects not run yet are only the ones listed for the owner', () => {
    const waiting = TECHS.flatMap((t) => t.effects).filter((e) =>
      (e.kind === 'rule' && NOT_RUN_YET.rule.includes(e.rule)) || (e.kind === 'unlock' && NOT_RUN_YET.unlock.includes(e.what)));
    expect(waiting.length).toBeGreaterThan(0);
    expect(waiting.length).toBeLessThanOrEqual(NOT_RUN_YET.rule.length + NOT_RUN_YET.unlock.length);
  });
});
