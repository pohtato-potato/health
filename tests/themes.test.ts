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
    expect(availableThemes(new Set([diwali])).map((t) => t.id)).toEqual(['dusk', 'diwali', 'monsoon', 'matchday', 'aurora', 'glacier', 'blossom', 'reef']);
  });

  it('falls back to Dusk for a theme not yet earned', () => {
    expect(themeFor({ prefs, theme: 'platinum' }, '2026-10-01', new Set())).toBe('dusk');
    const moon = unlockFor(THEMES.find((t) => t.id === 'moonlight')!)!.id;
    expect(themeFor({ prefs, theme: 'moonlight' }, '2026-10-01', new Set([moon]))).toBe('moonlight');
  });
});

describe('data colours on themed days', () => {
  it('no theme repaints the data colours, so charts read the same on every theme', async () => {
    const { readFileSync } = await import('node:fs');
    const css = ['src/styles/app.css', 'src/styles/components.css'].map((p) => readFileSync(p, 'utf8')).join('\n');
    const blocks = [...css.matchAll(/:root\.theme-[\w-]+[^{]*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(b).not.toMatch(/--(apricot|sage|lavender|blue|pearl)\s*:/);
  });
});

describe('the look pass themes (rule 10)', () => {
  it('every theme sets the four things: light, action colour, ring design and (but Dusk) Walk\'s sky', () => {
    for (const t of THEMES) {
      expect(t.look.light.ground, t.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.look.act, t.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.look.ring.inks, t.id).toHaveLength(4);
      if (t.id !== 'dusk') expect(t.look.sky, t.id).toHaveLength(3);
    }
  });
  it('each theme has its own ring design', () => {
    const designs = THEMES.map((t) => t.look.ring.design);
    expect(new Set(designs).size).toBe(designs.length);
  });
  it('the warm and cool lights sit in opposite corners, so they never mix to brown', () => {
    const opp = (a: string, b: string) => { const [ax, ay] = a.split(' ').map(parseFloat); const [bx, by] = b.split(' ').map(parseFloat); return Math.abs(ax - bx) + Math.abs(ay - by) >= 100; };
    for (const t of THEMES) expect(opp(t.look.light.warmAt, t.look.light.coolAt), t.id).toBe(true);
  });
  it('every action colour is light enough for the dark text on it', () => {
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const dark = lum('#0d0f20');
    for (const t of THEMES) expect((lum(t.look.act) + 0.05) / (dark + 0.05), t.id).toBeGreaterThanOrEqual(7);
  });
  it('the new themes are free to wear', () => {
    expect(THEMES.filter((t) => t.free).map((t) => t.id)).toEqual(['monsoon', 'matchday', 'aurora', 'glacier', 'blossom', 'reef']);
  });
});
