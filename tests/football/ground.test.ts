import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/domain/dates';
import { playMatch } from '../../src/football/engine';
import { opponentFor } from '../../src/football/opponent';
import { clubById } from '../../src/football/data/load';
import { BUNDLES, bundleById, bundleDay, groundAbilities, isOpen, isShut, type BundleState, type Need } from '../../src/football/ground';
import { allAxes } from '../../src/football/types';

const zero: Record<Need, number> = { steps: 0, training: 0, sleep: 0, protein: 0, bedtime: 0, meds: 0, kcal: 0, youth: 0, none: 0 };

describe('Bundles', () => {
  it('the plot completes after 20 days at the step goal plus the money', () => {
    const plot = bundleById('plot');
    let st: BundleState = { id: 'plot', progress: {} };
    let d = '2026-11-01';
    for (let i = 0; i < 19; i++, d = addDays(d, 1)) st = bundleDay(plot, st, { ...zero, steps: 1 }, 1, d).state;
    expect(st.done).toBeUndefined();
    const broke = bundleDay(plot, st, { ...zero, steps: 1 }, 0.1, d);
    expect(broke.state.done).toBeUndefined();
    expect(broke.state.progress.steps).toBe(20);
    const paid = bundleDay(plot, broke.state, zero, 0.15, addDays(d, 1));
    expect(paid.state.done).toBe(addDays(d, 1));
    expect(paid.spent).toBe(0.15);
  });
  it('opens by tier, by earlier bundles and by the move', () => {
    const g = { tier: 6 as const, moved: false, done: [] as string[], budget: 1 };
    expect(isOpen(bundleById('plot'), g)).toBe(false);
    expect(isOpen(bundleById('plot'), { ...g, tier: 5 })).toBe(true);
    expect(isOpen(bundleById('kaai-stand'), { ...g, tier: 5, done: ['plot'] })).toBe(true);
    expect(isOpen(bundleById('river-end'), { ...g, tier: 5, done: ['plot', 'kaai-stand'] })).toBe(false);
    expect(isOpen(bundleById('river-end'), { ...g, tier: 5, moved: true, done: ['plot', 'kaai-stand'] })).toBe(true);
  });
  it('an overhaul closes the building for its downtime', () => {
    const mega = bundleById('shop-3');
    expect(mega.downtime).toBe(14);
    expect(isShut(mega, '2026-11-01', '2026-11-01')).toBe(true);
    expect(isShut(mega, '2026-11-01', '2026-11-14')).toBe(true);
    expect(isShut(mega, '2026-11-01', '2026-11-15')).toBe(false);
    expect(isShut(bundleById('river-end'), '2026-11-01', '2026-11-02')).toBe(false);
    expect(BUNDLES.filter((b) => b.downtime).length).toBeGreaterThan(3);
  });
});

describe('The River End', () => {
  it('adds +1 at home in the last 15 minutes and nothing elsewhere', () => {
    const abilities = groundAbilities(['plot', 'kaai-stand', 'river-end']);
    expect(groundAbilities(['plot'])).toEqual([]);
    const opp = opponentFor(clubById('ant'), {});
    const mods = (home: boolean) => Array.from({ length: 30 }, (_, seed) => playMatch({ seed: seed + 1, values: allAxes(12), opp, home, abilities, stack: 0, bench: [], pre: [], conds: [], ctx: { comp: 'league' } }))
      .flatMap((e) => e.chances.flatMap((c) => c.mods.filter((m) => m.why === 'River End').map((m) => ({ minute: c.minute, d: m.d }))));
    const home = mods(true);
    expect(home.length).toBeGreaterThan(0);
    expect(home.every((m) => m.minute >= 75 && m.d === 1)).toBe(true);
    expect(mods(false)).toEqual([]);
  });
});

describe('Bundle progress never reads log times', () => {
  it('ground.ts has no stepsAt, weighedAt or logMinutes', () => {
    const src = readFileSync('src/football/ground.ts', 'utf8');
    for (const bad of ['stepsAt', 'weighedAt', 'logMinutes']) expect(src).not.toContain(bad);
  });
});
