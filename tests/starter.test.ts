import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseBackup } from '../src/db/backup';
import { buildSession, validatePlan } from '../src/domain/plan';
import { exerciseStatus } from '../src/domain/progression';
import type { Settings } from '../src/domain/types';

// The starter file is private and git-ignored; these only run where it exists.
const path = new URL('../private/health-starter.json', import.meta.url);

// Read inside each test: a skipped group still runs its body to collect the tests.
const load = () => {
  const file = parseBackup(readFileSync(path, 'utf8'));
  return { file, s: file.tables.settings![0] as Settings };
};

describe.skipIf(!existsSync(path))('private starter file', () => {
  it('is a starter with a valid plan', () => {
    const { file, s } = load();
    expect(file.kind).toBe('starter');
    expect(validatePlan(s.plan)).toEqual([]);
  });
  it('builds both sessions and their short versions', () => {
    const { s } = load();
    // Every exercise in each session, so the counts follow the plan (v2 dropped the dead bug).
    for (const id of ['A', 'B']) expect(buildSession(s.plan!, id).length).toBe(s.plan!.sessions.find((x) => x.id === id)!.exercises.length);
    expect(buildSession(s.plan!, 'A').some((e) => e.id === 'dead-bug')).toBe(false);
    expect(buildSession(s.plan!, 'B', { short: true }).length).toBe(3);
  });
  it('starts every exercise from its plan load', () => {
    const { s } = load();
    for (const ex of s.plan!.sessions.flatMap((x) => x.exercises)) {
      const st = exerciseStatus(ex, s.planState, s.equipment, []);
      if (ex.load === 'pair' || ex.load === 'single') expect(st.loadKg).toBe(ex.startKg);
    }
  });
});
