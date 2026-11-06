import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { PACE_PTS } from '../../src/football/axes';
import { paceNext, weekRecap } from '../../src/football/habitLines';
import { kickOff } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import type { StoredMatch } from '../../src/football/store/tables';
import { HabitLineView, habitLineFor, leagueLineFor, weekLineFor } from '../../src/screens/football/HabitLine';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-lines-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
});

describe('the football lines on other tabs', () => {
  it('with no save, none of the lines render', async () => {
    expect(await habitLineFor('Power', '2026-10-20')).toBeNull();
    expect(await habitLineFor('Pace', '2026-10-20')).toBeNull();
    expect(await leagueLineFor()).toBeNull();
    expect(await weekLineFor('2026-10-19')).toBeNull();
  });

  it('the Walk line shows the step count needed for the next value from PACE_PTS', async () => {
    // 7000 steps sits halfway from 6000 (8) to 8000 (10): 9 now, 10 at 7500.
    expect(PACE_PTS).toContainEqual([6000, 8]);
    expect(paceNext(7000)).toEqual({ more: 500, to: 10 });
    expect(paceNext(20000)).toBeNull();
    for (let i = 0; i < 12; i++) await patchDay(addDays('2026-10-01', i), { steps: 9000 });
    await patchDay('2026-10-13', { steps: 7000 });
    await foundClub('2026-10-10', { shirt: 'H1', crest: 'a' });
    await kickOff('2026-10-10');
    const d = await habitLineFor('Pace', '2026-10-13');
    expect(d?.text).toMatch(/^Pace \d+ → 9 for tonight$/);
    expect(d?.sub).toBe('500 more steps makes it 10');
    const out = html(<HabitLineView {...d!} />);
    expect(out).toContain('Football');
    expect(out).toContain('500 more steps makes it 10');
  });

  it('the recap line reads the week from fixture matches', () => {
    const m = (result: 'W' | 'D' | 'L') => ({ result }) as StoredMatch;
    const week = [m('W'), m('W'), m('D'), m('L'), m('W'), m('D'), m('L')];
    expect(weekRecap(week, 6, 4)).toBe('This week: 3 won, 2 drawn, 2 lost. Up to 4th.');
    expect(weekRecap(week, 2, 3)).toBe('This week: 3 won, 2 drawn, 2 lost. Down to 3rd.');
    expect(weekRecap(week, 11, 11)).toBe('This week: 3 won, 2 drawn, 2 lost. Still 11th.');
    expect(weekRecap(week)).toBe('This week: 3 won, 2 drawn, 2 lost.');
  });

  it('the You line names the league position once the club exists', async () => {
    await foundClub('2026-10-10', { shirt: 'H1', crest: 'a' });
    expect((await leagueLineFor())?.text).toMatch(/^Brabo United, \d+(st|nd|rd|th) in /);
  });
});
