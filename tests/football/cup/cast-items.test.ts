// Fork 4: the cast's heirlooms and meal card in the cup pool, only once a bond rank brings them.
import { describe, expect, it } from 'vitest';
import { CAST_HEIRLOOMS, heirloomById } from '../../../src/football/cup/heirlooms';
import { costOf, newMatch, TUNE } from '../../../src/football/cup/match';
import { MEAL_CARD, POOL } from '../../../src/football/cup/pool';
import { startRun } from '../../../src/football/cup/run';
import type { Card } from '../../../src/football/cup/types';
import { pickOffer } from '../../../src/football/matchday';

const club = { id: 'x', name: 'T', short: 'T', rating: 60, tier: 4 as const, style: 'keep' as const, scouted: false, colours: ['#fff', '#000'] as [string, string] };
const hold = (i: number): Card => ({ id: `h${i}`, kind: 'hold', level: 'basic', axis: 'Rest' });
const deck = Array.from({ length: 12 }, (_, i) => hold(i));

describe('the cast in the cup', () => {
  it('three heirlooms and a meal card exist, each with one rule', () => {
    for (const id of CAST_HEIRLOOMS) expect(heirloomById(id)?.rule).toBeTruthy();
    expect(POOL.find((d) => d.id === MEAL_CARD)?.axis).toBe('Fuel');
  });

  it('a run carries them only when the cast brought them', () => {
    expect(startRun({ cup: 1, seed: 1, date: '2030-01-01', now: 0, deck }).cast).toBeUndefined();
    expect(startRun({ cup: 1, seed: 1, date: '2030-01-01', now: 0, deck, cast: ['tape-gun', MEAL_CARD] }).cast).toEqual(['tape-gun', MEAL_CARD]);
  });

  it('the 1987 tape: the first card costs 1 less while the squad is fully fit', () => {
    const s = newMatch({ seed: 3, deck, club, mods: { heir: ['tape-1987'] } });
    const c: Card = { id: 'q', kind: 'hold', level: 'basic', axis: 'Rest' };
    const plain = newMatch({ seed: 3, deck, club });
    expect(costOf(s, c)).toBe(Math.max(0, costOf(plain, c) - 1));
    s.fitness = TUNE.fitness - 1;
    expect(costOf(s, c)).toBe(costOf(plain, c));
  });

  it('the Radio Stroom scarf: Rest cards cost 1 less in the last match only', () => {
    const c: Card = { id: 'q', kind: 'hold', level: 'basic', axis: 'Rest' };
    const plain = newMatch({ seed: 3, deck, club });
    plain.played = 1;
    const last = newMatch({ seed: 3, deck, club, mods: { heir: ['radio-scarf'], lastMatch: true } });
    last.played = 1;
    const early = newMatch({ seed: 3, deck, club, mods: { heir: ['radio-scarf'] } });
    early.played = 1;
    expect(costOf(last, c)).toBe(Math.max(0, costOf(plain, c) - 1));
    expect(costOf(early, c)).toBe(costOf(plain, c));
  });

  it('bond points join the pick of three: four tiles in the pool, three offered, seeded', () => {
    const a = pickOffer('d1', ['ker', 'laa'], 0, ['physio', 'cook']);
    expect(a).toHaveLength(3);
    expect(pickOffer('d1', ['ker', 'laa'], 0, ['physio', 'cook'])).toEqual(a);
    let bonds = 0;
    for (let i = 0; i < 40; i++) if (pickOffer(`d${i}`, ['ker', 'laa'], 0, ['physio']).some((t) => t.kind === 'bond')) bonds++;
    expect(bonds).toBeGreaterThan(20);
    expect(bonds).toBeLessThan(40);
  });
});
