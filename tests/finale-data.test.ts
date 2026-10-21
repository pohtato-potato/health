import { describe, expect, it } from 'vitest';
import { finaleData } from '../src/screens/live/finaleData';
import type { PlanDef } from '../src/domain/plan';
import type { SetEntry, SongRecord, TrainingSession } from '../src/domain/types';

const MIN = 60_000;
const plan = {
  format: 'health-plan', version: 2, name: 'P', from: '2026-10-01', rotation: ['C'], flags: [],
  sessions: [{ id: 'C', name: 'Session C', focus: '', minutes: 60, short: [], exercises: [{ id: 'rdl', order: '1', name: 'Romanian deadlift', sets: 2, reps: [8, 12], load: 'pair', checks: [{ id: 'flat', text: 'Back stayed flat', kind: 'do' }] }] }],
} as unknown as PlanDef;
const session: TrainingSession = { id: 's', date: '2026-10-21', session: 'C', planName: 'P', startedAt: 0, endedAt: 50 * MIN, status: 'done', short: false, exercises: ['rdl'] };
const set = (p: Partial<SetEntry>): SetEntry => ({ id: Math.random().toString(), sessionId: 's', date: '2026-10-21', session: 'C', exerciseId: 'rdl', exercise: 'Romanian deadlift', setNo: 1, side: 'both', loadKg: 10, reps: 10, at: 0, ...p });
const songs: SongRecord[] = [
  { id: 's:0', artist: 'M83', track: 'Midnight City', at: 9 * MIN },
  { id: 's:1', artist: 'The xx', track: 'Intro', at: 20 * MIN },
];

describe('the finale’s data', () => {
  const mine = [set({ setNo: 1, reps: 12, mark: '!!', at: 10 * MIN, checks: { flat: 'ok' } }), set({ setNo: 2, reps: 9, at: 22 * MIN, checks: { flat: 'slip' } })];
  const d = finaleData({ session, mine, songs, pages: [{ name: 'Romanian deadlift', big: '12', bigLabel: 'REPS', detail: '10 kg × 12' }], plan, quality: 80, usualMin: 55 });
  it('matches each record to the song playing', () => expect(d.recordSongs).toEqual({ 'Romanian deadlift': 'Midnight City · M83' }));
  it('marks the record tracks in the soundtrack', () => expect(d.songs).toEqual([{ name: 'Midnight City · M83', record: true }, { name: 'Intro · The xx', record: false }]));
  it('names the session and keeps the usual length', () => {
    expect(d.name).toBe('Session C');
    expect(d.usualMin).toBe(55);
  });
  it('reads the checks by their plan text', () => expect(d.form.rows[0]).toEqual({ text: 'Back stayed flat', ok: 1, of: 2 }));
  it('picks tonight’s best', () => expect(d.best?.big).toBe('12'));
  it('falls back to the old form word without checks', () => {
    const old = finaleData({ session, mine: [set({ form: 4 })], songs: [], pages: [], plan, quality: 70 });
    expect(old.formWord).toBe('solid');
    expect(old.best).toBeUndefined();
  });
});
