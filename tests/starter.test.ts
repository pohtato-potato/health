import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseBackup } from '../src/db/backup';
import { buildSession, validatePlan } from '../src/domain/plan';
import { exerciseStatus } from '../src/domain/progression';
import type { Settings } from '../src/domain/types';

// The starter file is private and git-ignored; this only runs where it exists.
const path = new URL('../private/health-starter.json', import.meta.url);
const run = existsSync(path) ? describe : describe.skip;

run('private starter file', () => {
  const file = parseBackup(readFileSync(path, 'utf8'));
  const s = file.tables.settings![0] as Settings;
  it('is a starter with a valid plan', () => {
    expect(file.kind).toBe('starter');
    expect(validatePlan(s.plan)).toEqual([]);
  });
  it('builds both sessions and their short versions', () => {
    expect(buildSession(s.plan!, 'A').length).toBe(10);
    expect(buildSession(s.plan!, 'B').length).toBe(11);
    expect(buildSession(s.plan!, 'B', { short: true }).length).toBe(3);
  });
  it('starts every exercise from its plan load', () => {
    for (const ex of s.plan!.sessions.flatMap((x) => x.exercises)) {
      const st = exerciseStatus(ex, s.planState, s.equipment, []);
      if (ex.load === 'pair' || ex.load === 'single') expect(st.loadKg).toBe(ex.startKg);
    }
  });
});
