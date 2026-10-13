import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { saveMorningLog } from '../src/db/actions';
import { db, HealthDB, setDatabase } from '../src/db/db';
import { ACHIEVEMENTS, ACTIVE_ACHIEVEMENTS, RETIRED_ACHIEVEMENTS } from '../src/domain/achievements';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`v2m-${++n}`));
  await db.open();
});

describe('honest morning log', () => {
  it('saveMorningLog leaves weight and sleep untouched when not given', async () => {
    await db.days.put({ date: '2026-10-13', steps: 4000 });
    await saveMorningLog('2026-10-13', { place: 'p-home' }, '2026-10-12');
    const d = await db.days.get('2026-10-13');
    expect(d?.weightKg).toBeUndefined();
    expect(d?.sleep).toBeUndefined();
    expect(d?.steps).toBe(4000);
  });

  it('saveMorningLog stores carried sleep', async () => {
    await saveMorningLog('2026-10-13', { sleep: { asleep: 1420, woke: 430, carried: true } }, '2026-10-12');
    expect((await db.days.get('2026-10-13'))?.sleep).toEqual({ asleep: 1420, woke: 430, carried: true });
  });

  it('saveMorningLog sets the place, keeping the v1 home in step', async () => {
    await saveMorningLog('2026-10-13', { place: 'p-office' }, '2026-10-12');
    const d = await db.days.get('2026-10-13');
    expect(d?.place).toBe('p-office');
    expect(d?.home).toBe('p-office');
  });

  it('readiness answers saved to the day', async () => {
    await saveMorningLog('2026-10-13', { energy: 2, stomach: false, soreness: { quads: 2, 'upper-back': 1 } }, '2026-10-12');
    const d = await db.days.get('2026-10-13');
    expect(d?.energy).toBe(2);
    expect(d?.stomach).toBe(false);
    expect(d?.soreness).toEqual({ quads: 2, 'upper-back': 1 });
  });

  it('no speed record is kept', async () => {
    await saveMorningLog('2026-10-13', { weightKg: 80 }, '2026-10-12');
    const d = await db.days.get('2026-10-13');
    expect(d?.morning?.seconds).toBeUndefined();
    expect((await db.settings.get('app'))?.morningBest).toBeUndefined();
  });

  it('retired achievements are excluded from the total', () => {
    const ids = (names: string[]) => names.map((nm) => ACHIEVEMENTS.find((a) => a.name === nm)!.id);
    expect(RETIRED_ACHIEVEMENTS).toEqual(expect.arrayContaining(ids(['World record', 'Glitch in the Matrix', 'Speedrunner'])));
    expect(ACTIVE_ACHIEVEMENTS.length).toBe(223 - RETIRED_ACHIEVEMENTS.length);
    expect(ACTIVE_ACHIEVEMENTS.some((a) => RETIRED_ACHIEVEMENTS.includes(a.id))).toBe(false);
  });
});
