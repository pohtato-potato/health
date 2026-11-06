import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { CONT } from '../../src/football/continental';
import { clubById } from '../../src/football/data/load';
import { summarise } from '../../src/football/seasonStory';
import { crownSwap } from '../../src/football/store/dev';
import { kickOff } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { contTonight } from '../../src/football/store/tonight';
import { Calendar } from '../../src/screens/football/league/Calendar';
import { ContinentalView } from '../../src/screens/football/league/Cups';

const START = '2026-06-01';
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-cont-ui-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub(START, { shirt: 'H1', crest: 'a' });
  const s = (await db.fbSave.get('save'))!;
  const out = crownSwap((await db.fbSeasons.get(s.season))!, await db.fbClubs.toArray(), 'bay');
  await db.fbSeasons.put(out.season);
  await db.fbClubs.bulkPut(out.clubs);
});

describe('continental screens', () => {
  it('the card lists the eight nights, then the phase table with Brabo marked in words', async () => {
    for (let i = 0; i < CONT.phase[0]; i++) await kickOff(addDays(START, i));
    const season = (await db.fbSeasons.get(1))!;
    const out = html(<ContinentalView c={season.continental!} tierOf={season.tierOf} />);
    expect(out).toContain('The Continental Cup');
    expect(out).toContain('League phase, 1 of 8 played');
    expect(out.match(/Night \d · day/g)).toHaveLength(8);
    expect(out).toContain('League phase table · top 8 go through');
    expect(out).toContain('>You<');
  });

  it('Tonight names the continental opponent on a double-header night; the calendar marks those nights by shape and word', async () => {
    const save = (await db.fbSave.get('save'))!;
    const season = (await db.fbSeasons.get(1))!;
    const line = contTonight({ ...save, day: CONT.phase[0] }, season, (id) => clubById(id).name);
    expect(line).toMatch(/^Also tonight: The Continental Cup, league phase 1 of 8, (home to|away at) .+\.$/);
    const cal = html(<Calendar season={1} today={1} matches={[]} cont />);
    expect(cal.match(/fb-res [^"]* ct"/g)).toHaveLength(11);
    expect(cal).toContain('Continental night (two matches)');
    expect(cal).toContain('Day 2, League and the Continental Cup');
  });

  it('the season summary carries the continental run', async () => {
    for (let i = 0; i < CONT.phase[1]; i++) await kickOff(addDays(START, i));
    const s = (await db.fbSeasons.get(1))!;
    const sum = summarise(s, await db.fbMatches.toArray(), [s]);
    expect(sum.cups[0]).toBe('The Continental Cup: league phase, 2 of 8 played');
  });
});
