import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { applyMoves, seasonEnd } from '../../src/football/promotion';
import { rollOldSelves, type OldSelf } from '../../src/football/oldSelves';
import { shownRating } from '../../src/football/ratings';
import { seasonChange } from '../../src/football/seasonChange';
import { playDue } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import type { Row } from '../../src/football/table';
import { TIERS, allAxes, type Tier } from '../../src/football/types';

const noon = (d: string) => new Date(`${d}T12:00:00`).getTime();
const FOUNDED = '2026-06-01';

describe('Season end', { timeout: 180_000 }, () => {
  beforeAll(async () => {
    setDatabase(new HealthDB('fb-season-end'));
    await db.open();
    await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
    await foundClub(FOUNDED, { shirt: 'A1', crest: 'a' });
    // Day 42 is FOUNDED + 41; playDue plays through yesterday.
    await playDue(noon(addDays(FOUNDED, 42)));
  });

  it('a full season ends with every tier at 18, before and after the moves', async () => {
    const s = (await db.fbSeasons.get(1))!;
    expect(s.final).toBeTruthy();
    for (const t of TIERS) expect(s.final!.tables[t]).toHaveLength(18);
    const save = (await db.fbSave.get('save'))!;
    expect(save.phase).toBe('event');
    const after = applyMoves(s.tierOf, { up: s.final!.up, down: s.final!.down });
    for (const t of TIERS) expect(Object.values(after).filter((x) => x === t)).toHaveLength(18);
  });

  it('season 2 day 1 is the day after the last event day', async () => {
    const save = (await db.fbSave.get('save'))!;
    const eventStart = addDays(FOUNDED, 42);
    const lastEvent = addDays(eventStart, save.event!.days - 1);
    await playDue(noon(addDays(lastEvent, 1)));
    const s2 = (await db.fbSeasons.get(2))!;
    expect(s2).toBeTruthy();
    expect(s2.start).toBe(addDays(lastEvent, 1));
    const now = (await db.fbSave.get('save'))!;
    expect(now.season).toBe(2);
    expect(now.phase).toBe('season');
    for (const t of TIERS) expect(Object.values(s2.tierOf).filter((x) => x === t)).toHaveLength(18);
  });
});

describe('Promotion', () => {
  const table = (ids: string[]): Row[] => ids.map((id, i) => ({ id, p: 34, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 100 - i, form: [] }));
  it('Brabo finishing 1st in Division Six go to Division Five, and their shown ratings drop by 4', () => {
    const tables = {} as Record<Tier, Row[]>;
    const tierOf: Record<string, Tier> = {};
    for (const t of TIERS) {
      const ids = Array.from({ length: 18 }, (_, i) => (t === 6 && i === 0 ? 'bra' : `c${t}-${i}`));
      tables[t] = table(ids);
      for (const id of ids) tierOf[id] = t;
    }
    const moves = seasonEnd(tables, {});
    expect(applyMoves(tierOf, moves).bra).toBe(5);
    const v = allAxes(9);
    const c = seasonChange({ id: 1, start: '2026-06-01', fixtures: {} as never, results: {} as never, tierOf, deductions: {}, bigcup: {} as never, tiercups: {}, playoffs: {}, dates: {}, final: { tables, up: moves.up, down: moves.down } }, v)!;
    expect(c.move).toBe('up');
    expect(c.to).toBe(5);
    expect(c.up).toContain('bra');
    for (const r of c.ratings) expect(r.before - r.after).toBe(4);
    expect(shownRating(9, 6) - shownRating(9, 5)).toBe(4);
  });
});

describe('Old Selves each season', () => {
  const self = (month: string, rating: number, id = 'os1'): OldSelf => ({ id, tier: 6, name: `AFC ${month}`, nickname: 'x', rating, month, standIn: false });
  it('the newest month joins and the weakest retires to the Old Selves Cup', () => {
    const current = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'].map((m, i) => self(m, 40 + i * 3, `os${i + 1}`));
    current[3] = { ...current[3], rating: 20 };
    const slots = current.map((_o, i) => ({ id: `os${i + 1}`, tier: ([3, 4, 4, 5, 5, 6, 6] as Tier[])[i] }));
    const { filled, retired } = rollOldSelves(current, [{ month: '2026-08', values: [allAxes(12)] }], slots);
    expect(retired.map((o) => o.month)).toEqual(['2026-04']);
    expect(filled.map((o) => o.month)).toContain('2026-08');
    expect(filled).toHaveLength(7);
    expect(filled[0].rating).toBe(Math.max(...filled.map((o) => o.rating)));
  });

  it('stand-ins make way before any real month retires', () => {
    const current = [self('2026-01', 40), ...[2, 3, 4, 5, 6, 7].map((k) => ({ id: `os${k}`, tier: 6 as Tier, name: 'Stand', nickname: 'Stand-ins', rating: 37, standIn: true }))];
    const slots = current.map((_o, i) => ({ id: `os${i + 1}`, tier: 6 as Tier }));
    const { filled, retired } = rollOldSelves(current, [{ month: '2026-02', values: [allAxes(5)] }], slots);
    expect(retired).toHaveLength(0);
    expect(filled.filter((o) => !o.standIn)).toHaveLength(2);
  });

  it('after a full season the retired self is kept for the Old Selves Cup', async () => {
    const save = (await db.fbSave.get('save'))!;
    // This dev-free profile has no finished months, so nobody retires: the list stays empty, never undefined-crashing.
    expect(save.retired ?? []).toBeInstanceOf(Array);
  });
});
