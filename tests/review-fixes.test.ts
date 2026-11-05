import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings, patchDay } from '../src/db/actions';
import { checkBackup, exportData } from '../src/db/backup';
import { applyFix } from '../src/db/checkup';
import { db } from '../src/db/db';
import { recordEdit, undoEdit } from '../src/db/edits';
import { checkFullBackupFile, confirmFullReadBack, restoreAll } from '../src/db/fullBackup';
import { dataCheckup } from '../src/domain/checkup';
import { dueItems } from '../src/domain/dueLines';
import { posterLine } from '../src/domain/film';
import { assessment } from '../src/domain/monthReport';
import { trendRows } from '../src/domain/momentum';
import { headlineFor } from '../src/domain/trackRules';
import { storyChapters } from '../src/domain/weeklyStory';
import { zip } from '../src/export/xlsx';
import type { Day } from '../src/domain/types';

const TODAY = '2026-11-05';
const enc = (o: unknown) => new TextEncoder().encode(JSON.stringify(o));

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.settings.put({ ...defaultSettings(), id: 'app', setupDone: true, createdAt: Date.now() });
});

describe('undo touches only what that edit changed', () => {
  it('undoing the edit that created a day keeps what was logged later', async () => {
    await db.days.put({ date: TODAY, weightKg: 70 });
    const id = await recordEdit('days', TODAY, undefined, { date: TODAY, weightKg: 70 });
    await patchDay(TODAY, { steps: 8000, note: 'keep' });
    expect(await undoEdit(id)).toBe(true);
    const d = await db.days.get(TODAY);
    expect(d?.weightKg).toBeUndefined();
    expect(d?.steps).toBe(8000);
    expect(d?.note).toBe('keep');
  });
  it('undoing the only edit on a day removes the now-empty day', async () => {
    await db.days.put({ date: TODAY, weightKg: 70 });
    const id = await recordEdit('days', TODAY, undefined, { date: TODAY, weightKg: 70 });
    await undoEdit(id);
    expect(await db.days.get(TODAY)).toBeUndefined();
  });
  it('a later change to the same field wins, and undo says nothing was restored', async () => {
    await db.days.put({ date: TODAY, steps: 1 });
    const before = await db.days.get(TODAY);
    await db.days.put({ date: TODAY, steps: 2 });
    const id = await recordEdit('days', TODAY, before, { date: TODAY, steps: 2 });
    await patchDay(TODAY, { steps: 8000 });
    expect(await undoEdit(id)).toBe(false);
    expect((await db.days.get(TODAY))?.steps).toBe(8000);
  });
  it('another field changed since is left alone', async () => {
    await db.days.put({ date: TODAY, steps: 1 });
    const before = await db.days.get(TODAY);
    await db.days.put({ date: TODAY, steps: 2 });
    const id = await recordEdit('days', TODAY, before, { date: TODAY, steps: 2 });
    await patchDay(TODAY, { note: 'later' });
    await undoEdit(id);
    expect(await db.days.get(TODAY)).toMatchObject({ steps: 1, note: 'later' });
  });
  it('check-up fixes can be undone in any order', async () => {
    const list: Day[] = [...Array.from({ length: 10 }, (_, i) => ({ date: `2026-10-${String(i + 10).padStart(2, '0')}`, steps: 5000, weightKg: 70 })), { date: '2026-10-20', steps: 90000, weightKg: 90 }];
    await db.days.bulkPut(list);
    const found = dataCheckup({ today: TODAY, settings: defaultSettings(), days: list, entries: [], sessions: [] });
    const [a, b] = [await applyFix(found.find((f) => f.kind === 'weight-off')!), await applyFix(found.find((f) => f.kind === 'steps-high')!)];
    await undoEdit(a!);
    expect(await db.days.get('2026-10-20')).toMatchObject({ weightKg: 90 });
    expect((await db.days.get('2026-10-20'))?.steps).toBeUndefined();
    await undoEdit(b!);
    expect(await db.days.get('2026-10-20')).toMatchObject({ weightKg: 90, steps: 90000 });
  });
});

const backup = (media?: unknown) => ({ app: 'health', kind: 'backup', version: 1, exportedAt: 'x', tables: { days: [{ date: TODAY, steps: 1 }] }, media });
const photo = { id: 'p', file: 'photos/p.jpg' };

describe('the full backup reads back in full', () => {
  it('passes when tables and every media file match', async () => {
    const f = new File([zip([{ name: 'backup.json', data: enc(backup({ photos: [photo], clips: [] })) }, { name: 'photos/p.jpg', data: new Uint8Array([1, 2, 3]) }]) as BlobPart], 'a.zip');
    const r = await confirmFullReadBack(f, { data: backup() as never, media: new Map([['photos/p.jpg', 3]]) });
    expect(r.ok).toBe(true);
  });
  it('fails when a photo is missing or the wrong size', async () => {
    const missing = new File([zip([{ name: 'backup.json', data: enc(backup({ photos: [photo], clips: [] })) }]) as BlobPart], 'a.zip');
    expect((await confirmFullReadBack(missing, { data: backup() as never, media: new Map([['photos/p.jpg', 3]]) })).ok).toBe(false);
    const short = new File([zip([{ name: 'backup.json', data: enc(backup({ photos: [photo], clips: [] })) }, { name: 'photos/p.jpg', data: new Uint8Array([1]) }]) as BlobPart], 'a.zip');
    expect((await confirmFullReadBack(short, { data: backup() as never, media: new Map([['photos/p.jpg', 3]]) })).ok).toBe(false);
  });
  it('fails when a table came back short', async () => {
    const f = new File([zip([{ name: 'backup.json', data: enc({ ...backup({ photos: [], clips: [] }), tables: { days: [] } }) }]) as BlobPart], 'a.zip');
    expect((await confirmFullReadBack(f, { data: backup() as never, media: new Map() })).ok).toBe(false);
  });
  it('checking a zip with a missing photo says so', async () => {
    const f = new File([zip([{ name: 'backup.json', data: enc(backup({ photos: [photo], clips: [] })) }]) as BlobPart], 'a.zip');
    const r = await checkFullBackupFile(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/1 photo or clip is missing/);
  });
  it('an empty file is not called good', () => {
    const r = checkBackup({ app: 'health', kind: 'backup', version: 1, exportedAt: 'x', tables: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/nothing in it/);
  });
  it('restore refuses before clearing anything when media is missing', async () => {
    await db.days.put({ date: '2026-01-01', steps: 5 });
    const file = await exportData();
    const b = { file: { ...file, tables: { ...file.tables, days: [] } }, media: { photos: [{ ...photo }] as never, clips: [], blobs: new Map() } };
    await expect(restoreAll(b)).rejects.toThrow(/nothing was changed/i);
    expect(await db.days.count()).toBe(1);
  });
  it('restore stops with a plain message if the safety copy fails', async () => {
    await db.days.put({ date: '2026-01-01', steps: 5 });
    const file = await exportData();
    const spy = vi.spyOn(db.snapshots, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'));
    await expect(restoreAll({ file: { ...file, tables: {} } })).rejects.toThrow(/nothing was changed/i);
    spy.mockRestore();
    expect(await db.days.count()).toBe(1);
  });
});

describe('the double-dose fix', () => {
  const med = { id: 'm', name: 'Pill', slots: ['a', 'b'], active: true, med: { stock: { left: 8, perDose: 1 } } };
  it('gives the dose back to the stock and clears its late mark', async () => {
    const s = { ...defaultSettings(), id: 'app' as const, setupDone: true, checklist: [med as never] };
    await db.settings.put(s);
    const day: Day = { date: '2026-11-01', ticks: { 'm:0': 1000, 'm:1': 2000 }, ticksLate: { 'm:1': 2000 } };
    await db.days.put(day);
    const f = dataCheckup({ today: TODAY, settings: s, days: [day], entries: [], sessions: [] })[0];
    expect(f.text).toMatch(/two doses/i);
    await applyFix(f);
    expect((await db.settings.get('app'))?.checklist[0].med?.stock?.left).toBe(9);
    const after = await db.days.get('2026-11-01');
    expect(after?.ticks?.['m:1']).toBeUndefined();
    expect(after?.ticks?.['m:0']).toBe(1000);
    expect(after?.ticksLate?.['m:1']).toBeUndefined();
  });
});

describe('check-up findings reach the You page', () => {
  const s = { ...defaultSettings(), backup: { ...defaultSettings().backup, lastQuick: Date.now() } };
  it('adds a line when something is off', () => {
    const item = dueItems({ today: TODAY, settings: s, days: [], checkupCount: 2 }).find((d) => d.id === 'checkup');
    expect(item).toMatchObject({ path: '/checkup', text: '2 things in your data look off' });
  });
  it('says nothing when all is clear', () => {
    expect(dueItems({ today: TODAY, settings: s, days: [], checkupCount: 0 }).some((d) => d.id === 'checkup')).toBe(false);
  });
});

describe('blank never reads as zero', () => {
  const month = { today: TODAY, settings: defaultSettings(), days: [] as Day[], entries: [], sessions: [], sets: [], sightings: [], songs: [] };
  const drinkLast = [{ id: 'd', date: '2026-09-05', kind: 'drink', protein: 0, kcal: 1, at: 0 }] as never[];
  it('a month with no drinks answer gets no drinks grade', () => {
    expect(assessment('2026-10', { ...month, entries: drinkLast }).some((g) => g.area === 'Drinks')).toBe(false);
  });
  it('a month with an answered no-drinks day still gets one', () => {
    expect(assessment('2026-10', { ...month, entries: drinkLast, days: [{ date: '2026-10-02', noDrinks: true }] }).some((g) => g.area === 'Drinks')).toBe(true);
  });
  it('training has no trend on a new install, and no "was" before the app existed', () => {
    const settings = { ...defaultSettings(), createdAt: new Date(2026, 10, 5, 12).getTime() };
    expect(trendRows(TODAY, { settings, days: [], entries: [], sessions: [] }).some((r) => r.area === 'training')).toBe(false);
    const session = { id: 'a', date: TODAY, status: 'done', startedAt: 0 } as never;
    const row = trendRows(TODAY, { settings, days: [], entries: [], sessions: [session] }).find((r) => r.area === 'training');
    expect(row?.was).toBeUndefined();
  });
  it('one "no drinks" answer does not speak for the whole month', () => {
    const head = headlineFor('drinks', { today: TODAY, settings: defaultSettings(), days: [{ date: '2026-11-02', noDrinks: true }], entries: [] } as never);
    expect(head.say).toBe('No drinks on the 1 day you answered');
  });
  it('the weekly tally leaves steps out when no steps were logged', () => {
    const chapters = storyChapters('2026-10-26', { today: TODAY, settings: defaultSettings(), days: [{ date: '2026-10-27', sleep: { asleep: 1380, woke: 420 } }], entries: [], sessions: [{ id: 'a', date: '2026-10-27', status: 'done', startedAt: 0 } as never], sets: [], sightings: [], moments: [] } as never);
    const tally = chapters.find((c) => c.id === 'tally') as { steps?: number } | undefined;
    expect(tally).toBeDefined();
    expect(tally?.steps).toBeUndefined();
  });
  it('the film poster leaves out what it has nothing for', () => {
    expect(posterLine('0', '3', '0')).toBe('3 sessions');
    expect(posterLine('120', '1', '2')).toBe('120 km · 1 session · 2 records');
  });
});
