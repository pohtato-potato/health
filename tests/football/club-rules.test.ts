import { describe, expect, it } from 'vitest';
import { contractCheck, intake, weightAfterRenew, youthBonus, youthStatus } from '../../src/football/contracts';
import { YOUTH_POOL } from '../../src/football/data/load';
import { cards, physio, rotationShape, usesRotation } from '../../src/football/discipline';
import { dodgyCollapse, incomeFor, offers, prize } from '../../src/football/money';
import { fillSlots, oldSelfFrom } from '../../src/football/oldSelves';
import { addRival, ANTIGOON, fades, RIVAL_MODS, rivalBorn, rivalTwist, type Meeting, type Rival } from '../../src/football/rivals';
import { rng } from '../../src/football/rng';
import { armbandHarmony, awakens, HABITS } from '../../src/football/squad';
import { allAxes, AXES } from '../../src/football/types';
import { applyChanges, worldTurn } from '../../src/football/world';
import { CLUBS } from '../../src/football/data/load';

describe('squad', () => {
  it('has six habits on six axes', () => { expect(new Set(HABITS.map((h) => h.axis)).size).toBe(6); });
  it('Harmony needs four different captains, and a repeat restarts the count', () => {
    expect(armbandHarmony(['Pace', 'Power', 'Fuel', 'Rest'])).toBe(true);
    expect(armbandHarmony(['Pace', 'Power', 'Power', 'Fuel', 'Rest'])).toBe(false);
    expect(armbandHarmony(['Pace', 'Power', 'Power', 'Fuel', 'Rest', 'Shape'])).toBe(true);
  });
  it('awakens once per band', () => {
    expect(awakens(10.5, 11.2, [])).toBe(11);
    expect(awakens(10.5, 11.2, [11])).toBeNull();
    expect(awakens(15, 18, [])).toBe(16);
  });
});
describe('physio and cards', () => {
  const days = (miss: string[]) => ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map((date) => ({ date, allTaken: !miss.includes(date) }));
  it('one missed day is a knock', () => {
    expect(physio(days(['2026-11-05']), '2026-11-06', false)).toEqual({ state: 'knock', mods: [{ axis: 'Rest', d: -2, why: 'Knock', kind: 'knock' }] });
  });
  it('two in a row are an injury for two matches; the physio room needs three', () => {
    const d = days(['2026-11-04', '2026-11-05']);
    expect(physio(d, '2026-11-06', false).mods[0].d).toBe(-4);
    expect(physio(days(['2026-11-03', '2026-11-04']), '2026-11-06', false).state).toBe('injury');
    expect(physio(d, '2026-11-06', true).state).toBe('knock');
    expect(physio(days(['2026-11-03', '2026-11-04', '2026-11-05']), '2026-11-06', true).state).toBe('injury');
  });
  it('two nights out within 14 days make a red', () => {
    expect(cards(['2026-11-01', '2026-11-10'], '2026-11-11')).toEqual({ yellow: true, red: true });
    expect(cards(['2026-11-01', '2026-11-16'], '2026-11-17')).toEqual({ yellow: true, red: false });
  });
  it('the rotation shape is the median minus 2', () => {
    expect(rotationShape([allAxes(10), allAxes(14), allAxes(12)])).toEqual(allAxes(10));
    expect(usesRotation('sick')).toBe(true);
    expect(usesRotation('travelling')).toBe(false);
  });
});
describe('contracts and youth', () => {
  it('5 of 7 renews, 4 of 7 runs down; six renewals cap at 1.15', () => {
    expect(contractCheck(20, 28)).toBe('renew');
    expect(contractCheck(16, 28)).toBe('run-down');
    let w = 1; for (let i = 0; i < 6; i++) w = weightAfterRenew(w);
    expect(w).toBe(1.15);
  });
  it('youngsters: 12 logged days promote, under 4 at season end leave', () => {
    expect(youthStatus(12, false)).toBe('promoted');
    expect(youthStatus(3, true)).toBe('leaves');
    expect(youthStatus(3, false)).toBe('growing');
    expect([youthBonus(3), youthBonus(4), youthBonus(5)]).toEqual([1, 1.5, 2]);
  });
  it('intake brings three, at most one exercise', () => {
    const pool = [...YOUTH_POOL, { name: 'Ex A', age: 17, axis: 'Shape' as const, potential: 4 as const, what: 'x', kind: 'exercise' as const }, { name: 'Ex B', age: 17, axis: 'Shape' as const, potential: 4 as const, what: 'x', kind: 'exercise' as const }];
    for (let s = 0; s < 30; s++) {
      const got = intake(pool, rng(s), true);
      expect(got).toHaveLength(3);
      expect(got.filter((y) => y.kind === 'exercise').length).toBeLessThanOrEqual(1);
      expect(intake(pool, rng(s), false).some((y) => y.kind === 'exercise')).toBe(false);
    }
  });
});
describe('rivals', () => {
  const m = (result: 'W' | 'L', over: Partial<Meeting> = {}): Meeting => ({ clubId: 'hul', result, comp: 'league', ...over });
  it('has at least six modifiers, each from a way to start', () => {
    expect(RIVAL_MODS.length).toBeGreaterThanOrEqual(6);
    expect(rivalTwist('ant', 'legend').name).toBe("Giant's hand");
    expect(rivalTwist('hul', 'cup').name).toBe('Bad blood');
    expect(rivalTwist('hul', 'three').name).toBe('In step');
    expect(rivalTwist('hul', 'fouram').name).toBe('Night shift');
  });
  it('is born from a big night, three running, or 4 am', () => {
    expect(rivalBorn([], m('L', { comp: 'bigcup' }))).toBe('cup');
    expect(rivalBorn([m('L'), m('L')], m('L'))).toBe('three');
    expect(rivalBorn([], m('L', { auto: true }))).toBe('fouram');
    expect(rivalBorn([], m('L'))).toBeNull();
  });
  it('caps earned rivals at three, and five wins fade one', () => {
    let rs: Rival[] = [{ clubId: ANTIGOON, how: 'legend', since: '' }];
    for (const id of ['a', 'b', 'c', 'd']) rs = addRival(rs, { clubId: id, how: 'cup', since: '' });
    expect(rs.map((r) => r.clubId)).toEqual([ANTIGOON, 'a', 'b', 'c']);
    expect(fades(Array(5).fill(m('W')), 'hul')).toBe(true);
    expect(fades(Array(5).fill(m('W', { clubId: ANTIGOON })), ANTIGOON)).toBe(false);
  });
  it('Night shift only bites at 4 am', () => {
    const t = rivalTwist('hul', 'fouram');
    expect(t.mods(50, 'def', true)).toHaveLength(1);
    expect(t.mods(50, 'def', false)).toHaveLength(0);
  });
});
describe('Old Selves', () => {
  it('a month of 18s lands high', () => {
    const o = oldSelfFrom({ month: '2026-10', values: Array(30).fill(allAxes(18)) }, { id: 'os1', tier: 3 });
    expect(o.name).toBe('AFC October 2026');
    expect(o.rating).toBeGreaterThanOrEqual(70);
  });
  it('with no months, seven stand-ins', () => {
    const s = fillSlots([]);
    expect(s).toHaveLength(7);
    expect(s.every((x) => x.standIn)).toBe(true);
  });
  it('the strongest month takes the highest slot', () => {
    const s = fillSlots([{ month: '2026-09', values: [allAxes(8)] }, { month: '2026-10', values: [allAxes(16)] }]);
    expect(s[0].month).toBe('2026-10');
    expect(s[1].month).toBe('2026-09');
    expect(s[2].standIn).toBe(true);
  });
});
describe('the world and money', () => {
  const clubs = CLUBS.map((c) => ({ id: c.id, name: c.name, rating: c.rating ?? 50, tier: c.tier, kind: c.kind, abilities: c.known.map((a) => a.name) }));
  it('moves ratings, never Brabo or Old Selves, and keeps them in range', () => {
    const t = worldTurn(clubs, rng(3));
    expect(t.changes.some((c) => c.id === 'bra' || /^os\d$/.test(c.id))).toBe(false);
    expect(t.headlines.length).toBeGreaterThan(3);
    for (const c of applyChanges(clubs, t.changes)) { expect(c.rating).toBeGreaterThanOrEqual(25); expect(c.rating).toBeLessThanOrEqual(98); }
  });
  it('pays more higher up, and offers 2–3 sponsors with the risk', () => {
    expect(incomeFor(1, 1, false, 0)).toBeGreaterThan(incomeFor(6, 1, true, 0));
    expect(prize(6, 1, true)).toBeCloseTo(0.06);
    const o = offers('shirt', 6, rng(1));
    expect(o.length).toBeGreaterThanOrEqual(2);
    for (const x of o) expect(['stable', 'flashy', 'dodgy']).toContain(x.risk);
    expect(o.some((x) => x.real)).toBe(false);
  });
  it('dodgy sponsors collapse about one season in four', () => {
    const r = rng(8); let n = 0; for (let i = 0; i < 4000; i++) if (dodgyCollapse(r)) n++;
    expect(n / 4000).toBeGreaterThan(0.22); expect(n / 4000).toBeLessThan(0.28);
  });
  it('axes list is intact', () => { expect(AXES).toHaveLength(6); });
});
