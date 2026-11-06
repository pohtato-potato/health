// Kits as SVG strings, ported from the round-3 kit board (build_kcs3 `kit`).
import { crestGroup, type CrestOptKey, type CrestStep } from './crest';

export const PATCH_CREAM = '#f3e7d3';
const WH = '#f3eee6';
const BK = '#141414';

export type Collar = 'crew' | 'v' | 'polo' | 'wrap';
export type Pattern = 'plain' | 'pin' | 'pinsparse' | 'bands' | 'geo' | 'sash' | 'hoops' | 'hoop1' | 'wave' | 'anniv' | 'weeks' | 'halves' | 'fade' | 'chevron' | 'tonal' | 'stripes' | 'yoke';
export type SponsorStyle = 'A' | 'B' | 'C' | 'R';
export interface KitDef {
  base: string;
  sleeve?: string;
  cuff: string;
  collar: Collar;
  collarC: string;
  side?: string;
  pattern: Pattern;
  backPattern?: Pattern;
  /** Pattern colours; `anniv` takes a list of band colours, `weeks` a list of [colour, width, hatched]. */
  a: string | string[] | [string, number, boolean][];
  b?: string;
  ink: string;
  sp: SponsorStyle;
  numEdge?: string;
  crest?: [CrestStep, CrestOptKey];
}

const FRONT = 'M76 18 Q100 34 124 18 L150 24 L186 54 L170 88 L148 76 L150 196 Q100 202 50 196 L52 76 L30 88 L14 54 L50 24 Z';
const BACK = 'M76 18 Q100 24 124 18 L150 24 L186 54 L170 88 L148 76 L150 196 Q100 202 50 196 L52 76 L30 88 L14 54 L50 24 Z';
const SLEEVES = 'M150 24 L186 54 L170 88 L148 76 Z M50 24 L14 54 L30 88 L52 76 Z';
const CUFFS = 'M186 54 L170 88 L163 85 L179 51 Z M14 54 L30 88 L37 85 L21 51 Z';
const NUMCLS: Record<SponsorStyle, string> = { A: 'n-a', B: 'n-b', C: 'n-c', R: 'n-r' };

let n = 0;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const range = (a: number, b: number, step: number) => { const o: number[] = []; for (let x = a; x < b; x += step) o.push(x); return o; };

function collar(kind: Collar, c: string, back: boolean): string {
  if (back) return `<path d="M76 18 Q100 26 124 18 L122 14 Q100 21 78 14 Z" fill="${c}"/>`;
  switch (kind) {
    case 'crew': return `<path d="M76 18 Q100 34 124 18 L120 15 Q100 28 80 15 Z" fill="${c}"/>`;
    case 'v': return `<path d="M78 18 L100 46 L122 18 L114 17 L100 36 L86 17 Z" fill="${c}"/>`;
    case 'polo': return `<path d="M76 18 L92 38 L100 28 L108 38 L124 18 L116 12 L100 22 L84 12 Z" fill="${c}"/><path d="M100 28 V52" stroke="${c}" stroke-width="3"/><circle cx="100" cy="38" r="1.8" fill="${WH}"/><circle cx="100" cy="47" r="1.8" fill="${WH}"/>`;
    case 'wrap': return `<path d="M78 17 L106 44 L112 39 L88 15 Z M122 17 L100 40 L95 35 L114 15 Z" fill="${c}"/>`;
  }
}

function body(p: Pattern, base: string, a: KitDef['a'], b = BK): string {
  let s = `<rect width="200" height="210" fill="${base}"/>`;
  const A = typeof a === 'string' ? a : BK;
  switch (p) {
    case 'pin': s += range(56, 148, 9).map((x) => `<rect x="${x}" width="1.6" height="210" fill="${A}"/>`).join(''); break;
    case 'pinsparse': s += range(60, 145, 16).map((x) => `<rect x="${x}" width="1.4" height="210" fill="${A}"/>`).join(''); break;
    case 'bands': s += `<rect y="128" width="200" height="5" fill="${A}"/><rect y="137" width="200" height="5" fill="${A}"/>`; break;
    case 'geo':
      s += range(0, 210, 18).map((x, i) => `<path d="M${x} 24 L${x + 18} 24 L${x + 9} 50 Z" fill="${i % 2 ? b : A}"/><path d="M${x + 9} 50 L${x + 27} 50 L${x + 18} 24 Z" fill="${i % 2 ? A : b}" opacity=".9"/>`).join('');
      s += `<rect y="50" width="200" height="4" fill="${A}"/>`;
      break;
    case 'sash': s += `<path d="M44 20 L74 20 L166 200 L136 200 Z" fill="${A}"/><path d="M44 20 L48 20 L140 200 L136 200 Z M70 20 L74 20 L166 200 L162 200 Z" fill="${b}"/>`; break;
    case 'hoops': for (const y of [92, 128, 164]) s += `<rect y="${y}" width="200" height="16" fill="${A}"/><rect y="${y + 18}" width="200" height="2" fill="${b}"/>`; break;
    case 'hoop1': s += `<rect y="86" width="200" height="30" fill="${A}"/><rect y="82" width="200" height="2" fill="${b}"/><rect y="118" width="200" height="2" fill="${b}"/>`; break;
    case 'wave':
      s += '<g fill="none" stroke-width="3">' + range(120, 200, 14).map((y, i) => `<path d="M0 ${y} q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" stroke="${i % 2 ? A : b}"/>`).join('') + '</g>';
      break;
    case 'anniv': {
      for (const y of range(40, 205, 22)) for (const x of range(((Math.floor(y / 22)) % 2) * 11 + 10, 200, 22))
        s += `<g transform="translate(${x} ${y}) scale(.32)" opacity=".16"><path d="M-10 12 V-6 M-3 8 V-16 M4 8 V-18 M11 10 V-12 M-18 2 L-10 12 Q0 22 13 12 L16 -2" stroke="#000" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
      (Array.isArray(a) ? (a as string[]) : []).forEach((col, i) => (s += `<rect y="${128 + i * 7}" width="200" height="5" fill="${col}"/>`));
      break;
    }
    case 'weeks': {
      let x = 52;
      for (const [col, w, hatch] of (Array.isArray(a) ? a : []) as [string, number, boolean][]) {
        s += `<rect x="${x.toFixed(1)}" width="${w.toFixed(1)}" height="210" fill="${col}"/>`;
        if (hatch) s += `<rect x="${x.toFixed(1)}" width="${w.toFixed(1)}" height="210" fill="url(#hatch-${n})"/>`;
        x += w;
      }
      break;
    }
    case 'halves': s += `<rect x="100" width="100" height="210" fill="${A}"/>`; break;
    case 'fade': s += `<defs><linearGradient id="fd-${n}" x2="0" y2="1"><stop offset=".35" stop-color="${base}"/><stop offset="1" stop-color="${A}"/></linearGradient></defs><rect width="200" height="210" fill="url(#fd-${n})"/>`; break;
    case 'chevron': s += `<path d="M40 70 L100 104 L160 70 V86 L100 120 L40 86 Z" fill="${A}"/>`; break;
    case 'tonal': s += range(52, 150, 16).map((x) => `<rect x="${x}" width="8" height="210" fill="#fff" opacity=".09"/>`).join(''); break;
    case 'stripes': s += range(58, 146, 24).map((x) => `<rect x="${x}" width="12" height="210" fill="${A}"/>`).join(''); break;
    case 'yoke': s += `<path d="M0 0 H200 V58 Q100 74 0 58 Z" fill="${A}"/><path d="M0 58 Q100 74 200 58 V63 Q100 79 0 63 Z" fill="${b}"/>`; break;
    case 'plain': break;
  }
  return s;
}

function sponsor(sp: SponsorStyle, c: string, text: string): string {
  const t = esc(text);
  switch (sp) {
    case 'A': return `<text x="100" y="112" class="sp-a" fill="${c}">${t.toUpperCase()}</text>`;
    case 'B': return `<rect x="66" y="96" width="68" height="22" rx="11" fill="${BK}" stroke="${c}" stroke-width="1.5"/><text x="100" y="112" class="sp-b" fill="${c}">${t.toUpperCase()}</text>`;
    case 'C': return `<text x="100" y="111" class="sp-c" fill="${c}">${t}</text>`;
    case 'R': return `<text x="100" y="112" class="sp-r" fill="${c}">${t.toUpperCase()}</text>`;
  }
}
const maker = (c: string) => `<g transform="translate(72 64)"><circle r="6.5" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M-4 1 q2 -3 4 0 t4 0" fill="none" stroke="${c}" stroke-width="1.6"/></g>`;

export interface KitOpts { sponsor?: string; patch?: { text: string }; name?: string; number?: number | string; label?: string }

/** A kit, front or back. The patch sits at (100, 82), between the badges and the sponsor, in cream. */
export function kitSvg(k: KitDef, view: 'front' | 'back', size: number, o: KitOpts = {}): string {
  n++;
  const c1 = `k${n}`, path = view === 'front' ? FRONT : BACK;
  const pat = view === 'back' ? k.backPattern ?? k.pattern : k.pattern;
  const parts = [
    `<defs><clipPath id="${c1}"><path d="${path}"/></clipPath><linearGradient id="${c1}g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>` +
      `<pattern id="hatch-${n}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="${WH}" stroke-width="1.2" opacity=".55"/></pattern></defs>`,
    `<g clip-path="url(#${c1})">${body(pat, k.base, k.a, k.b)}`,
  ];
  if (k.sleeve) parts.push(`<path d="${SLEEVES}" fill="${k.sleeve}"/>`);
  if (k.side) parts.push(`<path d="M52 78 L56 78 L56 200 L52 200 Z M148 78 L144 78 L144 200 L148 200 Z" fill="${k.side}"/>`);
  parts.push(`<path d="${CUFFS}" fill="${k.cuff}"/>`);
  parts.push(`<rect width="200" height="210" fill="url(#${c1}g)"/><path d="M80 60 Q86 120 78 196 M122 70 Q116 130 124 196" stroke="#fff" stroke-opacity=".07" stroke-width="5" fill="none"/></g>`);
  parts.push(collar(k.collar, k.collarC, view === 'back'));
  parts.push(`<path d="${path}" class="kedge"/>`);
  if (view === 'front') {
    const [s, op] = k.crest ?? [2, 'c'];
    parts.push(maker(k.ink), `<g transform="translate(117 53) scale(.22)" class="fb-crest onshirt" style="--k:${k.ink}">${crestGroup(s, op)}</g>`);
    if (o.patch) parts.push(`<g class="patch"><circle cx="100" cy="82" r="7" fill="none" stroke="${PATCH_CREAM}" stroke-width="1.6"/><text x="100" y="84.5" class="patch-t" fill="${PATCH_CREAM}">${esc(o.patch.text.slice(0, 3))}</text></g>`);
    if (o.sponsor) parts.push(sponsor(k.sp, k.ink, o.sponsor));
  } else {
    parts.push(`<text x="100" y="44" class="neck" fill="${k.ink}">${esc((o.name ?? 'BRABO UNITED').toUpperCase())}</text>`,
      `<text x="100" y="140" class="${NUMCLS[k.sp]}" fill="${k.ink}" stroke="${k.numEdge ?? 'none'}">${esc(String(o.number ?? 42))}</text>`);
  }
  const a = o.label ? `role="img" aria-label="${esc(o.label)}"` : 'aria-hidden="true"';
  return `<svg class="fb-kit" width="${size}" height="${Math.round(size * 1.05)}" viewBox="0 0 200 210" ${a}>${parts.join('')}</svg>`;
}

const OR = '#ff7a1a', PU = '#6c3fc4';
/** Board 9's three Brabo directions (home, away, third each). */
export const BRABO_KITS: Record<'A' | 'B' | 'C', KitDef[]> = {
  A: [
    { base: OR, sleeve: BK, cuff: PU, collar: 'crew', collarC: BK, side: PU, pattern: 'plain', a: OR, b: BK, ink: WH, sp: 'A', numEdge: BK },
    { base: BK, cuff: OR, collar: 'v', collarC: OR, pattern: 'pinsparse', a: OR, b: PU, ink: WH, sp: 'A', side: OR },
    { base: PU, cuff: BK, collar: 'crew', collarC: OR, pattern: 'bands', a: OR, b: BK, ink: WH, sp: 'A', side: BK },
  ],
  B: [
    { base: OR, cuff: BK, collar: 'polo', collarC: BK, pattern: 'geo', backPattern: 'plain', a: BK, b: PU, ink: WH, sp: 'B', numEdge: BK },
    { base: PU, cuff: OR, collar: 'polo', collarC: OR, pattern: 'sash', backPattern: 'plain', a: OR, b: BK, ink: WH, sp: 'B' },
    { base: BK, cuff: OR, collar: 'crew', collarC: PU, pattern: 'hoops', a: OR, b: PU, ink: WH, sp: 'B' },
  ],
  C: [
    { base: BK, cuff: OR, collar: 'wrap', collarC: PU, pattern: 'pin', a: OR, b: PU, ink: WH, sp: 'C' },
    { base: OR, cuff: BK, collar: 'v', collarC: BK, pattern: 'hoop1', backPattern: 'plain', a: PU, b: BK, ink: WH, sp: 'C', numEdge: BK },
    { base: PU, cuff: OR, collar: 'crew', collarC: OR, pattern: 'wave', backPattern: 'plain', a: OR, b: '#4c2a8e', ink: WH, sp: 'C' },
  ],
};
