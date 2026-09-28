import { ACHIEVEMENTS } from './achievements';
import type { DayKey } from './dates';
import { festivalOn } from './festivals';
import { prefOn, type Settings } from './types';

export type ThemeId = 'dusk' | 'diwali' | 'holi' | 'birthday' | 'sunrise' | 'moonlight' | 'retro' | 'antimatter' | 'platinum';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  blurb: string;
  /** The achievement reward that unlocks it for everyday use. */
  reward?: string;
  /** Only ever appears on its day. */
  seasonalOnly?: boolean;
  /** Background, accent, second accent: for the picker. */
  swatch: [string, string, string];
  /** The browser bar colour. */
  bar: string;
}

export const THEMES: ThemeDef[] = [
  { id: 'dusk', name: 'Dusk', blurb: 'Deep ink and soft light. The everyday look.', swatch: ['#0d0f14', '#e6c47a', '#8fc9b0'], bar: '#0d0f14' },
  { id: 'diwali', name: 'Diwali', blurb: 'Marigold and diya light.', reward: 'The Diwali theme', swatch: ['#120d0b', '#f5b94a', '#f28c4b'], bar: '#120d0b' },
  { id: 'holi', name: 'Holi', blurb: 'Gulal in every colour, for the day.', seasonalOnly: true, swatch: ['#0f0d14', '#ff7aa8', '#5fd6a0'], bar: '#0f0d14' },
  { id: 'birthday', name: 'Birthday', blurb: 'For your day.', seasonalOnly: true, swatch: ['#100e16', '#f7c96b', '#d6a8ff'], bar: '#100e16' },
  { id: 'sunrise', name: 'Kanyakumari sunrise', blurb: 'Dawn over three seas.', reward: 'The Kanyakumari sunrise theme', swatch: ['#120f14', '#ffb86b', '#ff8a6b'], bar: '#1d1219' },
  { id: 'moonlight', name: 'Moonlight', blurb: 'Silver and cool blue.', reward: 'The Moonlight theme', swatch: ['#0b0e14', '#d9e4f2', '#a8d0e6'], bar: '#0b0e14' },
  { id: 'retro', name: 'Retro', blurb: 'Phosphor green, like an old terminal.', reward: 'The Retro theme', swatch: ['#070a07', '#f6d743', '#6ff07a'], bar: '#070a07' },
  { id: 'antimatter', name: 'Antimatter', blurb: 'Every colour flipped.', reward: 'The Antimatter theme', swatch: ['#0a0610', '#4ff5e6', '#ff5fd2'], bar: '#0a0610' },
  { id: 'platinum', name: 'Platinum', blurb: 'For the ones who found everything.', reward: 'The Platinum theme', swatch: ['#0e1013', '#dde8f2', '#bfc5cc'], bar: '#0e1013' },
];

export const themeById = (id: string | undefined) => THEMES.find((t) => t.id === id);

/** The achievement that unlocks a theme, if it has one. */
export function unlockFor(t: ThemeDef) {
  return t.reward ? ACHIEVEMENTS.find((a) => a.reward === t.reward) : undefined;
}

/** Themes available to pick: Dusk, plus every reward earned so far. */
export function availableThemes(unlocked: Set<string>): ThemeDef[] {
  return THEMES.filter((t) => t.id === 'dusk' || (!t.seasonalOnly && unlocked.has(unlockFor(t)?.id ?? '')));
}

/** Diwali and Holi on their days, and your birthday. */
export function seasonalThemeOn(date: DayKey, birthday?: string): ThemeId | undefined {
  if (birthday && date.slice(5) === birthday) return 'birthday';
  return festivalOn(date)?.id;
}

/** What the app wears today: a seasonal theme when it's switched on, else the one you picked. */
export function themeFor(settings: Pick<Settings, 'prefs' | 'theme' | 'birthday'>, date: DayKey, unlocked: Set<string>): ThemeId {
  if (prefOn(settings.prefs, 'seasonal')) {
    const s = seasonalThemeOn(date, settings.birthday);
    if (s) return s;
  }
  const picked = themeById(settings.theme);
  return picked && availableThemes(unlocked).includes(picked) ? picked.id : 'dusk';
}
