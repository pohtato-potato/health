// Cup runs, layer 2: the try match's store and screens. Made-up targets, no one's data.
import 'fake-indexeddb/auto';
import '../helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../../src/db/actions';
import { HealthDB, TABLES, db, setDatabase } from '../../../src/db/db';
import { endSpell } from '../../../src/football/cup/match';
import { dealToday, endRun, loadRun, saveMatch, startTry } from '../../../src/football/cup/store';
import { OWN } from '../../../src/football/store/season';
import { foundClub } from '../../../src/football/store/save';
import { DealView } from '../../../src/screens/football/cup/CupScreens';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-cup-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-01', { shirt: 'A1', crest: 'a' });
});

describe('the try match', () => {
  it('lives in its own table, which backups include', () => {
    expect(TABLES).toContain('cupRuns');
  });
  it('deals today\'s deck: an empty week is the first week, so basic cards, no punts', async () => {
    const d = await dealToday('2026-11-08');
    expect(d.cards).toHaveLength(12 + 3);
    expect(d.rows.every((r) => r.level === 'basic')).toBe(true);
    expect(d.extras.filter((e) => e.kind === 'empty')).toHaveLength(3);
  });
  it('kicks off against a club from Brabo\'s division, and saves after every card', async () => {
    const run = await startTry(new Date('2026-11-08T12:00:00').getTime());
    const save = await db.fbSave.get('save');
    const season = await db.fbSeasons.get(save!.season);
    expect(run.match.club.tier).toBe(season!.tierOf[OWN]);
    expect(run.match.club.id).not.toBe(OWN);
    const next = endSpell(run.match);
    await saveMatch(next);
    const back = await loadRun();
    expect(back!.match.spell).toBe(2);
    expect(back!.match).toEqual(next);
    await endRun();
    expect(await loadRun()).toBeUndefined();
  });
  it('never touches the league', async () => {
    const before = JSON.stringify(await db.fbSave.get('save'));
    const matches = await db.fbMatches.count();
    await startTry(new Date('2026-11-08T12:00:00').getTime());
    expect(JSON.stringify(await db.fbSave.get('save'))).toBe(before);
    expect(await db.fbMatches.count()).toBe(matches);
  });
  it('"How your deck was dealt" lists each axis and each extra', async () => {
    const d = await dealToday('2026-11-08');
    const out = html(<DealView deal={d} title="How your deck was dealt" />);
    for (const a of ['Pace', 'Power', 'Fuel', 'Rest', 'Routine', 'Shape']) expect(out).toContain(`>${a}<`);
    expect(out.match(/class="cup-dr extra"/g)).toHaveLength(3);
  });
});
