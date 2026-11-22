import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDay, patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays, atOn } from '../../src/domain/dates';
import { daysOf } from '../../src/football/calendar';
import { finishWithAssistant, pausedMatch } from '../../src/football/store/play';
import { OWN } from '../../src/football/store/season';
import { foundClub } from '../../src/football/store/save';
import { worldOf } from '../../src/football/pyramid/shape';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 };
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-hold-cont-${++n}`));
  await db.open();
  await setTargets(T, '2026-01-01');
  for (let i = 0; i < 20; i++) await patchDay(addDays('2026-10-01', i), { steps: 9000 + i * 100, sleep: { asleep: 1380, woke: 420 } });
  await foundClub('2026-10-10', { shirt: 'H1', crest: 'a' });
});
const noon = (d: string) => atOn(d, 12 * 60);

describe('a league match on a continental night', () => {
  it('waits to be watched when Brabo is not in the Continental Cup', async () => {
    const season = (await db.fbSeasons.toArray())[0];
    expect(season.continental?.field.includes(OWN) ?? false).toBe(false);
    const plans = daysOf(worldOf(season));
    const contDay = plans.find((p) => p.kind === 'league' && p.cont)!.day;
    // Close each day up to the continental night, skipping the matches that wait on the way.
    for (let d = 1; d <= contDay; d++) {
      const date = addDays('2026-10-10', d - 1);
      if (await pausedMatch()) await finishWithAssistant();
      await closeDay(date, true, noon(addDays(date, 1)));
    }
    const p = await pausedMatch();
    expect(p?.date).toBe(addDays('2026-10-10', contDay - 1));
    expect(p?.prep.comp).toBe('league');
  });
});
