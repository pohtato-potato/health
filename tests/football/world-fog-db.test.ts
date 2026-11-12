// The world in fog through the store (desk spec §4, Fork 2): the current save's migration (12.8 a), meeting a club,
// a scout's trip from the desk to the morning parcel, and cup-run intentions. Made-up days.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays, atOn } from '../../src/domain/dates';
import { runCtx } from '../../src/football/cup/store';
import { clockFilled } from '../../src/football/desk/rules';
import { knownPct } from '../../src/football/fog/fog';
import { loadParcel } from '../../src/football/store/around';
import { deskOf, loadDesk, spendAt } from '../../src/football/store/desk';
import { morningReports } from '../../src/football/store/fog';
import { loadTonight } from '../../src/football/store/hooks';
import { scoutLevel } from '../../src/football/store/paused';
import { migrateSave, playDue } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { OWN } from '../../src/football/store/season';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 };
const noon = (d: string) => atOn(d, 12 * 60);
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-fog-${++n}`));
  await db.open();
  await setTargets(T, '2026-01-01');
  for (let i = 0; i < 25; i++) await patchDay(addDays('2026-10-01', i), { steps: 9000 + i * 100, sleep: { asleep: 1380, woke: 420 } });
  await foundClub('2026-10-10', { shirt: 'H1', crest: 'a' });
  await playDue(noon('2026-10-11'));
});

describe('the fog through the store', () => {
  it('a new club starts in fog; the club it met reads style only on the tactics board', async () => {
    expect((await db.fbSave.get('save'))!.fog).toEqual({ since: '2026-10-10', old: [] });
    // A match waits for Watch or Skip; the next 4 am finishes it, and the club is met.
    await playDue(noon('2026-10-13'));
    const save = (await db.fbSave.get('save'))!;
    const met = save.met.find((id) => id !== OWN && !id.startsWith('nat:'))!;
    expect(met).toBeTruthy();
    expect(scoutLevel(save, met, '2026-10-13')).toBe('style');
    expect(knownPct(save, met, '2026-10-13')).toBe(60);
  });

  it('on the current save, clubs already met stay known and everything else goes into fog (12.8 a)', async () => {
    const s = (await db.fbSave.get('save'))!;
    const season = (await db.fbSeasons.get(s.season))!;
    const others = Object.keys(season.tierOf).filter((id) => id !== OWN && !s.met.includes(id));
    // A save from before the fog: no stamp, and a club met earlier.
    const { fog: _gone, ...old } = { ...s, met: [...s.met, others[0]] };
    await db.fbSave.put(old);
    expect(await migrateSave()).toBe(true);
    const after = (await db.fbSave.get('save'))!;
    expect(after.fog?.old).toEqual(old.met);
    expect(scoutLevel(after, others[0])).toBe('full');
    expect(knownPct(after, others[0])).toBe(90);
    expect(knownPct(after, others[1])).toBe(20);
    expect(await migrateSave()).toBe(false);
  });

  it('a scout sent at the desk comes back in the next morning’s parcel, and the fog lifts then', async () => {
    const { m } = { m: await loadDesk((await loadTonight('2026-10-11'))!) };
    const target = m.view.world!.clubs.find((c) => c.tier === m.view.world!.ownTier && !c.facts.length)!.id;
    expect(m.view.world!.clubs.length).toBeGreaterThan(100);
    // Spend dice on the club until its clock of 2 is full (a 5 or 6 fills it alone).
    for (const d of m.dice) {
      const desk = deskOf((await db.fbSave.get('save'))!);
      const c = desk.clocks.find((x) => x.target === target);
      if (c && clockFilled(desk, c) >= c.size) break;
      expect(await spendAt(m.date, d, 'scout', target)).toBeUndefined();
    }
    const save = (await db.fbSave.get('save'))!;
    const c = deskOf(save).clocks.find((x) => x.target === target)!;
    expect(clockFilled(deskOf(save), c)).toBe(2);
    // Not yet: the report is on its way.
    expect(knownPct(save, target, '2026-10-11')).toBe(20);
    expect(knownPct(save, target, '2026-10-12')).toBeGreaterThanOrEqual(50);
    await playDue(noon('2026-10-12'));
    const t = (await loadTonight('2026-10-12'))!;
    const { reports } = morningReports(t.save, '2026-10-12');
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ club: target, before: 20 });
    expect(reports[0].after).toBeGreaterThanOrEqual(50);
    const p = await loadParcel(t);
    expect(p.tiles).toContain('scout');
    expect(p.scouts.reports).toHaveLength(1);
    // Cup runs read "scouted" too: style and weak side known (unless a thin report left the weak side out).
    const ctx = await runCtx();
    expect(ctx.scouted.includes(target)).toBe(reports[0].found.includes('weak'));
  });
});
