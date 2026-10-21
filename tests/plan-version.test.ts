import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { HealthDB, setDatabase, db } from '../src/db/db';
import { startSession } from '../src/db/actions';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`pv-${++n}`));
  await db.open();
});

it('a session remembers the plan version it was done under', async () => {
  const s = await startSession({ session: 'A', planName: 'P', planVersion: '1.2', exercises: ['curl'], short: false, swaps: [], tempo: {} });
  expect((await db.sessions.get(s.id))?.planVersion).toBe('1.2');
});
