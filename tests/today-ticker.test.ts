import 'fake-indexeddb/auto';
import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSettings, patchSettings } from '../src/db/actions';
import { exportData, parseBackup, restoreData } from '../src/db/backup';
import { HealthDB, setDatabase, db } from '../src/db/db';
import { ACTIVE_ACHIEVEMENTS, RETIRED_ACHIEVEMENTS } from '../src/domain/achievements';
import { prefOn } from '../src/domain/types';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`ticker-${++n}`));
  await db.open();
});

describe('the ticker is gone', () => {
  it('its component and headlines are removed', () => {
    expect(existsSync(new URL('../src/ui/Ticker.tsx', import.meta.url))).toBe(false);
    expect(existsSync(new URL('../src/domain/headlines.ts', import.meta.url))).toBe(false);
  });

  it('the two ticker achievements are retired, so old unlocks still resolve but nothing asks for them', () => {
    expect(RETIRED_ACHIEVEMENTS).toEqual(expect.arrayContaining(['clickbait', 'rickrolled']));
    expect(ACTIVE_ACHIEVEMENTS.some((a) => a.id === 'clickbait' || a.id === 'rickrolled')).toBe(false);
  });

  it('an old backup with the ticker switched on still imports', async () => {
    await patchSettings((s) => ({ name: 'Test', setupDone: true, prefs: { ...s.prefs, shake: false } }));
    const file = await exportData();
    const s = file.tables.settings![0] as { prefs: Record<string, unknown> };
    s.prefs = { ...s.prefs, ticker: true, someFuturePref: 1 };
    setDatabase(new HealthDB(`ticker-${++n}`));
    await restoreData(parseBackup(JSON.stringify(file)));
    const back = await getSettings();
    expect(back.name).toBe('Test');
    expect(prefOn(back.prefs, 'shake')).toBe(false);
  });
});
