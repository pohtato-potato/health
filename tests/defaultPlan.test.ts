import { describe, expect, it } from 'vitest';
import { DEFAULT_EQUIPMENT, DEFAULT_PLAN } from '../src/domain/defaultPlan';
import { buildSession, validatePlan } from '../src/domain/plan';
import { exerciseStatus } from '../src/domain/progression';
import { defaultSettings } from '../src/db/actions';

describe('the built-in plan', () => {
  it('is valid and builds both sessions', () => {
    expect(validatePlan(DEFAULT_PLAN)).toEqual([]);
    expect(buildSession(DEFAULT_PLAN, 'A')).toHaveLength(9);
    expect(buildSession(DEFAULT_PLAN, 'B')).toHaveLength(11);
    expect(buildSession(DEFAULT_PLAN, 'B', { short: true })).toHaveLength(3);
  });

  it('starts every loaded exercise at its plan load with the default kit', () => {
    for (const ex of DEFAULT_PLAN.sessions.flatMap((s) => s.exercises)) {
      if (ex.load !== 'pair' && ex.load !== 'single') continue;
      expect(exerciseStatus(ex, { variants: {}, band: {} }, DEFAULT_EQUIPMENT, []).loadKg, ex.id).toBe(ex.startKg);
    }
  });

  it('comes with every new install', () => {
    expect(defaultSettings().plan?.name).toBe('Home A/B');
  });

  it('names nobody and nothing personal, since the code is public', () => {
    const text = JSON.stringify(DEFAULT_PLAN);
    expect(text).not.toMatch(/with [A-Z][a-z]+\.|left[- ]knee/i);
  });
});
