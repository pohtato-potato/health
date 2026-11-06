// Crests as SVG strings (spec §8.8, boards 9–11). Brabo's five steps come from the approved files;
// every other club is built from the crest kit: one of six outlines, a symbol, the club colour.
import type { ClubDef } from '../data/load';
import { hashSeed } from '../rng';
import { CREST_STEPS } from './crestSteps';

let n = 0;
const uniq = (svg: string) => {
  n++;
  return svg.replace(/id="(\w+)"/g, `id="$1-${n}"`).replace(/href="#(\w+)"/g, `href="#$1-${n}"`);
};

export type CrestStep = 1 | 2 | 3 | 4 | 5;
export type CrestOptKey = 'a' | 'b' | 'c' | 'd' | 'e';

/** Brabo's crest at a step and option. */
export function crestSvg(step: CrestStep, opt: CrestOptKey, size: number, label = 'Brabo United crest'): string {
  const body = CREST_STEPS[`${step}${opt}`] ?? CREST_STEPS['1a'];
  return uniq(`<svg class="fb-crest" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${label}">${body}</svg>`);
}
/** The crest as a group to drop into another SVG (the shirt). Words are hidden by CSS at that size. */
export const crestGroup = (step: CrestStep, opt: CrestOptKey) => uniq(CREST_STEPS[`${step}${opt}`] ?? CREST_STEPS['1a']);

export const SHAPES = {
  heater: 'M18 14 H82 V48 Q82 78 50 92 Q18 78 18 48 Z',
  round: 'M50 8 A42 42 0 1 1 49.9 8 Z',
  oval: 'M50 6 C78 6 86 30 86 50 C86 72 74 94 50 94 C26 94 14 72 14 50 C14 30 22 6 50 6 Z',
  banner: 'M20 10 H80 V86 L50 72 L20 86 Z',
  hex: 'M50 6 L88 28 V72 L50 94 L12 72 V28 Z',
  pointed: 'M14 10 H86 V40 Q86 72 50 94 Q14 72 14 40 Z',
} as const;
export type ShapeKey = keyof typeof SHAPES;

export const SYM: Record<string, string> = {
  giant: '<path d="M34 72 V44 Q50 24 66 44 V72 M42 52 h5 M54 52 h5" class="sy"/>',
  anchor: '<circle cx="50" cy="30" r="6" class="sy"/><path d="M50 36 V74 M38 44 H62 M30 60 Q50 84 70 60" class="sy"/>',
  wheel: '<circle cx="50" cy="48" r="22" class="sy"/><path d="M50 26 V70 M28 48 H72 M34 32 L66 64 M66 32 L34 64 M40 74 L50 48 L60 74" class="sy"/>',
  moon: '<path d="M58 26 A22 22 0 1 0 64 66 A18 18 0 1 1 58 26 Z" class="sy"/>',
  tread: '<path d="M26 66 H74 M30 66 L70 50 M66 50 V34 H58" class="sy"/><circle cx="32" cy="70" r="4" class="sy"/><circle cx="68" cy="70" r="4" class="sy"/>',
  pigeon: '<path d="M28 56 Q40 36 58 40 Q66 30 72 36 L66 42 Q70 58 54 64 Q40 66 28 56 Z M46 64 L42 74 M54 64 L56 74" class="sy"/>',
  waves: '<path d="M24 44 Q37 34 50 44 T76 44 M24 60 Q37 50 50 60 T76 60" class="sy"/>',
  clock: '<circle cx="50" cy="52" r="20" class="sy"/><path d="M50 40 V52 L58 58 M34 34 L28 28 M66 34 L72 28" class="sy"/>',
  crook: '<path d="M46 76 V38 Q46 26 56 26 Q66 26 66 36" class="sy"/>',
  sun: '<path d="M26 60 H74 M34 60 A16 16 0 0 1 66 60 M50 30 V36 M32 38 L36 42 M68 38 L64 42" class="sy"/><path d="M26 70 Q38 64 50 70 T74 70" class="sy"/>',
  note: '<path d="M44 68 V30 L64 26 V60" class="sy"/><circle cx="40" cy="68" r="6" class="sy"/><circle cx="60" cy="62" r="6" class="sy"/>',
  trolley: '<path d="M26 54 H74 V62 H26 Z M32 62 V70 M68 62 V70 M26 46 H40" class="sy"/><circle cx="32" cy="72" r="3" class="sy"/><circle cx="68" cy="72" r="3" class="sy"/>',
  midsun: '<path d="M24 62 H76 M30 62 A20 20 0 0 1 70 62 M50 32 V24 M30 40 L24 34 M70 40 L76 34" class="sy"/>',
  cliff: '<path d="M22 72 H48 V40 L76 44" class="sy"/><circle cx="64" cy="30" r="4" class="sy"/>',
  bat: '<path d="M50 42 L44 36 L46 46 Q34 40 22 46 Q32 50 34 60 Q42 52 50 60 Q58 52 66 60 Q68 50 78 46 Q66 40 54 46 L56 36 Z" class="sy"/>',
  star: '<path d="M50 28 L56 44 L72 44 L59 54 L64 70 L50 60 L36 70 L41 54 L28 44 L44 44 Z" class="sy"/>',
  tower: '<path d="M40 74 V40 H60 V74 M36 40 H64 M40 40 V32 H46 V40 M54 40 V32 H60 V40" class="sy"/>',
  bird: '<path d="M26 50 Q38 40 50 50 Q62 40 74 50" class="sy"/>',
  leaf: '<path d="M50 74 Q30 54 50 28 Q70 54 50 74 Z M50 74 V40" class="sy"/>',
  key: '<circle cx="40" cy="44" r="10" class="sy"/><path d="M48 50 L70 72 M62 64 L66 60 M66 68 L70 64" class="sy"/>',
  ball: '<circle cx="50" cy="50" r="20" class="sy"/><path d="M50 38 L60 45 L56 57 H44 L40 45 Z" class="sy"/>',
  bolt: '<path d="M56 26 L38 54 H52 L44 76 L64 46 H50 Z" class="sy"/>',
  crown: '<path d="M30 64 L34 38 L44 52 L50 34 L56 52 L66 38 L70 64 Z" class="sy"/>',
  ship: '<path d="M28 60 H72 L64 72 H36 Z M50 60 V28 L66 52 H50" class="sy"/>',
  bridge: '<path d="M22 64 H78 M28 64 Q50 30 72 64 M36 64 V52 M50 64 V44 M64 64 V52" class="sy"/>',
};

// Board 11's made-up crests, by club name; the rest pick a symbol from their crest line.
const MADE: Record<string, [ShapeKey, string]> = {
  'Antigoon FC': ['heater', 'giant'], 'Delfshaven Boys': ['banner', 'anchor'], 'FC Kermis': ['round', 'wheel'],
  'Hangover XI': ['hex', 'moon'], 'Treadmill Rovers': ['pointed', 'tread'], 'Duivenbond Gent': ['oval', 'pigeon'],
  'Laagwater SV': ['round', 'waves'], 'Atlético Despertador': ['heater', 'clock'], 'Sheepdog United': ['banner', 'crook'],
  'Calcio Lungomare': ['oval', 'sun'], 'Vienna Waltz SC': ['pointed', 'note'], 'Hospital Porters': ['hex', 'trolley'],
  'FC Midnattssol': ['round', 'midsun'], 'Cliffhanger Athletic': ['heater', 'cliff'], 'Real Murciélagos': ['banner', 'bat'],
};
const WORDS: [RegExp, string][] = [
  [/anchor|harbour|port|dock/i, 'anchor'], [/wheel|fair|carousel/i, 'wheel'], [/moon|night/i, 'moon'], [/pigeon|dove/i, 'pigeon'],
  [/wave|river|sea|water|tide/i, 'waves'], [/clock|alarm|time/i, 'clock'], [/sun|dawn/i, 'sun'], [/note|music|song|waltz/i, 'note'],
  [/bat\b|bats/i, 'bat'], [/cliff|rock/i, 'cliff'], [/star/i, 'star'], [/tower|castle|turret|fort/i, 'tower'],
  [/bird|gull|crow|eagle|hawk|owl/i, 'bird'], [/leaf|tree|oak|forest/i, 'leaf'], [/key/i, 'key'], [/bolt|lightning|spark/i, 'bolt'],
  [/crown|king|queen|royal/i, 'crown'], [/ship|boat|sail/i, 'ship'], [/bridge/i, 'bridge'], [/giant/i, 'giant'],
];
const SHAPE_KEYS = Object.keys(SHAPES) as ShapeKey[];

export function kitParts(c: Pick<ClubDef, 'id' | 'name' | 'crest'>): [ShapeKey, string] {
  if (MADE[c.name]) return MADE[c.name];
  const h = hashSeed('crest', c.id);
  const sym = WORDS.find(([re]) => re.test(c.crest))?.[1] ?? Object.keys(SYM)[h % Object.keys(SYM).length];
  return [SHAPE_KEYS[(h >>> 8) % SHAPE_KEYS.length], sym];
}

/** One crest from the kit of parts (board 11 `mk`). */
export function kitCrest(shape: ShapeKey, sym: string, colour: string, size: number, label?: string): string {
  const a = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  return `<svg class="fb-kc" style="--k:${colour}" width="${size}" height="${size}" viewBox="0 0 100 100" ${a}><path d="${SHAPES[shape]}" class="sh"/>${SYM[sym] ?? ''}</svg>`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const ring = (r = 42) => `<circle cx="50" cy="50" r="${r}" class="sh"/>`;
const shield = 'M18 12 H82 V48 Q82 78 50 92 Q18 78 18 48 Z';
// Board 11's eight drawn outlines; every other real club is its badge's shape and its letters.
const REAL: Record<string, string> = {
  Bayern: ring() + '<circle cx="50" cy="50" r="24" class="sy"/>' + [[38, 44], [50, 44], [38, 56], [50, 56]].map(([x, y]) => `<path d="M${x} ${y} l6 -6 l6 6 l-6 6 Z" class="sy"/>`).join(''),
  'Real Madrid': '<circle cx="50" cy="60" r="28" class="sh"/><path d="M28 26 L34 14 L42 22 L50 10 L58 22 L66 14 L72 26 Z" class="sy"/><path d="M34 78 L66 42" class="sy"/>',
  Barcelona: '<path d="M22 10 H78 V44 Q78 76 50 94 Q22 76 22 44 Z" class="sh"/><path d="M22 34 H78 M50 10 V34 M36 10 V34" class="sy"/><path d="M58 18 H70 M64 12 V28" class="sy"/><circle cx="50" cy="58" r="10" class="sy"/><path d="M38 46 V80 M62 46 V80" class="sy"/>',
  Juventus: '<path d="M34 8 H66 V70 Q66 92 46 92 Q30 92 28 78" class="sh"/><path d="M42 16 V82 M50 16 V86 M58 16 V82" class="sy"/>',
  Dortmund: ring() + '<text x="50" y="50" class="tx">BVB</text><text x="50" y="70" class="tx s">09</text>',
  'Man City': ring() + '<path d="M28 50 H72 L66 60 H34 Z M50 50 V28 L64 44 H50" class="sy"/><path d="M30 68 Q40 62 50 68 T70 68 M30 76 Q40 70 50 76 T70 76" class="sy"/>',
  Leeds: `<path d="${shield}" class="sh"/>` + Array.from({ length: 5 }, (_, i) => `<circle cx="${(50 + 11 * Math.cos(i * 1.2566 - 1.57)).toFixed(1)}" cy="${(46 + 11 * Math.sin(i * 1.2566 - 1.57)).toFixed(1)}" r="8" class="sy"/>`).join('') + '<circle cx="50" cy="46" r="5" class="sy"/>',
  Liverpool: '<path d="M22 20 H78 V50 Q78 78 50 92 Q22 78 22 50 Z" class="sh"/><path d="M38 66 Q38 44 50 40 Q56 30 64 34 L58 40 Q62 56 52 66 Z M30 30 Q26 50 32 70 M70 30 Q74 50 68 70" class="sy"/>',
};
const REAL_ALIAS: Record<string, string> = { 'Bayern Munich': 'Bayern', 'FC Bayern': 'Bayern', 'Borussia Dortmund': 'Dortmund', 'Manchester City': 'Man City', 'Leeds United': 'Leeds', 'FC Barcelona': 'Barcelona' };

/** A real club's simplified outline. */
export function realCrest(c: Pick<ClubDef, 'id' | 'name' | 'short' | 'crest' | 'colours'>, size: number): string {
  const key = REAL[c.name] ? c.name : REAL_ALIAS[c.name];
  const k = c.colours[0] ?? '#f3eee6';
  let g = key ? REAL[key] : '';
  if (!g) {
    const [shape] = kitParts(c);
    g = `<path d="${SHAPES[shape]}" class="sh"/><text x="50" y="${shape === 'banner' ? 52 : 58}" class="tx">${esc(c.short.slice(0, 3))}</text>`;
  }
  return `<svg class="fb-kc" style="--k:${k}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${g}</svg>`;
}

/** Any club's crest: real → outline, quirky or old → kit of parts, own → the chosen step. */
export function clubCrest(c: ClubDef, size: number, own?: { step: CrestStep; opt: CrestOptKey }): string {
  if (c.kind === 'own') return crestSvg(own?.step ?? 1, own?.opt ?? 'a', size);
  if (c.kind === 'real') return realCrest(c, size);
  const [shape, sym] = kitParts(c);
  return kitCrest(shape, sym, c.colours[0] ?? '#f3eee6', size);
}
