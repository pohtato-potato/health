import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HiddenSeal, whatPlayed, WhatPlayed } from '../../src/screens/football/FullTime';
import type { ChanceEvent, Mod } from '../../src/football/types';

const ch = (minute: number, mods: Mod[], extra: Partial<ChanceEvent> = {}) => ({ minute, side: 'atk', type: 'Tap-in', mods, values: {}, reach: 1, pct: 40, land: [0, 0], ok: false, glDist: null, kept: false, ...extra }) as unknown as ChanceEvent;

describe('Full time, what played (f23-ft)', () => {
  it('one row per ability that played, most-used first, with how often', () => {
    const rows = whatPlayed([
      ch(10, [{ axis: 'Pace', d: 1, why: 'Groundsman', kind: 'ability' }, { axis: 'Pace', d: 2, why: 'Captain', kind: 'captain' }]),
      ch(30, [{ axis: 'Pace', d: 1, why: 'Groundsman', kind: 'ability' }, { axis: 'Power', d: -1, why: 'JUV', kind: 'opp' }]),
      ch(50, [{ axis: 'Pace', d: 2.5, why: 'Weekly stack', kind: 'stack' }, { axis: 'Power', d: 2.5, why: 'Weekly stack', kind: 'stack' }, { axis: 'Fuel', d: 2.5, why: 'Weekly stack', kind: 'stack' }]),
    ]);
    expect(rows.map((r) => r.name)).toEqual(['Groundsman', 'Captain’s armband', 'The weekly stack']);
    expect(rows[0]).toMatchObject({ line: '+1 Pace', tally: '2 chances' });
    expect(rows[2].line).toBe('+2.5 to 3 axes');
    expect(rows.some((r) => r.name === 'JUV')).toBe(false);
  });

  it('a retake is its own row saying what came of it', () => {
    const rows = whatPlayed([ch(87, [], { retake: { land: [0, 0], ok: true, why: 'Second wind' } })]);
    expect(rows[0]).toMatchObject({ name: 'Second wind', line: 'The 87′ miss, taken again', tally: '1 goal' });
  });

  it('the list is words beside each dot, and nothing shows when nothing played', () => {
    const out = renderToStaticMarkup(<WhatPlayed rows={[{ name: 'Groundsman', line: '+1 Pace', tally: '2 chances', ink: '#8fdcb6' }]} />);
    expect(out).toContain('What played tonight');
    expect(out).toContain('1 ability');
    expect(out).toContain('<i aria-hidden="true"></i><span><b>Groundsman</b><small>+1 Pace</small></span><em>2 chances</em>');
    expect(renderToStaticMarkup(<WhatPlayed rows={[]} />)).toBe('');
  });

  it('the hidden ability card says whether it woke', () => {
    const asleep = renderToStaticMarkup(<HiddenSeal club="Harbour Town" crest="<svg></svg>" name="Test Trick" text="Once they lead, your Power is pressed." woke={0} />);
    expect(asleep).toContain('Harbour Town’s hidden ability');
    expect(asleep).toContain('Test Trick');
    expect(asleep).toContain('Never woke tonight');
    expect(renderToStaticMarkup(<HiddenSeal club="Harbour Town" crest="" name="Test Trick" woke={3} />)).toContain('Woke on 3 chances');
  });
});
