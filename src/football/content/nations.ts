// The nation map (spec §9.4). A player whose name carries a nation plays for it. Everyone else is
// given one nation, once and for good, from NATION_POOL: the nations already in the league and
// continental data. Codes follow the shipped data (two letters; EN, SC and WA for the home nations).
import type { Nation, NationWord } from './types';

export const NATIONS: Nation[] = [
  { code: 'AR', name: 'Argentina' }, { code: 'AT', name: 'Austria' }, { code: 'AU', name: 'Australia' },
  { code: 'BE', name: 'Belgium' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BR', name: 'Brazil' },
  { code: 'CH', name: 'Switzerland' }, { code: 'CU', name: 'Cuba' }, { code: 'CZ', name: 'Czechia' },
  { code: 'DE', name: 'Germany' }, { code: 'DK', name: 'Denmark' }, { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' }, { code: 'EN', name: 'England' }, { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' }, { code: 'GR', name: 'Greece' },
  { code: 'HR', name: 'Croatia' }, { code: 'IN', name: 'India' }, { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' }, { code: 'LV', name: 'Latvia' }, { code: 'MA', name: 'Morocco' },
  { code: 'MX', name: 'Mexico' }, { code: 'NL', name: 'Netherlands' }, { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'RO', name: 'Romania' },
  { code: 'RS', name: 'Serbia' }, { code: 'RU', name: 'Russia' }, { code: 'SC', name: 'Scotland' },
  { code: 'SE', name: 'Sweden' }, { code: 'SK', name: 'Slovakia' }, { code: 'SU', name: 'Soviet Union' },
  { code: 'TR', name: 'Türkiye' }, { code: 'UA', name: 'Ukraine' }, { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' }, { code: 'WA', name: 'Wales' },
];
export const nationByCode = (code: string) => NATIONS.find((n) => n.code === code);

/**
 * Words in a player's name that carry a nation, checked in order, first match wins.
 * Exercise names come from the coach's plan; habit names from the checklist.
 */
export const NATION_WORDS: NationWord[] = [
  { word: /\bromanian\b/i, nation: 'RO' }, // Romanian deadlift
  { word: /\bbulgarian\b/i, nation: 'BG' }, // Bulgarian split squat, Bulgarian bag
  { word: /\bturkish\b/i, nation: 'TR' }, // Turkish get-up
  { word: /\brussian\b/i, nation: 'RU' }, // Russian twist
  { word: /\bspanish\b/i, nation: 'ES' }, // Spanish squat
  { word: /\bfrench\b/i, nation: 'FR' }, // French press
  { word: /\bcuban\b/i, nation: 'CU' }, // Cuban press
  { word: /\begyptian\b/i, nation: 'EG' }, // Egyptian lateral raise
  { word: /\bswiss\b/i, nation: 'CH' }, // Swiss ball anything
  { word: /\bcopenhagen\b/i, nation: 'DK' }, // Copenhagen plank
  { word: /\bpolish\b/i, nation: 'PL' },
  { word: /\bjapanese\b/i, nation: 'JP' },
  { word: /\bindian\b/i, nation: 'IN' }, // Indian clubs
  { word: /\bscottish\b/i, nation: 'SC' },
  { word: /\bwelsh\b/i, nation: 'WA' },
  { word: /\bdutch\b/i, nation: 'NL' },
  { word: /\bgerman\b/i, nation: 'DE' },
  { word: /\bitalian\b/i, nation: 'IT' },
  { word: /\bportuguese\b/i, nation: 'PT' },
  { word: /\bgreek\b/i, nation: 'GR' },
];

/**
 * The nations a player without a name-nation can be given: every country already in the league
 * (league.json) and the continental data (data/continental.ts), so duty always has a fixture list.
 */
export const NATION_POOL: string[] = [
  'AT', 'BE', 'DE', 'EN', 'ES', 'FI', 'FR', 'IT', 'NL', 'NO', 'PT', 'SK', 'WA', // league
  'SC', 'TR', 'UA', 'HR', 'GR', 'DK', 'CH', 'RS', 'CZ', 'RO', 'LV', // continental, Europe
  'AR', 'BR', 'MX', 'US', 'MA', 'JP', 'AU', // Club World Cup field
];

/** The nation a name carries, or undefined. */
export function nationInName(name: string): string | undefined {
  return NATION_WORDS.find((w) => w.word.test(name))?.nation;
}
