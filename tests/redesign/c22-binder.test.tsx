import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BUILT_INS } from '../../src/football/data/abilities';
import type { FbPlayer } from '../../src/football/players/types';
import { AbilitySlots, Binder } from '../../src/screens/football/club/Squad';

const pl = (id: string, unit: string, overall: number): FbPlayer => ({ id, name: `Test ${id}`, art: 'pushh', unit, overall, card: { tier: 'silver', step: 2 }, status: 'squad', versions: [] }) as unknown as FbPlayer;

describe('c22 Squad, the binder', () => {
  it('the three equipped abilities sit at the top; an empty slot says so', () => {
    const out = html(<AbilitySlots slots={[BUILT_INS[1].id, BUILT_INS[2].id]} />);
    expect(out).toContain('aria-label="Ability slots"');
    expect(out.match(/<li/g)).toHaveLength(3);
    for (const t of ['Slot 1', 'Slot 2', 'Slot 3', BUILT_INS[1].name, BUILT_INS[2].name, 'Empty']) expect(out).toContain(t);
  });
  it('each unit is a page of cards, best first, starters marked in words and a ring; more than ten link to the unit', () => {
    const power = Array.from({ length: 12 }, (_, i) => pl(`p${i}`, 'Power', 40 + i));
    const out = html(<Binder players={[...power, pl('f1', 'Fuel', 55)]} starters={new Set(['p11', 'f1'])} />);
    expect(out).toContain('>Power<');
    expect(out).toContain('12 · ');
    expect(out.match(/class="bd19-c/g)).toHaveLength(11);
    expect(out).toContain('2 more in Power');
    expect(out.indexOf('>51<')).toBeLessThan(out.indexOf('>50<'));
    expect(out).toContain('class="bd19-c xi"');
    expect(out).toContain('Test p11, 51, starts tonight');
    expect(out).toContain('Starts tonight');
  });
});
