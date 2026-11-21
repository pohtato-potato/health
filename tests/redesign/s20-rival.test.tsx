import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { clubById } from '../../src/football/data/load';
import { twistOf } from '../../src/football/rivals';
import { RivalryView } from '../../src/screens/football/story/Rivalry';

const r = { clubId: 'zur', how: 'cup' as const, since: '2026-10-08' };

describe('s20 The rival', () => {
  it('both crests fly in with a bolt between, the name and since when, the record and the rivalry modifier', () => {
    const out = html(<RivalryView r={r} matches={[]} own={{ step: 2, opt: 'a' }} />);
    expect(out).toMatch(/class="fo20"[\s\S]*class="a"><span[^>]*><svg class="fb-crest"[\s\S]*class="bolt"[\s\S]*class="b"><span[^>]*><svg/);
    expect(out).toContain(`<b>${clubById('zur').name}</b>`);
    expect(out).toContain('Your rival since 8 Oct');
    expect(out.match(/class="sb20-t"/g)).toHaveLength(3);
    expect(out).toContain('The rivalry’s modifier');
    expect(out).toContain(twistOf(r).name);
    expect(out).toContain('You haven’t met yet.');
  });
});
