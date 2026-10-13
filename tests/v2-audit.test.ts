import { describe, expect, it } from 'vitest';
import { auditFiles } from '../src/export/auditPack';
import { setupGaps } from '../src/domain/setupCheck';
import { workbookSheets, type ExportData } from '../src/export/workbook';
import { defaultSettings } from '../src/db/actions';
import type { Settings } from '../src/domain/types';

const base = (): ExportData => ({
  settings: { ...defaultSettings(), setupDone: true, heightCm: 178, lastfm: { key: 'SECRET-KEY-123', users: ['someone'] } } as Settings,
  days: [{ date: '2026-10-12', steps: 9000, place: 'home-1', status: 'sick', energy: 3, stomach: true }],
  foods: [],
  entries: [],
  sessions: [{ id: 's1', date: '2026-10-12', session: 'A', planName: 'x', startedAt: 0, endedAt: 3_600_000, status: 'done', short: false, exercises: ['row'], quality: 81, readiness: 74, context: ['post-office'] }],
  sets: [{ id: 'x1', sessionId: 's1', date: '2026-10-12', session: 'A', exerciseId: 'row', exercise: 'Row', setNo: 1, side: 'both', loadKg: 10, reps: 12, at: 1, form: 4, cleanReps: 10, rir: 2, challenges: ['pause-bottom'] }, { id: 'x2', sessionId: 's1', date: '2026-10-12', session: 'A', exerciseId: 'row', exercise: 'Row', setNo: 2, side: 'both', loadKg: null, at: 2, skipped: true }],
  measurements: [],
});

describe('audit pack and workbook', () => {
  it('audit pack strips secrets', () => {
    const files = auditFiles(base(), { usage: [{ at: 1, kind: 'open' }], edits: [], notes: [{ at: 2, text: 'Calories looked high' }] });
    const names = files.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(['health-workbook.xlsx', 'usage.json', 'edits.json', 'notes.json', 'settings.json', 'README.txt']));
    for (const f of files) if (!f.name.endsWith('.xlsx')) expect(new TextDecoder().decode(f.data)).not.toContain('SECRET-KEY-123');
    const settings = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'settings.json')!.data));
    expect(settings.lastfm.key).toBeUndefined();
    expect(settings.lastfm.users).toEqual(['someone']);
  });

  it('workbook has v2 columns and README', () => {
    const sheets = workbookSheets(base(), new Date('2026-10-13T12:00:00'));
    expect(sheets[0].name).toBe('README');
    const daily = sheets.find((s) => s.name === 'Daily')!;
    for (const c of ['place', 'status', 'energy_1_5', 'stomach_ok']) expect(daily.rows[0]).toContain(c);
    const sets = sheets.find((s) => s.name === 'Sets')!;
    for (const c of ['form_1_5', 'clean_reps', 'rir', 'challenges', 'skipped']) expect(sets.rows[0]).toContain(c);
    const row = sets.rows.find((r) => r[0] === '2026-10-12' && r[3] === 1)!;
    expect(row[sets.rows[0].indexOf('form_1_5')]).toBe(4);
    expect(row[sets.rows[0].indexOf('challenges')]).toBe('pause-bottom');
    const sessions = sheets.find((s) => s.name === 'Sessions')!;
    for (const c of ['quality', 'readiness', 'context']) expect(sessions.rows[0]).toContain(c);
  });
});

describe('setup check', () => {
  it('setupGaps lists missing birth year', () => {
    const s = { ...defaultSettings(), heightCm: 178 } as Settings;
    expect(setupGaps(s).map((g) => g.id)).toContain('birthYear');
    expect(setupGaps({ ...s, birthYear: 2004 } as Settings).map((g) => g.id)).not.toContain('birthYear');
    expect(setupGaps({ ...s, birthYear: 2004, lastfm: { key: 'k', users: ['u'] } } as Settings).map((g) => g.id)).not.toContain('lastfm');
  });
});
