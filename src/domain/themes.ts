import { ACHIEVEMENTS } from './achievements';
import type { DayKey } from './dates';
import { festivalOn } from './festivals';
import { prefOn, type Settings } from './types';

export type ThemeId = 'dusk' | 'diwali' | 'holi' | 'birthday' | 'sunrise' | 'moonlight' | 'retro' | 'antimatter' | 'platinum' | 'monsoon' | 'matchday' | 'aurora' | 'glacier' | 'blossom' | 'reef';

/**
 * How a theme draws the rings (look pass, rule 10). The band pattern changes; how full each ring is never does.
 * Dash designs pattern the band, shape designs bend its line, comet adds a bright head, reverse runs anticlockwise.
 */
export type RingDesign = 'solid' | 'halo' | 'lamps' | 'thrown' | 'scallop' | 'crescent' | 'pixel' | 'reverse' | 'notch' | 'rain' | 'pitch' | 'comet' | 'kite' | 'blossom' | 'ripple';

/** The four things a theme changes everywhere: the page light, the action colour, the ring design and Walk's sky. */
export interface ThemeLook {
  /** The warm corner, the cool corner (always the opposite one, so they never mix to brown) and the ground. */
  light: { warm: string; warmAt: string; cool: string; coolAt: string; ground: string };
  /** The one action colour. Every theme's is light enough for dark text on it. */
  act: string;
  ring: { design: RingDesign; name: string; inks: [string, string, string, string] };
  /** Walk's sky, top to horizon; the scene's own sky is pulled halfway toward it. Dusk keeps the scene's own. */
  sky?: [string, string, string];
}

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
  /** Free to wear from the start (the look-pass themes); the others are earned. */
  free?: boolean;
  look: ThemeLook;
}

const L = (warm: string, warmAt: string, cool: string, coolAt: string, ground: string) => ({ warm, warmAt, cool, coolAt, ground });

export const THEMES: ThemeDef[] = [
  { id: 'dusk', name: 'Dusk', blurb: 'Deep ink and soft light. The everyday look.', swatch: ['#0d0f14', '#e6c47a', '#8fc9b0'], bar: '#0d0f14',
    look: { light: L('rgba(233,138,91,.30)', '0% 0%', 'rgba(108,63,196,.45)', '100% 100%', '#100c1e'), act: '#ff7a1a', ring: { design: 'solid', name: 'Solid bands', inks: ['#ff8a4d', '#b79bff', '#5ff0b0', '#6cc8ff'] } } },
  { id: 'diwali', name: 'Diwali', blurb: 'Marigold and diya light.', reward: 'The Diwali theme', swatch: ['#120d0b', '#f5b94a', '#f28c4b'], bar: '#120d0b',
    look: { light: L('rgba(255,170,60,.44)', '50% 0%', 'rgba(255,90,120,.22)', '100% 100%', '#1a0d14'), act: '#ffb03c', ring: { design: 'lamps', name: 'A row of lamps', inks: ['#ffb03c', '#ff6f5a', '#ffd86b', '#fff0b8'] }, sky: ['#1e0d06', '#6a2c0e', '#f5a04a'] } },
  { id: 'holi', name: 'Holi', blurb: 'Gulal in every colour, for the day.', seasonalOnly: true, swatch: ['#0f0d14', '#ff7aa8', '#5fd6a0'], bar: '#0f0d14',
    look: { light: L('rgba(255,95,162,.34)', '0% 0%', 'rgba(95,214,160,.26)', '100% 100%', '#120d1a'), act: '#ff6fae', ring: { design: 'thrown', name: 'Thrown powder', inks: ['#ff5fa2', '#ffd35c', '#5fd6a0', '#6fb3ff'] }, sky: ['#2a1238', '#a0406e', '#ffd35c'] } },
  { id: 'birthday', name: 'Birthday', blurb: 'For your day.', seasonalOnly: true, swatch: ['#100e16', '#f7c96b', '#d6a8ff'], bar: '#100e16',
    look: { light: L('rgba(247,201,107,.32)', '0% 0%', 'rgba(214,168,255,.32)', '100% 100%', '#130f1e'), act: '#f7c96b', ring: { design: 'scallop', name: 'Bunting', inks: ['#f7c96b', '#d6a8ff', '#ff9c8a', '#8fe0c0'] }, sky: ['#1c1534', '#5c4290', '#f7c96b'] } },
  { id: 'sunrise', name: 'Kanyakumari sunrise', blurb: 'Dawn over three seas.', reward: 'The Kanyakumari sunrise theme', swatch: ['#120f14', '#ffb86b', '#ff8a6b'], bar: '#1d1219',
    look: { light: L('rgba(255,150,90,.42)', '50% 0%', 'rgba(80,150,230,.26)', '100% 100%', '#150f1c'), act: '#ff9a5a', ring: { design: 'halo', name: 'A halo round each band', inks: ['#ffb86b', '#ff7a8a', '#ffe0a8', '#7fd0ff'] }, sky: ['#1a1030', '#a04060', '#ffb86b'] } },
  { id: 'moonlight', name: 'Moonlight', blurb: 'Silver and cool blue.', reward: 'The Moonlight theme', swatch: ['#0b0e14', '#d9e4f2', '#a8d0e6'], bar: '#0b0e14',
    look: { light: L('rgba(201,220,234,.32)', '100% 0%', 'rgba(70,90,190,.32)', '0% 100%', '#080b1c'), act: '#d6e4f6', ring: { design: 'crescent', name: 'Thin crescents', inks: ['#f2f6fb', '#c4d3ea', '#94acdb', '#a8e0f0'] }, sky: ['#060a1c', '#23325e', '#9fb4d8'] } },
  { id: 'retro', name: 'Retro', blurb: 'Arcade pinks and cyans, in blocks.', reward: 'The Retro theme', swatch: ['#070a07', '#f6d743', '#6ff07a'], bar: '#0c0a1e',
    look: { light: L('rgba(180,120,255,.40)', '0% 0%', 'rgba(95,240,240,.22)', '100% 100%', '#0c0a1e'), act: '#ffe14d', ring: { design: 'pixel', name: 'Pixel blocks', inks: ['#ff5fa2', '#5ff0f0', '#ffe14d', '#7dff7a'] }, sky: ['#120a2a', '#4a1f7a', '#ff5fa2'] } },
  { id: 'antimatter', name: 'Antimatter', blurb: 'Every colour flipped; the rings run backwards.', reward: 'The Antimatter theme', swatch: ['#0a0610', '#4ff5e6', '#ff5fd2'], bar: '#0a0610',
    look: { light: L('rgba(79,245,230,.26)', '100% 0%', 'rgba(255,95,210,.30)', '0% 100%', '#0a0610'), act: '#4ff5e6', ring: { design: 'reverse', name: 'Rings that run backwards', inks: ['#4ff5e6', '#ff5fd2', '#b6ff5c', '#9a8dff'] }, sky: ['#0a1420', '#14505a', '#4ff5e6'] } },
  { id: 'platinum', name: 'Platinum', blurb: 'For the ones who found everything.', reward: 'The Platinum theme', swatch: ['#0e1013', '#dde8f2', '#bfc5cc'], bar: '#0e1013',
    look: { light: L('rgba(221,232,242,.24)', '50% 0%', 'rgba(150,140,230,.22)', '100% 100%', '#0e1116'), act: '#e6edf4', ring: { design: 'notch', name: 'Cut like a stone', inks: ['#f4f6f8', '#e2d4ff', '#a9e4ff', '#cfe8dc'] }, sky: ['#0e1218', '#3a4656', '#cfd8e2'] } },
  // The look pass's own themes (15 Nov): free to wear, each with its own light, ring design and sky.
  { id: 'monsoon', name: 'Monsoon', blurb: 'Green rain over the ghats.', free: true, swatch: ['#07141a', '#5abeaa', '#6cc8ff'], bar: '#07141a',
    look: { light: L('rgba(90,190,170,.40)', '0% 100%', 'rgba(108,200,255,.24)', '100% 0%', '#07141a'), act: '#46d1b8', ring: { design: 'rain', name: 'Falling rain', inks: ['#5abeaa', '#6cc8ff', '#9be6d0', '#b4c8ff'] }, sky: ['#0a1a22', '#2a5a66', '#9be6d0'] } },
  { id: 'matchday', name: 'Matchday', blurb: 'Floodlights and a white-lined pitch.', free: true, swatch: ['#0a0c1c', '#ff7a1a', '#b478ff'], bar: '#0a0c1c',
    look: { light: L('rgba(255,122,26,.38)', '100% 0%', 'rgba(140,90,255,.32)', '0% 100%', '#0a0c1c'), act: '#ff7a1a', ring: { design: 'pitch', name: 'Pitch markings', inks: ['#ff7a1a', '#b478ff', '#f3efe4', '#5fe08a'] }, sky: ['#0a0c1c', '#3a2a6a', '#ff7a1a'] } },
  { id: 'aurora', name: 'Aurora', blurb: 'Northern lights, green into violet.', free: true, swatch: ['#061018', '#5ff0b0', '#8a7dff'], bar: '#061018',
    look: { light: L('rgba(95,240,176,.32)', '30% 0%', 'rgba(138,125,255,.34)', '100% 100%', '#061018'), act: '#5ff0b0', ring: { design: 'comet', name: 'Comets with bright heads', inks: ['#5ff0b0', '#8a7dff', '#3fd8ff', '#ff8ad8'] }, sky: ['#041018', '#155a4a', '#5ff0b0'] } },
  { id: 'glacier', name: 'Glacier', blurb: 'Ice light, cut into facets.', free: true, swatch: ['#07101c', '#bff3ff', '#7fd6ff'], bar: '#07101c',
    look: { light: L('rgba(191,243,255,.26)', '0% 0%', 'rgba(90,140,255,.26)', '100% 100%', '#07101c'), act: '#8ee3ff', ring: { design: 'kite', name: 'Faceted ice', inks: ['#bff3ff', '#7fd6ff', '#e8fbff', '#a9b8ff'] }, sky: ['#081428', '#2a5a8a', '#bff3ff'] } },
  { id: 'blossom', name: 'Blossom', blurb: 'Spring pinks and new green.', free: true, swatch: ['#150c18', '#ff9cc8', '#9df0c8'], bar: '#150c18',
    look: { light: L('rgba(255,156,200,.34)', '0% 0%', 'rgba(157,240,200,.20)', '100% 100%', '#150c18'), act: '#ff8ac0', ring: { design: 'blossom', name: 'Petals', inks: ['#ff9cc8', '#d9a8ff', '#9df0c8', '#ffd0e4'] }, sky: ['#1a1028', '#7a3a6a', '#ffb0d4'] } },
  { id: 'reef', name: 'Reef', blurb: 'Coral and lagoon blue.', free: true, swatch: ['#061420', '#ff7f6a', '#42e0d0'], bar: '#061420',
    look: { light: L('rgba(66,224,208,.32)', '0% 100%', 'rgba(255,127,106,.30)', '100% 0%', '#061420'), act: '#ff7f6a', ring: { design: 'ripple', name: 'Ripples', inks: ['#ff7f6a', '#42e0d0', '#ffd36b', '#5aa8ff'] }, sky: ['#061828', '#0f5a6a', '#42e0d0'] } },
];

export const themeById = (id: string | undefined) => THEMES.find((t) => t.id === id);

/** The achievement that unlocks a theme, if it has one. */
export function unlockFor(t: ThemeDef) {
  return t.reward ? ACHIEVEMENTS.find((a) => a.reward === t.reward) : undefined;
}

/** Themes available to pick: Dusk and the free ones, plus every reward earned so far. */
export function availableThemes(unlocked: Set<string>): ThemeDef[] {
  return THEMES.filter((t) => t.id === 'dusk' || t.free || (!t.seasonalOnly && unlocked.has(unlockFor(t)?.id ?? '')));
}

/** The look a theme wears; Dusk for anything unknown. */
export const lookOf = (id: string | undefined): ThemeLook => (themeById(id) ?? THEMES[0]).look;

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
