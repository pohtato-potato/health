import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { backupWords, checkBackupFile, confirmReadBack, exportData, saveBackup, restoreData } from '../src/db/backup';
import { db } from '../src/db/db';
import { recordEdit, undoEdit } from '../src/db/edits';
import { restoreAll } from '../src/db/fullBackup';
import { dailySnapshot, listSnapshots, restoreSnapshot, takeSnapshot } from '../src/db/snapshots';

const TODAY = '2026-11-05';
const put = (date: string, steps = 100) => db.days.put({ date, steps });
const settings = () => db.settings.get('app');

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.settings.put({ ...defaultSettings(), id: 'app', setupDone: true, createdAt: Date.now() });
});

describe('a backup is stamped only after a confirmed read-back', () => {
  it('a good file that was handed over is stamped', async () => {
    await put(TODAY);
    expect(await saveBackup({ share: async () => 'shared' })).toBe('shared');
    expect((await settings())?.backup.lastQuick).toBeGreaterThan(0);
  });
  it('a failed read-back throws, never reaches the share sheet, and leaves no stamp', async () => {
    const share = vi.fn(async () => 'shared' as const);
    await expect(saveBackup({ share, readBack: async () => ({ ok: false, why: 'bad' }) })).rejects.toThrow(/bad/);
    expect(share).not.toHaveBeenCalled();
    expect((await settings())?.backup.lastQuick).toBeUndefined();
  });
  it('a cancelled share leaves no stamp', async () => {
    await saveBackup({ share: async () => 'cancelled' });
    expect((await settings())?.backup.lastQuick).toBeUndefined();
  });
  it('read-back catches a cut-off file and a file with missing rows', async () => {
    await put(TODAY);
    const data = await exportData();
    const text = JSON.stringify(data);
    expect((await confirmReadBack(new File([text], 'a.json'), data)).ok).toBe(true);
    expect((await confirmReadBack(new File([text.slice(0, 40)], 'a.json'), data)).ok).toBe(false);
    const short = { ...data, tables: { ...data.tables, days: [] } };
    expect((await confirmReadBack(new File([JSON.stringify(short)], 'a.json'), data)).ok).toBe(false);
  });
});

describe('checking a file without restoring', () => {
  it('says what is in it and changes nothing', async () => {
    await put('2026-10-01');
    const text = JSON.stringify(await exportData());
    await put(TODAY);
    const r = await checkBackupFile(new File([text], 'a.json'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.summary).toMatch(/^1 day ·/);
      expect(r.newestDay).toBe('2026-10-01');
    }
    expect(await db.days.count()).toBe(2);
  });
  it('says why a bad file is bad', async () => {
    const r = await checkBackupFile(new File(['not a backup'], 'a.json'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/isn't a Health backup/);
  });
});

describe('backupWords', () => {
  const base = defaultSettings();
  it('says never in words', () => expect(backupWords(base, TODAY)).toBe('No backup yet.'));
  it('says today', () => {
    expect(backupWords({ ...base, backup: { ...base.backup, lastQuick: new Date(2026, 10, 5, 9).getTime() } }, TODAY)).toMatch(/today/i);
  });
  it('says how much is not saved', () => {
    expect(backupWords({ ...base, backup: { ...base.backup, lastQuick: new Date(2026, 10, 1, 9).getTime() } }, TODAY)).toBe('Safe up to 1 Nov. 4 days since then.');
  });
});

describe('snapshots', () => {
  it('one a day, however many times it is asked', async () => {
    await dailySnapshot(TODAY);
    await dailySnapshot(TODAY);
    expect((await listSnapshots()).filter((s) => s.kind === 'daily')).toHaveLength(1);
  });
  it('keeps seven dailies, the newest', async () => {
    for (let d = 1; d <= 9; d++) await dailySnapshot(`2026-11-0${d}`);
    const dailies = (await listSnapshots()).filter((s) => s.kind === 'daily');
    expect(dailies).toHaveLength(7);
    expect(dailies.map((s) => s.day)).not.toContain('2026-11-01');
    expect(dailies.map((s) => s.day)).toContain('2026-11-09');
  });
  it('keeps one from before a big change, apart from the dailies', async () => {
    for (let d = 1; d <= 9; d++) await dailySnapshot(`2026-11-0${d}`);
    await takeSnapshot('before', 'first');
    await takeSnapshot('before', 'second');
    const before = (await listSnapshots()).filter((s) => s.kind === 'before');
    expect(before.map((s) => s.reason)).toEqual(['second']);
    expect((await listSnapshots()).filter((s) => s.kind === 'daily')).toHaveLength(7);
  });
  it('a snapshot brings the data back, and saves what it replaced first', async () => {
    await put('2026-10-01');
    const snap = await takeSnapshot('daily', undefined, '2026-10-01');
    await put(TODAY);
    await restoreSnapshot(snap);
    expect((await db.days.toArray()).map((d) => d.date)).toEqual(['2026-10-01']);
    const before = (await listSnapshots()).find((s) => s.kind === 'before')!;
    expect(before.data).toContain(TODAY);
  });
  it('restoring a backup takes a snapshot first', async () => {
    await put(TODAY);
    const file = await exportData();
    await put('2026-11-04');
    await restoreAll({ file });
    const before = (await listSnapshots()).find((s) => s.kind === 'before')!;
    expect(before.data).toContain('2026-11-04');
    expect(await db.days.count()).toBe(1);
  });
  it('snapshots stay out of the backup file', async () => {
    await dailySnapshot(TODAY);
    expect(Object.keys((await exportData()).tables)).not.toContain('snapshots');
  });
});

describe('older files', () => {
  it('an old backup restores with new fields absent', async () => {
    await restoreData({ app: 'health', kind: 'backup', version: 1, exportedAt: 'x', tables: { days: [{ date: '2026-01-01', steps: 5 }], settings: [{ id: 'app', voice: 'zen', prefs: { largeText: true, shuffleVoices: true } }] } });
    expect(await db.days.count()).toBe(1);
    expect(await db.corrections.count()).toBe(0);
    const s = await settings();
    expect(s?.keptAsks).toBeUndefined();
    expect(s?.backup).toBeDefined();
  });
});

describe('undo', () => {
  it('undo restores an edit', async () => {
    await put(TODAY, 5);
    const before = await db.days.get(TODAY);
    await db.days.put({ date: TODAY, steps: 50 });
    const id = await recordEdit('days', TODAY, before, await db.days.get(TODAY));
    expect(await undoEdit(id)).toBe(true);
    expect((await db.days.get(TODAY))?.steps).toBe(5);
  });
});
