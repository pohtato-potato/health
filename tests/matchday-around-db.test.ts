// Matchday §5–§6, Fork B: stored fields, the physio's return date, target talks and old backups. Made-up days.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { answerPhysio, getSettings, patchSettings, setPledge, setStatusRange, setTargets } from '../src/db/actions';
import { HealthDB, setDatabase, db } from '../src/db/db';
import { holdTalk } from '../src/football/store/around';
import type { FbSave } from '../src/football/store/tables';
import { targetsOn } from '../src/domain/rings';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`md-${++n}`));
  await db.open();
});

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 110, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };

describe('around the match: stored', () => {
  it('a pledge and "not tonight" are stored on the evening', async () => {
    await setPledge('2030-03-04', 90);
    expect((await db.days.get('2030-03-04'))?.pledge).toEqual({ at: 90 });
    await setPledge('2030-03-04', null);
    expect((await db.days.get('2030-03-04'))?.pledge).toEqual({ at: null });
  });

  it('two "better" days end the sick run tomorrow and stop it carrying', async () => {
    await setStatusRange('2030-03-01', '2030-03-05', 'sick');
    await patchSettings({ activeStatus: { status: 'sick', from: '2030-03-01', through: '2030-03-05' } });
    expect(await answerPhysio('2030-03-02', 'better')).toBeUndefined();
    expect(await answerPhysio('2030-03-03', 'better')).toBe('2030-03-04');
    expect((await db.days.get('2030-03-03'))?.status).toBe('sick');
    expect((await db.days.get('2030-03-04'))?.status).toBeUndefined();
    expect((await db.days.get('2030-03-05'))?.status).toBeUndefined();
    expect((await getSettings()).activeStatus).toBeUndefined();
  });

  it('signing a target talk raises the target from today and records it; hold changes nothing', async () => {
    await setTargets(T, '2030-01-01');
    await db.fbSave.put({ id: 'save', season: 2, phase: 'season', day: 2 } as FbSave);
    await holdTalk({ habit: 'steps', current: 10000, ask: 12000, days: 30 }, 'sign', '2030-03-04');
    expect(targetsOn((await getSettings()).targets, '2030-03-04')?.steps).toBe(12000);
    expect(targetsOn((await getSettings()).targets, '2030-03-03')?.steps).toBe(10000);
    await holdTalk({ habit: 'protein', current: 110, ask: 125, days: 30 }, 'hold', '2030-03-04');
    expect(targetsOn((await getSettings()).targets, '2030-03-04')?.proteinG).toBe(110);
    const talks = (await db.fbSave.get('save'))?.around?.talks ?? [];
    expect(talks.map((t) => [t.habit, t.pick, t.to])).toEqual([['steps', 'sign', 12000], ['protein', 'hold', 110]]);
  });
});
