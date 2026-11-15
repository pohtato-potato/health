// LG-3 (ledger O38): a version-1 save (no `world` on it, or world 1) must play exactly as it did before the new
// league rules were added. This plays an invented season and a half from round, made-up logs and fingerprints every
// stored match, season, club and the save. The fingerprint was recorded on 2d3182d, before any LG-3 change; if it
// moves, something in the version-1 path changed.
//   TZ=UTC npx vitest run tests/football/world1-replay.test.ts
// Set WORLD1_PRINT=1 to print the fingerprint instead of checking it (only to re-record after a deliberate change).
import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { playDue } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';

const noon = (d: string) => new Date(`${d}T12:00:00`).getTime();
const FOUNDED = '2026-06-01';
const DAYS = 75;

/** Round, invented days: steps, sleep and protein that wave with the day number. Nobody's real data. */
async function logDays() {
  for (let i = -35; i < DAYS; i++) {
    const d = addDays(FOUNDED, i);
    await patchDay(d, {
      steps: 6000 + ((i * 1370) % 6000),
      sleep: { asleep: 1380 + ((i * 17) % 60), woke: 400 + ((i * 23) % 60) },
      ...(i % 9 === 4 ? { status: 'sick' as const } : {}),
    });
  }
}
/** The save without Fork 4's own records (congress, ballot, bonds, scenes seen), which a version-1 save now gains. */
const withoutFork4 = (save: object) => {
  const { congress: _c, ballot: _b, bonds: _o, castSeen: _s, ...rest } = save as Record<string, unknown>;
  return rest;
};
const digest = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);

describe('a version-1 save replays as before', { timeout: 300_000 }, () => {
  let print: Record<string, string> = {};
  beforeAll(async () => {
    setDatabase(new HealthDB('fb-world1-replay'));
    await db.open();
    await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
    await logDays();
    await foundClub(FOUNDED, { shirt: 'A1', crest: 'a', captain: 'Pace' });
    await playDue(noon(addDays(FOUNDED, 40)));
    await playDue(noon(addDays(FOUNDED, DAYS)));
    const matches = await db.fbMatches.orderBy('id').toArray();
    const seasons = await db.fbSeasons.toArray();
    const clubs = await db.fbClubs.orderBy('id').toArray();
    const save = (await db.fbSave.get('save'))!;
    print = {
      matches: digest(matches.map((m) => [m.id, m.comp, m.round, m.opp, m.score, m.pens, m.result])),
      events: digest(matches.map((m) => m.events)),
      seasons: digest(seasons),
      clubs: digest(clubs),
      // Fork 4 (congress and the cast) adds its own keys to the save; everything else in it must not move.
      save: digest(withoutFork4(save)),
      count: String(matches.length),
    };
    if (process.env.WORLD1_PRINT) console.log(JSON.stringify(print, null, 2));
  });

  it('plays into season 2', async () => {
    const save = (await db.fbSave.get('save'))!;
    expect(save.season).toBe(2);
    expect(save.world ?? 1).toBe(1);
  });

  it('gives the same matches, seasons, clubs and save as before LG-3', () => {
    expect(print).toEqual(RECORDED);
  });
});

const RECORDED: Record<string, string> = {
  matches: 'e0ed3fe4243fb47c',
  events: 'aae846d882e93dce',
  seasons: 'bd449d66e9bfa770',
  clubs: '45a2da2778054499',
  save: 'a46136559346e313',
  count: '67',
};
