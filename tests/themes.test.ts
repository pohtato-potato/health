import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/domain/achievements';
import { availableThemes, seasonalThemeOn, themeFor, THEMES, unlockFor } from '../src/domain/themes';
import type { Prefs } from '../src/domain/types';

const prefs = { ding: true, wakeLock: true, nightMode: true, buzz: true, confirmSteps: true } as Prefs;

describe('themes', () => {
  it('ties every reward theme to a real achievement', () => {
    for (const t of THEMES.filter((x) => x.reward)) expect(unlockFor(t), t.id).toBeDefined();
    const rewards = ACHIEVEMENTS.filter((a) => a.reward?.endsWith(' theme')).map((a) => a.reward);
    for (const r of rewards) expect(THEMES.some((t) => t.reward === r), r).toBe(true);
  });

  it('finds Diwali, Holi and the birthday', () => {
    expect(seasonalThemeOn('2026-11-08')).toBe('diwali');
    expect(seasonalThemeOn('2026-11-06')).toBe('diwali');
    expect(seasonalThemeOn('2027-03-22')).toBe('holi');
    expect(seasonalThemeOn('2026-09-28', '09-28')).toBe('birthday');
    expect(seasonalThemeOn('2026-09-29', '09-28')).toBeUndefined();
  });

  it('lets a seasonal theme take over, unless switched off', () => {
    const diwali = unlockFor(THEMES.find((t) => t.id === 'diwali')!)!.id;
    expect(themeFor({ prefs, theme: 'moonlight' }, '2026-11-08', new Set())).toBe('diwali');
    expect(themeFor({ prefs: { ...prefs, seasonal: false }, theme: 'dusk' }, '2026-11-08', new Set())).toBe('dusk');
    expect(availableThemes(new Set([diwali])).map((t) => t.id)).toEqual(['dusk', 'diwali']);
  });

  it('falls back to Dusk for a theme not yet earned', () => {
    expect(themeFor({ prefs, theme: 'platinum' }, '2026-10-01', new Set())).toBe('dusk');
    const moon = unlockFor(THEMES.find((t) => t.id === 'moonlight')!)!.id;
    expect(themeFor({ prefs, theme: 'moonlight' }, '2026-10-01', new Set([moon]))).toBe('moonlight');
  });
});
