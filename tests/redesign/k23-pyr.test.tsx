import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CLUBS } from '../../src/football/data/load';
import { OWN } from '../../src/football/store/season';
import { TIERS } from '../../src/football/types';
import { Pyramid } from '../../src/screens/football/league/Pyramid';

const tierOf = Object.fromEntries([[OWN, 3], ...CLUBS.filter((c) => c.kind !== 'own').slice(0, 60).map((c, i) => [c.id, TIERS[i % TIERS.length]])]) as never;

describe('k23 The pyramid', () => {
  it('one level per tier in the app’s list, best at the top and narrowest', () => {
    const out = html(<Pyramid tierOf={tierOf} rating={50} />);
    expect(out.match(/class="fb-tier/g)).toHaveLength(TIERS.length);
    const w = [...out.matchAll(/--w:(\d+)%/g)].map((m) => Number(m[1]));
    expect(w).toEqual([...w].sort((a, b) => a - b));
    expect(out).toMatch(/class="pyr-n"[^>]*>1</);
  });
  it('"You" sits on your tier, in words', () => {
    const out = html(<Pyramid tierOf={tierOf} rating={50} />);
    expect(out.match(/class="pyr-you"/g)).toHaveLength(1);
    expect(out).toMatch(/fb-tier t3 here[\s\S]*?pyr-you[^>]*>You</);
  });
});
