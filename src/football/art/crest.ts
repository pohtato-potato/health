// Crests as SVG strings (spec §8.8, boards 9–11). Brabo's five steps come from the approved files;
// every other club is built from the crest kit: one of six outlines, a symbol, the club colour.
import type { ClubDef } from '../data/load';
import { WORLD_CLUBS } from '../data/world';
import { hashSeed } from '../rng';
import { CREST_STEPS } from './crestSteps';

let n = 0;
const uniq = (svg: string) => {
  n++;
  return svg.replace(/id="(\w+)"/g, `id="$1-${n}"`).replace(/href="#(\w+)"/g, `href="#$1-${n}"`).replace(/url\(#(\w+)\)/g, `url(#$1-${n})`);
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

/**
 * O41 3 (O42): every real club gets an original crest, never a copy of its badge: one of the six outlines, a field
 * divided in its second colour, and a symbol from the kit, all picked from its id. No letters and no drawn badge.
 */
export const FIELDS = {
  plain: '',
  band: '<path d="M0 40 H100 V60 H0 Z" class="fd"/>',
  pale: '<path d="M40 0 H60 V100 H40 Z" class="fd"/>',
  half: '<path d="M50 0 H100 V100 H50 Z" class="fd"/>',
  chief: '<path d="M0 0 H100 V30 H0 Z" class="fd"/>',
  sash: '<path d="M0 22 L22 0 L100 78 L78 100 Z" class="fd"/>',
  chevron: '<path d="M0 62 L50 34 L100 62 V84 L50 56 L0 84 Z" class="fd"/>',
  quarters: '<path d="M0 0 H50 V50 H0 Z M50 50 H100 V100 H50 Z" class="fd"/>',
  stripes: '<path d="M18 0 H30 V100 H18 Z M44 0 H56 V100 H44 Z M70 0 H82 V100 H70 Z" class="fd"/>',
} as const;
export type FieldKey = keyof typeof FIELDS;
const FIELD_KEYS = Object.keys(FIELDS) as FieldKey[];
const SYM_KEYS = Object.keys(SYM);

type Parts = { shape: ShapeKey; field: FieldKey; sym: string };
const partsAt = (h: number): Parts => ({ shape: SHAPE_KEYS[h % SHAPE_KEYS.length], field: FIELD_KEYS[(h >>> 4) % FIELD_KEYS.length], sym: SYM_KEYS[(h >>> 9) % SYM_KEYS.length] });
const partsKey = (p: Parts) => `${p.shape}:${p.field}:${p.sym}`;
let assigned: Map<string, Parts> | undefined;
/** world.json's clubs, in id order, each take the first design no club before them has: no two crests alike. */
function assignedParts(): Map<string, Parts> {
  if (assigned) return assigned;
  assigned = new Map();
  const used = new Set<string>();
  for (const id of WORLD_CLUBS.map((c) => c.id).sort()) {
    let p = partsAt(hashSeed('crest-original', id));
    for (let k = 1; used.has(partsKey(p)); k++) p = partsAt(hashSeed(`crest-original-${k}`, id));
    used.add(partsKey(p));
    assigned.set(id, p);
  }
  return assigned;
}
/** The parts of a real club's original crest. */
export function originalParts(c: Pick<ClubDef, 'id'>): Parts {
  return assignedParts().get(c.id) ?? partsAt(hashSeed('crest-original', c.id));
}

/** A real club's original crest (never its real badge). */
export function realCrest(c: Pick<ClubDef, 'id' | 'colours'>, size: number): string {
  const { shape, field, sym } = originalParts(c);
  const k = c.colours[0] ?? '#f3eee6';
  const k2 = c.colours[1] && c.colours[1].toLowerCase() !== k.toLowerCase() ? c.colours[1] : '#f3eee6';
  const fd = FIELDS[field] ? `<clipPath id="cl"><path d="${SHAPES[shape]}"/></clipPath><g clip-path="url(#cl)">${FIELDS[field]}</g>` : '';
  return uniq(`<svg class="fb-kc fb-oc" style="--k:${k};--k2:${k2}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><path d="${SHAPES[shape]}" class="sh"/>${fd}<path d="${SHAPES[shape]}" class="sh ln"/><g class="sb">${SYM[sym]}</g></svg>`);
}

/** Any club's crest: real → an original crest, quirky or old → kit of parts, own → the chosen step. */
export function clubCrest(c: ClubDef, size: number, own?: { step: CrestStep; opt: CrestOptKey }): string {
  if (c.kind === 'own') return crestSvg(own?.step ?? 1, own?.opt ?? 'a', size);
  if (c.kind === 'real') return realCrest(c, size);
  const [shape, sym] = kitParts(c);
  return kitCrest(shape, sym, c.colours[0] ?? '#f3eee6', size);
}
