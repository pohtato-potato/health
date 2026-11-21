import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FbPlayer } from '../../src/football/players/types';
import { UnitView } from '../../src/screens/football/players/Screens';

const pl = (id: string, rating: number, extra: Partial<FbPlayer> = {}) => ({ p: { id, name: `Test ${id}`, art: 'pushh', unit: 'Power', overall: rating, card: { tier: 'silver', step: 1 }, status: 'squad', kind: 'habit', form: 0, goals: 0, ...extra } as unknown as FbPlayer, r: rating });

describe('u19 A unit', () => {
  it('tonight\'s starter first and lit, then the rest best first; head counts and the best', () => {
    const out = html(<UnitView u="Power" rows={[pl('a', 60), pl('b', 72), pl('c', 55), pl('d', 40, { status: 'left' } as never)]} starters={new Set(['c'])} />);
    const order = ['Test c', 'Test b', 'Test a', 'Test d'].map((n) => out.indexOf(`>${n}<`));
    expect(order).toEqual([...order].sort((x, y) => x - y));
    expect(out).toContain('class="ur19-r xi"');
    expect(out).toContain('Starts');
    expect(out).toContain('>3<');
    expect(out).toContain('1 starts tonight');
    expect(out).toContain('best tonight');
    expect(out).toContain('>72<');
  });
});
