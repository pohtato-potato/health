import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/domain/dates';
import { ABILITIES, BUILT_INS, braboAbilities } from '../../src/football/data/abilities';
import { BACK } from '../../src/football/data/backpage';
import { PRESS } from '../../src/football/data/press';
import { STUDIO } from '../../src/football/data/studio';
import { allTemplates, bankSize, FACT_KEYS, fill, pickLine, placeholders, pressHeadline, type Facts, type LineKind } from '../../src/football/news';
import { hashSeed, pick, rng } from '../../src/football/rng';
import { AXES } from '../../src/football/types';

const GROUPS = ['win', 'loss', 'draw', 'screamer', 'heartbreak', 'rival', 'promotion', 'relegation', 'streak', 'cup', 'world', 'oldself', 'fouram', 'rotation'];
const FULL = { club: 'Brabo', opp: 'Ostend', score: '2-1', minute: 63, pct: 18, streak: 4, axis: 'Pace', tier: 'Division Five' };

describe('line bank', () => {
  it('has the counts the spec asks for', () => {
    expect(bankSize('back')).toBeGreaterThanOrEqual(400);
    expect(bankSize('studio')).toBeGreaterThanOrEqual(150);
    expect(PRESS.length).toBeGreaterThanOrEqual(60);
  });

  it('groups lines by every situation', () => {
    for (const g of GROUPS) {
      expect(BACK[g]?.length, `back ${g}`).toBeGreaterThan(0);
      expect(STUDIO[g]?.length, `studio ${g}`).toBeGreaterThan(0);
    }
  });

  it('studio exchanges have three lines', () => {
    for (const list of Object.values(STUDIO)) for (const ex of list) {
      expect(ex).toHaveLength(3);
      for (const l of ex) expect(l.trim().length).toBeGreaterThan(0);
    }
  });

  it('every press item has exactly 3 answers and 3 headlines', () => {
    for (const p of PRESS) {
      expect(p.a).toHaveLength(3);
      expect(p.h).toHaveLength(3);
      for (const s of [...p.a, ...p.h]) expect(s.trim().length).toBeGreaterThan(3);
    }
  });

  it('every placeholder used is in the facts list', () => {
    const keys = new Set<string>(FACT_KEYS);
    const texts = [...allTemplates('back'), ...allTemplates('studio'), ...PRESS.flatMap((p) => [p.q, ...p.a, ...p.h])];
    for (const t of texts) for (const k of placeholders(t)) expect(keys.has(k), `${k} in "${t}"`).toBe(true);
  });

  it('no gendered pronouns or religious words in the bank', () => {
    const texts = [...allTemplates('back'), ...allTemplates('studio'), ...PRESS.flatMap((p) => [p.q, ...p.a, ...p.h])].join('\n');
    expect(texts).not.toMatch(/\b(he|she|him|her|his|hers|god|gods|heaven|prayer|pray|horoscope|zodiac)\b/i);
  });

  it('fill swaps known facts and leaves unknown ones', () => {
    expect(fill('{club} {score} {opp}', FULL)).toBe('Brabo 2-1 Ostend');
    expect(fill('{club} {streak}', { club: 'Brabo' })).toBe('Brabo {streak}');
  });

  it('no template repeats within 30 days, over 120 days', () => {
    for (const kind of ['back', 'studio', 'press'] as LineKind[]) {
      const used: { id: string; date: string }[] = [];
      const r = rng(hashSeed('news', kind));
      let date = '2026-01-01';
      for (let d = 0; d < 120; d++) {
        const result = pick(r, ['win', 'loss', 'draw'] as const);
        // Lopsided on purpose: the same situation most nights.
        const situation = r() < 0.7 ? result : pick(r, GROUPS);
        const facts: Facts = { ...FULL, situation, result, date };
        const p = pickLine(kind, facts, used, r);
        const clash = used.find((u) => u.id === p.id && u.date > addDays(date, -30));
        expect(clash, `${kind} ${p.id} on ${date}`).toBeUndefined();
        expect(p.text).not.toMatch(/\{\w+\}/);
        used.push({ id: p.id, date });
        date = addDays(date, 1);
      }
    }
  });

  it('skips templates that need a fact the night does not have', () => {
    const r = rng(1);
    for (let i = 0; i < 50; i++) {
      const p = pickLine('back', { club: 'Brabo', opp: 'Ostend', score: '1-0', situation: 'win', result: 'win', date: '2026-01-01' }, [], r);
      expect(p.text).not.toMatch(/\{\w+\}/);
    }
  });

  it('a press answer becomes its headline', () => {
    const p = pickLine('press', { ...FULL, situation: 'win', result: 'win', date: '2026-01-01' }, [], rng(3));
    expect(p.parts).toHaveLength(4);
    const h = pressHeadline(p.id, 1, FULL);
    expect(h).toBeTruthy();
    expect(h).not.toMatch(/\{\w+\}/);
  });
});

describe('abilities', () => {
  it('has at least 12 earned abilities, each from a moment', () => {
    expect(ABILITIES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ABILITIES.map((a) => a.from)).size).toBe(ABILITIES.length);
    expect(new Set([...ABILITIES, ...BUILT_INS].map((a) => a.id)).size).toBe(ABILITIES.length + BUILT_INS.length);
  });

  it('every ability axis is in AXES', () => {
    for (const a of ABILITIES) expect(AXES).toContain(a.effect!.axis);
  });

  it('includes the built-ins', () => {
    expect(BUILT_INS.map((a) => a.id)).toEqual(expect.arrayContaining(['armband', 'second-wind', 'stack', 'youth-sub']));
  });

  it('maps equipped slots to engine abilities', () => {
    const b = braboAbilities(['armband', 'second-wind', 'smash-and-grab', 'nope']);
    expect(b).toEqual([
      { id: 'second-wind', name: 'Second wind' },
      { id: 'smash-and-grab', name: 'Smash and Grab', axis: 'Power', d: 2, when: 'long' },
    ]);
  });
});
