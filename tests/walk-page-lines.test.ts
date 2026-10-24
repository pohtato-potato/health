import { describe, expect, it } from 'vitest';
import { REGIONS, luminance } from '../src/ui/light';
import { arrivedToday, auroraFor, restLine, statusLines } from '../src/walk/page';
import { goldish } from './helpers/goldish';

describe('status lines and the region’s light', () => {
  it('orders the lines arrival, stop, person, rest, at most three', () => {
    const l = statusLines({ arrival: 'Agra', stop: 'A river crossing', person: { name: 'P', who: 'a carter', line: 'Says hello.' }, status: 'sick', near: 'Agra' });
    expect(l.map((x) => x.kind)).toEqual(['arrival', 'stop', 'person']);
    expect(l[0].text).toBe('Arrived in Agra today.');
    expect(l[2].text).toBe('Met P, a carter. Says hello.');
  });

  it('puts a rest day in kind words, and none for an occasion', () => {
    expect(restLine('sick', 'Agra')).toBe('Resting at camp outside Agra. The road waits.');
    expect(restLine('injured', 'Agra')).toBe('Resting at camp outside Agra. The road waits.');
    expect(restLine('break', 'Agra')).toBe('A day off at camp outside Agra. The road waits.');
    expect(restLine('travelling', 'Agra')).toBe('Travelling today. The road keeps your steps as usual.');
    expect(restLine('occasion', 'Agra')).toBeUndefined();
    expect(restLine(undefined, 'Agra')).toBeUndefined();
    expect(statusLines({ status: 'occasion', near: 'Agra' })).toEqual([]);
    expect(statusLines({ status: 'sick', near: 'Agra' })).toEqual([{ kind: 'rest', text: 'Resting at camp outside Agra. The road waits.' }]);
  });

  it('names the city first reached today', () => {
    const steps = new Map([['2026-01-01', 300_000]]); // 222 km at 0.74 m
    expect(arrivedToday(steps, '2026-01-01')).toBeUndefined(); // you start in Delhi; you don't arrive there
    steps.set('2026-01-02', 20_000); // to about 236.8 km: Agra
    expect(arrivedToday(steps, '2026-01-02')).toBe('Agra');
    expect(arrivedToday(steps, '2026-01-03')).toBeUndefined();
  });

  it('tints the aurora dark from the region, never gold', () => {
    for (const r of REGIONS) {
      const t = auroraFor(r);
      expect(luminance(t['--lv-a']), r).toBeLessThan(0.12);
      expect(goldish(t['--lv-a']), r).toBe(false);
      expect(t['--lv-b']).toMatch(/^#[0-9a-f]{6}$/);
      expect(Object.keys(t)).not.toContain('--lv-accent');
    }
  });
});
