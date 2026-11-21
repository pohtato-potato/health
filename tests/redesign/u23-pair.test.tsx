import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CLUBS } from '../../src/football/data/load';
import { PAIRCUP_ID } from '../../src/football/pyramid/cups';
import { OWN } from '../../src/football/store/season';
import { Cup, cupLook } from '../../src/screens/football/league/Cups';

const [a] = CLUBS.filter((x) => x.kind !== 'own').slice(0, 1).map((x) => x.id);
const pair = { id: PAIRCUP_ID, name: 'The Pair Cup', size: 32, rounds: [{ name: 'First round', day: 12, ties: [{ home: a, away: OWN }] }, { name: 'Final', day: 28, ties: [] }] } as never;

describe('u23 The Pair Cup', () => {
  it('the same page in its own blue, with its two-cup trophy', () => {
    expect(cupLook(PAIRCUP_ID).ink).toBe('#8fd8ff');
    expect(cupLook('bigcup').ink).toBe('#ffd36b');
    const out = html(<Cup b={pair} tierOf={{}} />);
    expect(out).toContain('--c:#8fd8ff');
    expect(out).toContain('The Pair Cup');
    expect(out).toMatch(/First round, away · day 12/);
  });
});
