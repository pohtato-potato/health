import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { membersOf, type Club } from '../../src/football/store/club';
import { kickOff } from '../../src/football/store/play';
import { equipAbility, foundClub } from '../../src/football/store/save';
import { shownRating } from '../../src/football/ratings';
import { awakeningsAfter, equip, HABITS } from '../../src/football/squad';
import { allAxes } from '../../src/football/types';
import { PlayerView } from '../../src/screens/football/club/Player';
import { SquadView } from '../../src/screens/football/club/Squad';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-squad-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-01', { shirt: 'H1', crest: 'a', captain: 'Pace' });
  await kickOff('2026-11-05');
});

async function club(knock?: 'knock'): Promise<Club> {
  const save = (await db.fbSave.get('save'))!;
  const matches = await db.fbMatches.toArray();
  return { save, tier: 6, members: membersOf(save, matches, 6, '2026-11-06', knock), bench: [], matches };
}

describe('The squad', () => {
  it('renders six members, each labelled with its habit and its axis', async () => {
    const out = html(<SquadView c={await club()} />);
    expect(out.match(/class="fb-member /g)).toHaveLength(6);
    for (const h of HABITS) expect(out).toContain(`aria-label="${h.label}, ${h.axis},`);
    expect(out).toContain('captain');
  });

  it('a knock is a dashed ring plus the word "knock"', async () => {
    const out = html(<SquadView c={await club('knock')} />);
    expect(out).toMatch(/class="fb-member [^"]*knock"/);
    expect(out).toContain('Rest · knock');
  });

  it('the player shows the division rating and the real value', async () => {
    const c = await club();
    const m = c.members.find((x) => x.axis === 'Pace')!;
    expect(m.real).toBeGreaterThan(0);
    const out = html(<PlayerView m={m} tierName="Division Six" />);
    expect(out).toContain(`>${shownRating(m.real, 6)}<`);
    expect(out).toContain('The real value');
    expect(out).toContain(`>${m.real}<`);
    expect(out).not.toMatch(/legend/i);
  });
});

describe('Abilities', () => {
  it('a fourth ability cannot be equipped', async () => {
    const three = ['armband', 'second-wind', 'stack'];
    const owned = [...three, 'youth-sub'];
    expect(equip(three, 'youth-sub', 3, owned)).toEqual(three);
    expect(equip(three, 'youth-sub', 1, owned)).toEqual(['armband', 'youth-sub', 'stack']);
    expect(equip(three, 'not-owned', 0, owned)).toEqual(three);
    await equipAbility('youth-sub', 3);
    expect((await db.fbSave.get('save'))!.slots).toEqual(three);
    await equipAbility('youth-sub', 2);
    expect((await db.fbSave.get('save'))!.slots).toEqual(['armband', 'second-wind', 'youth-sub']);
  });
});

describe('Awakening', () => {
  it('is stored once per band per axis', () => {
    const lo = allAxes(10), hi = { ...allAxes(10), Pace: 11.2 };
    const first = awakeningsAfter({}, lo, hi, '2026-11-06');
    expect(first.fresh).toEqual([{ axis: 'Pace', band: 11, date: '2026-11-06' }]);
    expect(first.done.Pace).toEqual([11]);
    const again = awakeningsAfter(first.done, lo, hi, addDays('2026-11-06', 9));
    expect(again.fresh).toHaveLength(0);
    expect(again.done.Pace).toEqual([11]);
  });
});
