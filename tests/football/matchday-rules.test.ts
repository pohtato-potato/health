// Matchday depth, the rules around the engine (spec 2026-11-12 §2.4–2.6): the plan, the read, the pick of three.
import { describe, expect, it } from 'vitest';
import { ANSWER, CARD_MAX, enginePlan, pickOffer, readOf, tacticDelta, weakSide, WIDTHS } from '../../src/football/matchday';
import { STYLES } from '../../src/football/data/load';
import { TACTICS } from '../../src/football/rotation/night';

const club = (id: string, style: string) => ({ id, style });

describe('the read (§2.5)', () => {
  it('every club has a weak side from its id, the same every time', () => {
    const sides = new Set(['ant', 'ker', 'laa', 'hul', 'zur', 'bel', 'mos', 'per'].map(weakSide));
    for (const s of sides) expect(WIDTHS).toContain(s);
    expect(sides.size).toBeGreaterThan(1);
    expect(weakSide('hul')).toBe(weakSide('hul'));
  });
  it('each style has one tactic that answers it', () => {
    for (const style of Object.keys(STYLES)) expect(TACTICS).toContain(ANSWER[style]);
    expect([ANSWER.possession, ANSWER.direct]).toEqual(['press', 'press']);
    expect([ANSWER.counter, ANSWER.flair]).toEqual(['hold', 'hold']);
    expect([ANSWER.press, ANSWER.grit]).toEqual(['counter', 'counter']);
  });
  it('a right tactic and a right width are each worth +1 on one axis, +2 at most; a wrong read costs nothing', () => {
    const c = club('hul', 'possession');
    const both = readOf({ tactic: 'press', width: weakSide('hul') }, c, true);
    expect(both.mods.reduce((t, m) => t + m.d, 0)).toBe(2);
    expect(both.mods.every((m) => m.d === 1)).toBe(true);
    expect(both.line).toMatch(/Good read/);
    const one = readOf({ tactic: 'press', width: WIDTHS.find((w) => w !== weakSide('hul')) }, c, true);
    expect(one.mods.reduce((t, m) => t + m.d, 0)).toBe(1);
    const none = readOf({ tactic: 'hold', width: WIDTHS.find((w) => w !== weakSide('hul')) }, c, true);
    expect(none.mods).toEqual([]);
  });
  it('the read only shows and only counts against a scouted club', () => {
    const r = readOf({ tactic: 'press', width: weakSide('hul') }, club('hul', 'possession'), false);
    expect(r.mods).toEqual([]);
    expect(r.line).toBe('Not scouted yet');
  });
});

describe('the plan (§2.4)', () => {
  it('a tactic change is the difference from the tactic already in tonight’s numbers', () => {
    expect(tacticDelta('press', 'press', 'x')).toEqual([]);
    const d = tacticDelta('press', 'hold', 'Half-time: Hold');
    const by = Object.fromEntries(d.map((m) => [m.axis, m.d]));
    expect(by).toEqual({ Pace: -2, Fuel: -1, Rest: 1, Shape: 1, Routine: 1 });
  });
  it('the engine plan: the read and a card for the whole match, the plan per half, and tempo', () => {
    const p = enginePlan({ baked: 'press', plan: { tactic: 'press', tempo: 'quick', width: 'left', card: 'Power' }, half2: 'counter', read: [{ axis: 'Fuel', d: 1, why: 'Good read', kind: 'plan' }] });
    expect(p.tempo).toBe('quick');
    expect(p.first).toEqual([]);
    expect(p.second!.length).toBeGreaterThan(0);
    expect(p.all!.map((m) => m.why)).toEqual(['Good read', 'Tactic card']);
  });
});

describe('the pick of three after a win (§2.6)', () => {
  it('three tiles, seeded: a tactic card, a scouting lead and research +2', () => {
    const o = pickOffer('2026-11-12', ['ker', 'laa'], 0);
    expect(o).toHaveLength(3);
    expect(o.map((t) => t.kind).sort()).toEqual(['card', 'research', 'scout']);
    expect(pickOffer('2026-11-12', ['ker', 'laa'], 0)).toEqual(o);
    expect(o.find((t) => t.kind === 'research')).toMatchObject({ n: 2 });
  });
  it('never more than three cards held; with no club left to scout, the lead makes way', () => {
    expect(pickOffer('d', ['ker', 'laa'], CARD_MAX).some((t) => t.kind === 'card')).toBe(false);
    expect(pickOffer('d', ['ker', 'laa'], CARD_MAX)).toHaveLength(3);
    const noScout = pickOffer('d', [], 0);
    expect(noScout.some((t) => t.kind === 'scout')).toBe(false);
    expect(noScout.length).toBeGreaterThanOrEqual(2);
  });
});
