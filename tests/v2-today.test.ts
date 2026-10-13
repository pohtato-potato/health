import { describe, expect, it } from 'vitest';
import { pickBanner, usualHour } from '../src/domain/banners';
import { proteinGap, stepTopUp } from '../src/domain/proteinGap';
import { regionAt } from '../src/domain/regions';
import type { Food, FoodEntry } from '../src/domain/types';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();

describe('one banner at your hour', () => {
  const usage = [9, 10, 11, 12].map((d) => ({ at: at(d, 21, 15), kind: 'log' }));

  it('usualHour is the median logging time over 14 days, else 21:00', () => {
    expect(usualHour(usage, at(13, 12))).toBe(21 * 60 + 15);
    expect(usualHour([], at(13, 12))).toBe(21 * 60);
    expect(usualHour([{ at: at(1, 8), kind: 'log' }], at(30, 12))).toBe(21 * 60);
  });

  it('one banner at a time, highest priority', () => {
    const b = pickBanner([{ id: 'install', priority: 1 }, { id: 'dose', priority: 9, anytime: true }, { id: 'backup', priority: 5 }], usage, at(13, 21));
    expect(b?.id).toBe('dose');
  });

  it('banner waits for usual hour', () => {
    const c = [{ id: 'backup', priority: 5 }];
    expect(pickBanner(c, usage, at(13, 14))).toBeUndefined();
    expect(pickBanner(c, usage, at(13, 20, 30))).toEqual(c[0]);
    expect(pickBanner([{ id: 'update', priority: 2, anytime: true }], usage, at(13, 14))?.id).toBe('update');
  });
});

describe('protein gap', () => {
  const f = (id: string, kcal: number, protein: number): Food => ({ id, name: id, unit: 'serving', per: 1, kcal, protein, defaultAmount: 1, createdAt: 0 }) as Food;
  const foods = [f('shake', 180, 30), f('eggs', 140, 12), f('paneer', 300, 18), f('lentil-chips', 150, 8), f('never', 100, 25)];
  const e = (foodId: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${foodId}${i}`, date: '2026-10-01', meal: 'snacks', at: 0, kind: 'food', foodId, name: foodId, portion: '1', kcal: 0, protein: 0 }) as FoodEntry);
  const history = [...e('shake', 6), ...e('eggs', 8), ...e('paneer', 2), ...e('lentil-chips', 1)];

  it('never suggests removing food and picks usuals first', () => {
    const g = proteinGap({ protein: 96, proteinTarget: 130, kcal: 1240, kcalMax: 2050 }, foods, history, at(13, 19));
    expect(g.mode).toBe('gap');
    expect(g.gapG).toBe(34);
    expect(g.picks.map((p) => p.foodId).slice(0, 2)).toEqual(['shake', 'eggs']);
    expect(g.picks.every((p) => p.amount > 0)).toBe(true);
    expect(g.picks.map((p) => p.foodId)).not.toContain('never');
    expect(g.picks.reduce((n, p) => n + p.kcal, 0)).toBeLessThanOrEqual(2050 - 1240);
  });

  it('a small gap gets the lightest usual food that covers it', () => {
    const g = proteinGap({ protein: 126, proteinTarget: 130, kcal: 1500, kcalMax: 2050 }, foods, history, at(13, 19));
    expect(g.picks.map((p) => p.foodId)).toEqual(['eggs']);
  });

  it('after 22:00 protein gap yields to close the day', () => {
    expect(proteinGap({ protein: 96, proteinTarget: 130, kcal: 1240, kcalMax: 2050 }, foods, history, at(13, 22, 5)).mode).toBe('close');
  });

  it('a closed ring has no gap', () => {
    expect(proteinGap({ protein: 140, proteinTarget: 130, kcal: 1900, kcalMax: 2050 }, foods, history, at(13, 19)).mode).toBe('done');
  });
});

describe('evening step top-up', () => {
  it('shows after 18:00 on eased days when reachable', () => {
    expect(stepTopUp({ steps: 6800, goal: 10000, eased: true }, at(13, 19))).toBe('3,200 to go, about a 30-minute walk.');
  });
  it('step top-up hidden when unreachable', () => {
    expect(stepTopUp({ steps: 2000, goal: 10000, eased: true }, at(13, 19))).toBeUndefined();
    expect(stepTopUp({ steps: 6800, goal: 10000, eased: true }, at(13, 15))).toBeUndefined();
    expect(stepTopUp({ steps: 6800, goal: 10000, eased: false }, at(13, 19))).toBeUndefined();
    expect(stepTopUp({ steps: 10200, goal: 10000, eased: true }, at(13, 19))).toBeUndefined();
  });
});

describe('regions', () => {
  it('the walk passes through the plains, ravines and deccan', () => {
    expect(regionAt(10)).toBe('plains');
    expect(regionAt(330)).toBe('ravines');
    expect(regionAt(1300)).toBe('deccan');
    expect(regionAt(2700)).toBe('coast');
  });
});
