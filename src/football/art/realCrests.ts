// Real clubs' crests (owner, 17 Nov): each is my own simplified line drawing of the club's real badge, made by
// looking at it, never its artwork. On the 100 × 100 grid: the badge's true outline, its one or two motifs anyone
// would know, its letters where it has them, in the club's colours. Bold enough to read at 28 px by silhouette.
// Colours: K and K2 are the club's two colours lifted for a dark page (outlines, motifs), C1 and C2 the same two as
// they are (fields inside an outline), I the ink, D the night.
// A few badges need a third colour of their own (Bayern's blue, Barcelona's yellow); those are written in place.

const K = 'var(--k)', K2 = 'var(--k2)', C1 = 'var(--c1)', C2 = 'var(--c2)', I = 'var(--fb-ink)', D = '#0d0a18', G = '#f2c14e';

/** A hex colour's relative luminance (0 black, 1 white). */
function lum(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const mix = (hex: string, t: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + 255 * t).toString(16).padStart(2, '0')).join('');
/**
 * A club colour that shows on the dark page: black and greys turn to ink, dark colours (navy, claret) are lifted
 * toward white until they read; bright colours stay as they are.
 */
export function onDark(hex: string | undefined): string {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return '#f3eee6';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  if (Math.max(r, g, b) - Math.min(r, g, b) < 24 && lum(hex) < 0.3) return '#f3eee6';
  let c = hex;
  for (let t = 0.15; lum(c) < 0.12 && t < 0.9; t += 0.1) c = mix(hex, t);
  return c;
}

let cid = 0;
/** A filled path. */
const P = (d: string, fill = I) => `<path d="${d}" style="fill:${fill}"/>`;
/** A stroked path. */
const S = (d: string, stroke = I, w = 4) => `<path d="${d}" style="fill:none;stroke:${stroke};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round"/>`;
const Cf = (cx: number, cy: number, r: number, fill = I) => `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:${fill}"/>`;
const Cs = (cx: number, cy: number, r: number, stroke = I, w = 4) => `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:none;stroke:${stroke};stroke-width:${w}"/>`;
const T = (s: string, x: number, y: number, size = 22, fill = I) => `<text x="${x}" y="${y}" class="tx" style="font-size:${size}px;fill:${fill}">${s}</text>`;
const g = (tr: string, inner: string) => `<g transform="${tr}">${inner}</g>`;
/** `inner` cut to the outline `d`. */
function clip(d: string, inner: string) {
  const id = `rc${++cid}`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}
/** A badge: the outline filled, its field cut to the outline, and the outline drawn again on top in the club colour. */
const badge = (d: string, fill: string, field = '', line = K, w = 5) => P(d, fill) + (field ? clip(d, field) : '') + S(d, line, w);

/** A circle as a path, so it can be clipped and outlined like any outline. */
const ring = (r = 44, cx = 50, cy = 50) => `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
/** Vertical stripes `w` wide from x0, every 2w. */
const vs = (x0: number, w: number, fill: string, y0 = 0, y1 = 100, x1 = 100) => { let d = ''; for (let x = x0; x < x1; x += 2 * w) d += `M${x} ${y0} h${w} V${y1} h${-w} Z`; return P(d, fill); };
const hs = (y0: number, w: number, fill: string, x0 = 0, x1 = 100) => { let d = ''; for (let y = y0; y < 100; y += 2 * w) d += `M${x0} ${y} H${x1} v${w} H${x0} Z`; return P(d, fill); };
const star = (cx: number, cy: number, r: number, fill = I, rot = 0) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = ((i * 36 + rot - 90) * Math.PI) / 180, rr = i % 2 ? r * 0.42 : r; return `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`; });
  return P(`M${pts.join(' L')} Z`, fill);
};
const ball = (cx: number, cy: number, r: number, ink = I, dark = D) => {
  const pent = Array.from({ length: 5 }, (_, i) => { const a = ((i * 72 - 90) * Math.PI) / 180; return `${(cx + r * 0.42 * Math.cos(a)).toFixed(1)} ${(cy + r * 0.42 * Math.sin(a)).toFixed(1)}`; });
  return Cf(cx, cy, r, ink) + P(`M${pent.join(' L')} Z`, dark) + Cs(cx, cy, r, dark, Math.max(1.5, r / 6));
};

/** A stroked path with square-cut ends (Juventus's bars). */
const Sb = (d: string, stroke = I, w = 4) => `<path d="${d}" style="fill:none;stroke:${stroke};stroke-width:${w};stroke-linejoin:round"/>`;
/** Words around a ring, as on a round badge: over the top, or along the bottom reading left to right. */
const arcText = (s: string, r: number, size: number, fill = I, bottom = false, cx = 50, cy = 50) => {
  const id = `rt${++cid}`;
  const d = `M${cx - r} ${cy} A${r} ${r} 0 0 ${bottom ? 0 : 1} ${cx + r} ${cy}`;
  return `<path id="${id}" d="${d}" style="fill:none"/><text class="tx" style="font-size:${size}px;fill:${fill}"><textPath href="#${id}" startOffset="50%">${s}</textPath></text>`;
};
/** A laurel leaf at (x, y) turned `a` degrees. */
const leaf = (x: number, y: number, a: number, fill = G) => g(`translate(${x} ${y}) rotate(${a})`, P('M-5 0 Q0 -3.5 5 0 Q0 3.5 -5 0 Z', fill));

// ---- outlines ----
const HEAT = 'M14 8 H86 V44 Q86 76 50 94 Q14 76 14 44 Z';
const HEATR = 'M22 8 H78 Q86 8 86 16 V48 Q86 78 50 94 Q14 78 14 48 V16 Q14 8 22 8 Z';
const OVAL = 'M50 4 C76 4 84 28 84 50 C84 74 74 96 50 96 C26 96 16 74 16 50 C16 28 24 4 50 4 Z';

// ---- figures (drawn in a 100 box, placed with g()) ----
/** Lion rampant, facing left. */
const LION = 'M 28 8 L 38 5 L 45 4 L 47 7 L 52 6 L 51 12 L 57 13 L 53 17 L 57 21 L 52 22 L 55 28 L 48 29 L 50 34 L 44 33 Q 49 40 53 48 L 55 56 Q 57 65 51 72 L 48 85 L 48 94 L 44 96 L 35 91 L 39 87 L 41 75 Q 41 67 39 64 L 30 63 L 21 65 L 13 69 L 7 68 L 8 62 L 14 63 L 20 58 Q 26 55 31 53 Q 28 48 29 42 L 21 37 L 14 36 L 12 31 L 17 29 L 25 33 L 31 34 L 34 29 L 27 22 L 20 16 L 21 10 L 26 13 L 31 18 L 35 19 L 28 16 L 31 14 L 27 9 Z M 54 55 Q 68 63 74 51 Q 79 43 86 41 L 93 36 L 93 44 L 87 43 Q 81 46 79 54 Q 72 71 53 61 Z';
/** The lion, filled and edged in its own colour so its legs and tail keep their weight when small. */
const lion = (fill: string) => P(LION, fill) + S(LION, fill, 3.5);
/** Eagle displayed, head turned left. */
const EAGLE = 'M46 16 L54 16 L56 24 L54 30 L62 34 L74 22 L92 12 L86 26 L94 30 L84 38 L90 44 L76 50 L62 50 L60 62 L68 76 L58 72 L54 86 L50 78 L46 86 L42 72 L32 76 L40 62 L38 50 L24 50 L10 44 L16 38 L6 30 L14 26 L8 12 L26 22 L38 34 L46 30 L44 24 L36 22 Z';
/** Two-headed eagle, wings spread. */
const EAGLE2 = 'M42 12 L34 16 L36 22 L42 22 L44 32 L50 36 L56 32 L58 22 L64 22 L66 16 L58 12 L54 22 L50 26 L46 22 Z M46 36 L30 32 L12 18 L16 34 L8 38 L20 46 L14 52 L30 56 L40 54 L42 66 L34 82 L46 74 L50 88 L54 74 L66 82 L58 66 L60 54 L70 56 L86 52 L80 46 L92 38 L84 34 L88 18 L70 32 L54 36 Z';
/** Two-headed eagle, wings folded (PAOK). */
const EAGLE2F = 'M40 10 L32 14 L34 20 L40 20 L42 30 L50 34 L58 30 L60 20 L66 20 L68 14 L60 10 L54 20 L50 24 L46 20 Z M42 34 L28 40 L24 66 L34 60 L32 76 L42 70 L44 88 L50 80 L56 88 L58 70 L68 76 L66 60 L76 66 L72 40 L58 34 Z';
/** Bat, wings spread, seen from the front. */
const BAT = 'M50 34 L46 24 L44 32 Q32 20 10 24 Q20 32 18 42 Q28 36 32 44 Q38 36 42 46 L50 52 L58 46 Q62 36 68 44 Q72 36 82 42 Q80 32 90 24 Q68 20 56 32 L54 24 Z';
const CROWN = 'M18 42 L12 12 L30 26 L50 4 L70 26 L88 12 L82 42 Z';
/** A bull charging right, head down. */
const BULL = 'M10 40 Q8 30 2 22 L6 20 Q14 28 16 34 Q30 26 50 28 Q58 18 68 26 L76 34 L84 30 L90 22 L89 34 L94 44 L94 56 L86 62 L80 58 L74 62 L80 72 L74 76 L64 64 L56 66 L50 64 L52 76 L46 78 L42 64 Q30 66 22 60 L12 74 L6 72 L14 56 Q8 50 10 40 Z';
/** A bull rearing, facing right. */
const BULLR = 'M30 94 L33 70 Q24 62 27 50 Q30 40 40 36 L52 30 Q56 22 64 20 L66 8 L70 6 L70 18 L76 10 L79 13 L74 22 L80 28 L84 38 L78 42 L72 38 L66 44 L74 50 L84 46 L86 52 L74 58 L64 54 L58 60 L66 68 L62 72 L52 64 L48 70 L52 94 L45 94 L40 76 L37 94 Z';
/** A horse rearing, facing left. */
const HORSER = 'M60 92 L56 72 Q44 68 42 56 L34 52 L24 40 L32 36 L38 42 L40 34 L28 26 L34 20 L44 28 L46 20 Q52 10 62 12 L70 6 L68 16 Q78 20 76 32 L66 30 L62 40 Q74 50 70 66 L78 90 L68 90 L64 74 L64 92 Z';
/** A horse standing, facing left (Suffolk Punch). */
const HORSE = 'M14 34 L12 26 L24 14 L26 8 L30 14 Q36 18 38 28 L44 38 H70 Q80 38 84 46 Q92 50 90 66 L86 66 L84 54 L82 56 L82 86 L76 86 L74 62 L70 62 L70 86 L64 86 L62 62 H46 L46 86 L40 86 L40 62 L36 62 L36 86 L30 86 L30 56 Q28 46 26 40 L20 36 Z';

// ---- the crests, keyed by club id ----
export const REAL_CRESTS: Record<string, string> = {
  // Division 1
  ars: badge('M12 6 H88 L84 56 Q78 86 50 96 Q22 86 16 56 Z', K, P('M0 30 H100 V34 H0 Z', G), G, 4) + T('Arsenal', 50, 26, 17, I) +
    P('M26 58 L82 46 Q88 45 88 50 Q88 55 82 55 L30 68 Z', G) + P('M80 44 H86 V57 H80 Z', G) +
    Cs(36, 70, 12, G, 3) + S('M36 58 V82 M24 70 H48 M28 62 L44 78 M44 62 L28 78', G, 2) + Cf(36, 70, 3, G),
  bay: Cf(50, 50, 46, K) + Cs(50, 50, 46, '#0066b2', 2) + arcText('FC BAYERN', 35, 13) + arcText('MÜNCHEN', 43, 13, I, true) + Cf(50, 50, 28, I) +
    clip(ring(26), [0, 1, 2, 3, 4, 5, 6, 7].flatMap((r) => [0, 1, 2, 3, 4, 5, 6, 7].filter((c) => (r + c) % 2 === 0).map((c) => `M${20 + c * 8} ${22 + r * 8} l4 -4 l4 4 l-4 4 Z`)).map((d) => P(d, '#0066b2')).join('')) + Cs(50, 50, 28, I, 3),
  psg: Cf(50, 50, 46, C1) + Cs(50, 50, 46, I, 2) + arcText('PARIS', 35, 13) + arcText('SAINT-GERMAIN', 43, 8.5, I, true) + Cf(50, 50, 30, I) +
    badge(ring(27), C1, P('M50 22 Q52 44 66 80 H56 Q52 64 50 62 Q48 64 44 80 H34 Q48 44 50 22 Z', '#da291c') + P('M41 52 H59 V56 H41 Z', '#da291c'), C1, 0.1) +
    P('M50 64 Q46 70 48 74 H52 Q54 70 50 64 Z', I),
  bar: badge('M10 6 Q30 14 50 10 Q70 14 90 6 Q88 22 92 40 Q94 56 80 74 Q66 88 50 96 Q34 88 20 74 Q6 56 8 40 Q12 22 10 6 Z', '#004d98',
    P('M0 0 H50 V38 H0 Z', I) + P('M25 0 H33 V38 H25 Z M0 18 H50 V25 H0 Z', '#d7262f') + P('M50 0 H100 V38 H50 Z', '#f2c14e') + vs(55, 6, '#d7262f', 0, 38) +
    P('M0 38 H100 V50 H0 Z', I) + vs(8, 10, '#a50044', 50, 100) + ball(50, 70, 9, '#f2c14e', '#7a5a10'), G, 5) + T('FCB', 50, 48, 11, D),
  mci: Cf(50, 50, 46, C2) + Cs(50, 50, 46, K, 2) + Cf(50, 50, 42, I) + arcText('MANCHESTER', 33, 11, C2) + arcText('CITY', 41, 11, C2, true) + T('18', 17, 54, 9, K) + T('94', 83, 54, 9, K) +
    badge('M33 26 H67 V54 Q67 70 50 78 Q33 70 33 54 Z', K, '', C2, 2.5) + P('M37 44 H63 L58 51 H42 Z', G) + P('M43 43 V28 L50 43 Z M52 43 V26 L60 43 Z', G) +
    S('M34 58 L66 52 M36 65 L65 59 M41 72 L60 68', I, 2) + Cf(50, 63, 5, '#c8102e'),
  rma: P('M28 30 Q28 14 50 12 Q72 14 72 30 Z', G) + P('M32 28 Q34 18 50 16 Q66 18 68 28 Z', '#d7262f') + S('M50 12 V30 M38 15 Q40 22 40 30 M62 15 Q60 22 60 30', G, 2) +
    S('M50 4 V12 M46 7 H54', G, 2.5) + P('M26 28 H74 V34 H26 Z', G) +
    badge(ring(29, 50, 65), I, P('M18 42 L28 34 L86 90 L76 98 Z', '#3a3a9a'), G, 4) +
    S('M31 56 L35 43 L50 58 L65 43 L69 56', G, 3.5) + S('M68 70 A18 18 0 1 0 63 82', G, 3.5) + S('M50 58 V88 M50 67 H61 M50 76 H58', G, 3),
  bri: Cf(50, 50, 46, I) + Cs(50, 50, 46, K, 3) + arcText('BRIGHTON &amp; HOVE', 36, 9, K) + arcText('ALBION', 43, 9, K, true) + Cf(50, 50, 30, K) +
    P('M10 52 Q26 42 40 48 L58 46 Q66 40 74 40 Q80 40 84 44 L92 46 L84 48 Q78 50 72 52 Q60 58 44 58 Q30 58 10 52 Z', I) + P('M40 48 Q48 30 66 26 Q58 36 56 46 Z', I) +
    S('M10 52 Q26 42 40 48 L58 46 Q66 40 74 40 Q80 40 84 44 L92 46 L84 48 Q78 50 72 52 Q60 58 44 58 Q30 58 10 52 Z', K, 1.2) + Cf(77, 43, 1.4, D),
  liv: P('M24 20 L36 14 Q40 8 46 8 L44 12 L50 12 L46 16 Q48 22 44 30 Q42 38 46 44 Q52 34 58 26 Q64 16 74 8 Q72 16 76 18 Q72 22 80 24 Q74 28 80 32 Q70 36 68 44 Q74 56 72 68 L80 78 L70 76 L62 70 Q58 72 54 72 L56 86 L62 90 H48 L48 72 Q44 72 42 70 L40 86 L44 90 H32 L34 70 Q30 60 32 48 Q34 36 36 28 L34 24 L24 22 Z', K) +
    S('M24 22 Q20 30 24 38 Q20 44 24 50', K, 2.5) + leaf(19, 32, -40, K) + leaf(26, 42, 40, K) + Cf(40, 15, 1.6, D),
  int: Cf(50, 50, 46, D) + Cs(50, 50, 46, I, 2) + Cf(50, 50, 39, I) + Cf(50, 50, 35, K) +
    S('M29 30 Q21 50 29 70 M40 28 V72 M40 30 L60 70 M60 28 V72 M71 30 Q79 50 71 70', D, 10) + S('M29 30 Q21 50 29 70 M40 28 V72 M40 30 L60 70 M60 28 V72 M71 30 Q79 50 71 70', I, 5),
  bou: badge('M14 10 Q50 4 86 10 V52 Q86 80 50 94 Q14 80 14 52 Z', K,
    P('M0 0 H100 V22 H0 Z', D) + vs(64, 6, D, 22, 100) +
    P('M14 98 L16 72 Q12 60 18 50 Q24 38 36 36 Q46 36 48 44 L50 48 L54 54 L50 56 L52 60 L48 62 Q50 68 46 72 L40 74 L42 82 Q36 86 34 98 Z', I), I, 2) +
    T('AFC BOURNEMOUTH', 50, 19, 7, G) + ball(50, 30, 8),
  avl: badge('M12 8 H88 L84 60 Q80 86 50 94 Q20 86 16 60 Z', C2, P('M0 66 Q50 82 100 66 V100 H0 Z', K), K, 5) +
    g('translate(18 8) scale(0.62)', lion('#f5d130')) + star(24, 18, 5, I) + T('ASTON VILLA', 50, 85, 9, I),
  che: g('translate(8 2) scale(0.92)', lion(K)) + Sb('M22 10 V96', K, 4) + S('M22 10 Q20 2 28 3 Q34 6 29 12', K, 3),

  // Division 2
  'ct-ben': P('M48 26 Q36 6 4 10 Q14 14 10 17 Q22 18 16 22 Q28 22 24 26 Q36 24 46 32 Z', G) + g('matrix(-1 0 0 1 100 0)', P('M48 26 Q36 6 4 10 Q14 14 10 17 Q22 18 16 22 Q28 22 24 26 Q36 24 46 32 Z', G)) +
    P('M43 32 Q41 18 45 12 Q50 5 56 9 L54 14 Q58 22 57 32 Z', G) + P('M46 11 L39 13 L46 16 Z', G) + Cf(49, 11, 1.2, D) +
    S('M16 38 Q50 28 84 38', K, 6) + S('M16 38 L10 42 M84 38 L90 42', '#2f8a3a', 5) + Cs(50, 64, 28, '#b8b8b8', 6) +
    badge('M36 44 H64 V62 Q64 78 50 86 Q36 78 36 62 Z', I, P('M0 0 H100 V60 H0 Z', K) + P('M30 82 L70 50 L70 60 L36 90 Z', '#1f4fa0'), I, 2),
  bvb: Cf(50, 50, 46, K) + Cs(50, 50, 40, D, 5) + T('B', 28, 64, 36, D) + T('V', 50, 44, 26, D) + T('B', 72, 64, 36, D) + T('09', 50, 84, 18, D),
  'ct-bru': badge(ring(36, 50, 56), D, P('M0 60 L60 0 H70 L0 70 Z M0 84 L84 0 H94 L0 94 Z M14 100 L100 14 V24 L24 100 Z', K)) + Cs(50, 56, 28, I, 3) + P('M30 22 L26 6 L40 14 L50 2 L60 14 L74 6 L70 22 Z', G),
  com: P('M40 2 H60 V28 H98 V48 H60 V98 H40 V48 H2 V28 H40 Z', K) + badge('M22 20 H78 V58 Q78 82 50 92 Q22 82 22 58 Z', I, '', K, 4) +
    T('1907', 50, 36, 11, K) + T('COMO', 50, 56, 17, K) + S('M30 70 Q40 64 50 70 T70 70 M34 79 Q42 74 50 79 T66 79', K, 3),
  eve: badge('M14 8 H86 V56 Q86 82 50 94 Q14 82 14 56 Z', C1, '', I, 4) +
    P('M38 40 H62 V66 H38 Z', I) + P('M35 38 H65 V42 H35 Z', I) + P('M37 38 Q38 24 50 16 Q62 24 63 38 Z', I) + S('M50 16 V8', I, 3) +
    P('M46 66 V58 Q50 53 54 58 V66 Z M47 44 h6 v7 h-6 Z', C1) +
    leaf(20, 30, -70, I) + leaf(22, 22, -30, I) + leaf(29, 18, 10, I) + leaf(80, 30, 70, I) + leaf(78, 22, 30, I) + leaf(71, 18, -10, I) +
    T('Everton', 50, 78, 12, I) + P('M4 74 Q50 96 96 74 L92 86 Q50 106 8 86 Z', I) + T('1878', 50, 92, 7, C1),
  tot: Cf(44, 12, 5, I) + P('M39 10 L32 13 L39 15 Z', I) + P('M40 7 L42 1 L45 6 L48 1 L49 7 Z', I) + P('M41 16 Q39 22 43 21 Z', I) +
    P('M41 14 Q36 28 42 38 Q44 52 56 54 Q66 52 66 42 Q64 32 54 30 Q48 26 48 12 Z', I) +
    P('M62 32 Q76 28 80 40 Q84 52 78 64 Q76 54 70 48 Q72 58 68 64 Q66 54 60 50 Z', I) + Cf(43, 11, 1.3, D) +
    S('M51 53 L50 69 M58 53 L59 69', I, 3) + Cf(54, 82, 13, I) + S('M41 82 H67 M54 69 Q46 82 54 95 M54 69 Q62 82 54 95', '#132257', 2),
  usg: Cs(32, 60, 24, K2, 8) + Cs(68, 60, 24, K, 8) + T('S', 50, 70, 30, K) + P('M30 34 L26 18 L38 24 L50 14 L62 24 L74 18 L70 34 Z', K) + S('M50 4 V14 M46 8 H54', K, 2.5),
  atm: badge('M14 8 H86 V44 Q86 74 50 96 Q14 74 14 44 Z', I, vs(14, 10, K) + P('M0 0 H100 V22 H58 Q46 46 0 68 Z', '#272e61')) +
    star(52, 15, 3.5, I) + star(66, 15, 3.5, I) + star(80, 15, 3.5, I) + star(20, 52, 3.5, I) + star(30, 60, 3.5, I) +
    Cf(32, 34, 13, I) + Cf(30, 30, 6, '#3a9a5a') + P('M29 34 h3 v10 h-3 Z', '#8a5a2a') + P('M34 44 L35 36 L38 32 L40 34 L42 30 L44 34 L43 44 Z', D),
  bre: Cf(50, 50, 44, K) + Cs(50, 50, 32, I, 3) + Cf(50, 50, 30, I) +
    P('M50 32 Q60 34 60 50 Q60 70 50 74 Q40 70 40 50 Q40 34 50 32 Z', G) + P('M41 46 H59 V52 H41 Z M41 58 H59 V64 H41 Z', D) + Cf(50, 30, 6, D) +
    `<ellipse cx="34" cy="42" rx="12" ry="7" style="fill:#cfe6f5;stroke:${D};stroke-width:1.5"/><ellipse cx="66" cy="42" rx="12" ry="7" style="fill:#cfe6f5;stroke:${D};stroke-width:1.5"/>`,
  rom: badge('M14 22 Q14 8 30 6 Q50 2 70 6 Q86 8 86 22 V50 Q84 78 50 96 Q16 78 14 50 Z', C1,
    P('M0 0 H100 V60 H0 Z', K2) + P('M12 38 L18 32 L20 25 L23 30 L26 25 L27 32 Q34 32 40 36 Q52 34 66 34 Q78 34 82 42 Q88 50 86 62 L84 62 Q84 54 80 50 L80 60 L77 60 L76 50 L73 50 L71 60 L68 60 L68 48 Q56 50 46 48 L44 60 L41 60 L41 48 L38 48 L36 60 L33 60 L34 46 Q28 44 24 42 L14 42 Z', C1) +
    Cf(51, 51, 2.5, C1) + P('M49 53 Q54 52 56 58 H48 Z', C1) + Cf(60, 51, 2.5, C1) + P('M58 53 Q63 52 65 58 H57 Z', C1), K2, 4) + T('ROMA', 50, 78, 17, K2) + T('1927', 50, 89, 8, K2),
  lee: badge('M12 8 Q50 2 88 8 V50 Q88 78 50 96 Q12 78 12 50 Z', C2,
    [0, 1, 2, 3, 4].map((k) => P(`M0 ${40 + 13 * k} L44 ${58 + 13 * k} V${64 + 13 * k} L0 ${46 + 13 * k} Z M100 ${40 + 13 * k} L56 ${58 + 13 * k} V${64 + 13 * k} L100 ${46 + 13 * k} Z`, '#ffcd00')).join('') +
    P('M43 40 H57 V100 H43 Z', I), '#ffcd00', 5) +
    [0, 72, 144, 216, 288].map((a) => Cf(50 + 7 * Math.cos(((a - 90) * Math.PI) / 180), 24 + 7 * Math.sin(((a - 90) * Math.PI) / 180), 5.5, I)).join('') + Cf(50, 24, 3, G) +
    T('L', 50, 52, 9, C2) + T('U', 50, 63, 9, C2) + T('F', 50, 74, 9, C2) + T('C', 50, 85, 9, C2),
  'ct-spo': T('SCP', 50, 24, 26, K) + badge('M20 30 Q28 24 36 30 Q43 24 50 30 Q57 24 64 30 Q72 24 80 30 V58 Q80 84 50 94 Q20 84 20 58 Z', I, '', K, 4) +
    g('translate(76 34) scale(-0.52 0.52)', lion(K)),

  // Division 3
  new: P('M4 72 Q50 92 96 72 L92 86 Q50 102 8 86 Z', '#5aa9e6') +
    badge('M30 26 H70 V62 Q70 80 50 88 Q30 80 30 62 Z', I, vs(30, 8, D)) + P('M38 18 H62 V26 H38 Z M40 12 h6 v6 h-6 Z M54 12 h6 v6 h-6 Z', I) +
    P('M28 30 Q14 22 18 10 Q24 16 26 12 Q30 22 30 34 Q20 46 24 64 Q12 50 16 38 Z', I) + P('M72 30 Q86 22 82 10 Q76 16 74 12 Q70 22 70 34 Q80 46 76 64 Q88 50 84 38 Z', I),
  mun: P('M30 4 L37 12 Q43 9 49 12 L56 4 L52 16 Q53 24 47 29 L49 31 L58 33 L68 29 L72 27 L74 33 L62 40 L58 46 L57 56 L60 60 L64 74 L66 86 L72 92 L60 94 L58 88 L54 74 L50 64 L44 74 L40 86 L44 92 L30 94 L34 86 L36 72 L40 60 L42 54 L40 44 L36 42 L24 40 L19 32 L22 30 L28 36 L40 33 L38 29 Q33 25 34 18 L33 14 Z', K) +
    S('M42 60 Q20 64 18 78 Q18 86 25 86', K, 3.5) + P('M20 82 L32 83 L24 92 Z', K) + Sb('M74 12 V94', K, 4) + S('M66 4 V12 Q74 18 82 12 V4 M74 2 V14', K, 3.5) + Cf(41, 18, 1.6, D),
  'ct-por': badge('M18 34 H82 V60 Q82 84 50 94 Q18 84 18 60 Z', I, P('M50 34 H100 V64 H50 Z M0 64 H50 V100 H0 Z', K)) + ball(50, 66, 14, I, K) +
    P('M30 34 Q30 18 44 14 L42 6 L52 12 Q64 8 70 18 L80 10 L76 24 Q72 30 62 30 L66 34 Z', '#3a9a5a'),
  nfo: P('M50 12 Q64 12 66 24 Q78 26 76 38 Q86 44 78 54 Q74 60 64 58 H36 Q26 60 22 54 Q14 44 24 38 Q22 26 34 24 Q36 12 50 12 Z', K) + P('M46 56 H54 L56 70 H44 Z', K) +
    S('M22 76 Q36 70 50 76 T78 76 M26 84 Q38 78 50 84 T74 84', K, 4) + star(36, 4, 4, K) + star(64, 4, 4, K),
  ful: badge('M14 10 Q50 2 86 10 V46 Q86 76 50 94 Q14 76 14 46 Z', I, '', I, 6) + S('M14 10 Q50 2 86 10 V46 Q86 76 50 94 Q14 76 14 46 Z', D, 2) +
    P('M30 20 H70 V30 H44 V40 H62 V50 H44 V60 H70 V70 H44 V84 H30 Z', D) + P('M44 40 H62 V50 H44 Z', '#d7262f'),
  lev: P('M10 30 L22 18 L26 26 L20 40 L28 58 L20 70 L12 62 L16 50 Z M90 30 L78 18 L74 26 L80 40 L72 58 L80 70 L88 62 L84 50 Z', K) +
    Cf(50, 44, 26, I) + Cs(50, 44, 26, D, 4) + S('M30 44 H70 M50 24 V64', D, 5) + T('1904', 50, 14, 12, K) + P('M14 74 H86 L80 90 H20 Z', K) + T('LEVERKUSEN', 50, 86, 9, I),
  bod: Cf(50, 50, 46, K) + Cf(50, 50, 42, D) + Cf(50, 50, 38, K) + Cs(50, 50, 33, D, 2) +
    S('M64 26 A28 28 0 1 0 78 50 H60', D, 8) + ball(73, 33, 7, I, D) + P('M16 58 H84 V72 H16 Z', D) + T('BODØ 1916', 50, 69, 12, K),
  rbl: g('translate(-2 18) scale(0.52)', P(BULL, K)) + g('translate(102 18) scale(-0.52 0.52)', P(BULL, K)) + Cf(50, 30, 10, '#ffcc00') + T('RB', 50, 82, 20, I),
  juv: Sb('M41 4 V58 Q41 80 18 88', I, 11) + P('M16 4 H46 V13 H16 Z', I) + Sb('M73 4 V62 Q73 90 40 96', I, 12),
  vfb: badge('M14 12 Q32 4 50 12 Q68 4 86 12 V50 Q86 80 50 94 Q14 80 14 50 Z', I, P('M0 54 H100 V100 H0 Z', '#f2c14e')) + T('VfB', 50, 44, 30, K) +
    S('M28 64 Q50 60 72 64 M34 63 V57 M44 62 V55 M56 62 V55 M66 63 V57 M32 74 Q50 70 68 74 M38 73 V67 M50 72 V65 M62 73 V67 M38 84 Q50 81 62 84 M44 83 V78 M56 83 V78', D, 3),
  bet: g('translate(30 2) scale(0.4)', P(CROWN, G)) +
    badge('M18 22 Q34 18 50 22 Q66 18 82 22 V54 Q82 82 50 94 Q18 82 18 54 Z', I, vs(18, 9, K)) + Cf(50, 56, 15, I) + Cs(50, 56, 15, K, 3) + T('B', 50, 64, 22, K),

  // Division 4
  'ct-psv': badge('M8 56 C8 36 30 28 50 28 C70 28 92 36 92 56 C92 76 70 84 50 84 C30 84 8 76 8 56 Z', I, hs(30, 8, K)) +
    P('M30 46 H70 V66 H30 Z', I) + T('PSV', 50, 64, 20, K) + star(40, 16, 5, G) + star(60, 16, 5, G),
  laz: P('M50 14 L54 22 L52 30 L60 30 Q74 18 98 14 Q86 26 90 30 Q78 34 66 42 L58 46 L42 46 L34 42 Q22 34 10 30 Q14 26 2 14 Q26 18 40 30 L48 30 L46 22 Z', G) +
    badge('M36 50 H64 V68 Q64 82 50 90 Q36 82 36 68 Z', K, '', I, 3) + T('SSL', 50, 70, 10, D),
  scf: badge('M50 4 C74 4 84 26 84 50 C84 76 72 96 50 96 C28 96 16 76 16 50 C16 26 26 4 50 4 Z', I, P('M0 0 Q60 40 50 100 H0 Z', D)) +
    P('M18 30 Q30 18 42 26 L52 30 L42 34 L40 44 Q32 40 30 52 L24 42 Z', I) + T('SF', 64, 72, 22, D) + S('M16 50 C16 26 26 4 50 4 C74 4 84 26 84 50 C84 76 72 96 50 96 C28 96 16 76 16 50 Z', K, 4),
  ips: badge('M12 8 H88 V58 Q88 84 50 94 Q12 84 12 58 Z', K, P('M0 8 H100 V20 H0 Z', I) + S('M10 76 Q30 70 50 76 T90 76', I, 4)) + g('translate(12 18) scale(0.76)', P(HORSE, I)) + P('M44 22 H56 V32 H44 Z', '#d7262f'),
  sun: badge('M30 20 H70 V56 Q70 78 50 88 Q30 78 30 56 Z', I, vs(30, 8, K)) +
    g('translate(31 26) scale(-0.3 0.56)', lion(I)) + g('translate(69 26) scale(0.3 0.56)', lion(I)) + P('M38 20 L36 10 L44 14 L50 6 L56 14 L64 10 L62 20 Z', I),
  hul: badge('M14 10 Q50 4 86 10 V54 Q86 82 50 94 Q14 82 14 54 Z', K, P('M0 0 H100 V24 H0 Z', D)) + T('HULL CITY', 50, 20, 11, K) +
    P('M28 38 Q24 26 32 26 Q38 26 40 31 Q50 27 60 31 Q62 26 68 26 Q76 26 72 38 Q82 50 78 64 Q72 82 50 86 Q28 82 22 64 Q18 50 28 38 Z', '#e8891c') +
    S('M28 38 Q24 26 32 26 Q38 26 40 31 Q50 27 60 31 Q62 26 68 26 Q76 26 72 38 Q82 50 78 64 Q72 82 50 86 Q28 82 22 64 Q18 50 28 38 Z', D, 2.5) +
    P('M34 56 Q50 48 66 56 Q68 74 50 84 Q32 74 34 56 Z', I) + P('M38 60 Q50 56 62 60 L60 72 Q50 80 40 72 Z', D) + P('M43 71 Q50 66 57 71 Q50 76 43 71 Z', '#c8323a') +
    P('M40 61 L43 68 L46 60 Z M54 60 L57 68 L60 61 Z', I) + P('M44 50 H56 L50 57 Z', D) + P('M33 42 L45 46 L36 48 Z M67 42 L55 46 L64 48 Z', '#f2c14e') + S('M33 42 L45 46 L36 48 Z M67 42 L55 46 L64 48 Z', D, 1.5) +
    S('M50 29 V39 M44 31 Q46 36 44 40 M56 31 Q54 36 56 40 M38 34 Q42 38 40 42 M62 34 Q58 38 60 42 M23 50 Q30 52 32 56 M22 60 Q28 60 32 63 M77 50 Q70 52 68 56 M78 60 Q72 60 68 63 M28 70 Q32 70 36 74 M72 70 Q68 70 64 74', D, 2.8),
  'ct-gal': S('M78 42 A30 30 0 1 0 80 58 H54', K, 12) + P('M28 56 A24 24 0 0 0 76 64', K2) +
    T('S', 50, 64, 22, I) + star(22, 10, 5, G) + star(36, 6, 5, G) + star(50, 4, 5, G) + star(64, 6, 5, G) + star(78, 10, 5, G),
  cov: Cf(50, 50, 44, K) + Cs(50, 50, 44, I, 3) +
    P('M28 54 Q28 40 42 38 H66 Q78 38 78 54 V74 H70 V62 H64 V74 H56 V62 H48 V74 H40 V60 Q34 60 32 66 Q30 76 24 76 Q18 74 20 68 L24 70 Q28 64 28 54 Z', I) + P('M34 44 Q28 52 34 58 Q40 54 40 46 Z', K) + Cf(32, 48, 2, D) + S('M30 60 L24 62', I, 2.5) +
    P('M44 22 H68 V38 H44 Z M44 16 h5 v6 h-5 Z M53.5 16 h5 v6 h-5 Z M63 16 h5 v6 h-5 Z', I) + ball(62, 84, 8, I, K),
  acm: P(OVAL, D) + clip('M50 10 C72 10 78 30 78 50 C78 72 70 90 50 90 C30 90 22 72 22 50 C22 30 28 10 50 10 Z',
    P('M0 0 H100 V100 H0 Z', I) + P('M0 30 H50 V76 H0 Z', D) + vs(22, 7, K, 30, 76, 50) + P('M64 30 H72 V76 H64 Z M50 48 H100 V56 H50 Z', K)) +
    S('M50 10 C72 10 78 30 78 50 C78 72 70 90 50 90 C30 90 22 72 22 50 C22 30 28 10 50 10 Z', D, 2) + S(OVAL, K, 4) + T('ACM', 50, 27, 15, D) + T('1899', 50, 88, 10, D),
  nap: Cf(50, 50, 44, K) + Cs(50, 50, 36, I, 4) + P('M32 30 H40 L60 58 V30 H68 V72 H60 L40 44 V72 H32 Z', I),
  cry: P('M8 84 Q50 98 92 84 L88 94 Q50 104 12 94 Z', K) + S('M18 84 V64 Q18 56 26 56 H74 Q82 56 82 64 V84 M30 84 V66 M42 84 V66 M58 84 V66 M70 84 V66', I, 2.5) +
    g('translate(20 0) scale(0.6)', P(EAGLE, K)) + ball(50, 66, 8, I, K2),
  asm: P('M26 22 L22 8 L34 14 L42 6 L50 12 L58 6 L66 14 L78 8 L74 22 Z', G) + S('M50 2 V8 M47 4 H53', G, 2) +
    badge('M20 24 H80 V58 Q80 82 50 94 Q20 82 20 58 Z', I, vs(20, 12, K, 36, 100) + P('M20 36 L26 42 L32 36 Z M44 36 L50 42 L56 36 Z M68 36 L74 42 L80 36 Z', K), G, 4) + T('ASMONACOFC', 50, 33, 8, K),

  // Division 5
  'ct-sla': badge(ring(40, 50, 52), I, P('M0 0 H50 V100 H0 Z', K)) + star(54, 52, 34, I, 15) + star(54, 52, 29, K, 15),
  vil: Cf(50, 58, 40, K2) + Cs(50, 58, 40, I, 2.5) +
    badge('M28 34 H72 V58 Q72 78 50 90 Q28 78 28 58 Z', K, vs(32, 6, '#d7262f', 34, 100), K, 1) + P('M30 34 H44 L50 70 L56 34 H70 L54 92 H46 Z', D) +
    T('C', 22, 70, 22, D) + T('F', 78, 70, 22, D) +
    P('M26 30 L22 14 L34 20 L42 10 L50 16 L58 10 L66 20 L78 14 L74 30 Z', G) + Cf(22, 13, 2.5, '#d7262f') + Cf(42, 9, 2.5, '#d7262f') + Cf(58, 9, 2.5, '#d7262f') + Cf(78, 13, 2.5, '#d7262f') + S('M50 16 V6 M47 9 H53', G, 2),
  losc: badge('M50 6 L90 34 L76 90 H24 L10 34 Z', C2, P('M0 66 H100 V100 H0 Z', K)) +
    P('M28 62 L30 42 Q28 30 34 20 L42 32 Q54 28 64 34 L76 42 Q82 48 76 54 L66 56 L64 62 Z', I) + Cf(56, 40, 2.5, D) + T('LOSC', 50, 84, 16, I),
  'ct-oly': Cf(50, 50, 44, I) + Cs(50, 50, 44, K, 4) + Cs(50, 50, 34, K, 2) +
    P('M58 26 Q42 24 40 38 L34 46 L40 48 L40 54 L44 56 L42 60 Q46 66 54 64 L56 76 H66 Q62 66 66 56 Q72 42 66 32 Q64 28 58 26 Z', K) +
    S('M38 30 Q48 18 64 22 M36 36 Q30 30 34 22 M66 24 Q72 18 74 26', K, 3) + star(30, 6, 3, G) + star(50, 3, 3, G) + star(70, 6, 3, G),
  'ct-fen': Cf(50, 50, 44, I) + Cs(50, 50, 44, K2, 4) + Cs(50, 50, 32, K2, 2) +
    badge('M30 26 H70 V50 Q70 70 50 78 Q30 70 30 50 Z', I, hs(26, 6, K) + P('M0 32 H100 V38 H0 Z M0 44 H100 V50 H0 Z', K2)) + P('M50 74 Q40 62 46 52 Q50 60 54 52 Q60 62 50 74 Z', '#2f8a3a'),
  ol: badge('M10 6 H90 V64 Q90 72 80 74 Q62 76 50 94 Q38 76 20 74 Q10 72 10 64 Z', '#2552a8',
    P('M0 0 H100 V32 H0 Z', '#da0812'), '#c9a24a', 4) + T('OLYMPIQUE', 50, 18, 11, I) + T('LYONNAIS', 50, 29, 11, I) +
    Cf(32, 54, 13, I) + g('translate(23 44) scale(0.19)', lion('#c9a24a')) + P('M54 40 H64 V64 H78 V72 H54 Z', I),
  fer: Cf(50, 50, 44, I) + Cs(50, 50, 44, K, 4) + Cs(50, 50, 32, K, 2) + badge('M32 26 H68 V54 Q68 72 50 80 Q32 72 32 54 Z', I, vs(32, 6, K)) + T('FTC', 50, 22, 10, K),
  aja: Cf(50, 50, 45, I) + Cs(50, 50, 45, D, 3) + Cs(50, 50, 41, D, 1.5) + g('rotate(-62 50 50)', arcText('AJAX', 36, 11, D)) +
    P('M30 42 Q30 22 50 16 Q70 16 76 32 L74 54 Q66 50 60 54 L58 44 Q46 38 30 42 Z', D) + S('M50 16 Q66 4 84 16 Q90 26 86 38', D, 6) +
    S('M30 42 L29 47 L22 55 L28 57 L27 61 Q26 66 30 70', D, 2.5) + S('M32 48 L37 48', D, 2) +
    P('M30 68 Q28 80 38 86 Q50 90 58 80 Q62 70 60 56 Q54 60 50 64 Q42 66 36 64 Z', D) + S('M36 72 Q40 76 38 80 M44 70 Q48 76 46 82 M52 68 Q56 74 54 80', I, 2) + S('M58 80 Q62 88 72 90', D, 2.5) +
    P('M74 58 H88 V68 Q88 74 81 78 Q74 74 74 68 Z', I) + P('M81 58 H88 V68 Q88 74 81 78 Z', '#d2122e') + S('M74 58 H88 V68 Q88 74 81 78 Q74 74 74 68 Z', D, 1.5),
  rcl: P('M18 4 H82 V16 H18 Z', I) + badge('M14 14 H86 V54 Q86 82 50 94 Q14 82 14 54 Z', K2, P('M50 0 H100 V100 H50 Z', K)) +
    T('R', 32, 44, 20, I) + T('C', 32, 64, 20, I) + T('L', 32, 84, 20, I) + P('M62 40 L60 80 H76 L74 40 Z M62 30 H74 V40 H62 Z M60 30 L68 22 L76 30 Z', D) + P('M64 33 h8 v4 h-8 Z', I),
  bol: badge(OVAL, I, P('M0 0 H100 V26 H0 Z', D) + P('M0 26 H50 V100 H0 Z', K) + vs(16, 8, K2, 26, 100, 50) + P('M58 26 H66 V100 H58 Z M50 52 H100 V60 H50 Z', K2)) + T('BFC', 50, 22, 16, I),
  om: Cf(50, 50, 47, I) + Cs(50, 50, 42, K, 7) + Cf(50, 50, 34, K) +
    S('M30 30 Q23 50 30 72', I, 7) + S('M70 30 Q77 50 70 72', I, 7) + P('M40 18 L50 56 L60 18 Z', I) + S('M42 82 L44 62 M58 82 L56 62', I, 5),
  rso: S('M18 30 L78 92', '#c9a24a', 4) + P('M24 36 Q50 30 60 46 L84 68 Q70 80 56 70 L34 52 Z', I) + clip('M24 36 Q50 30 60 46 L84 68 Q70 80 56 70 L34 52 Z', hs(36, 6, K)) +
    ball(48, 40, 14, '#b06a2a', '#5a3a1a') + P('M34 24 L30 8 L42 14 L50 4 L58 14 L70 8 L66 24 Z', G),

  // Division 6
  twe: badge('M14 12 Q32 4 50 10 Q68 4 86 12 V54 Q86 82 50 94 Q14 82 14 54 Z', K) + g('translate(16 12) scale(0.7)', P(HORSER, I)) + T('1965', 50, 88, 10, I),
  tsg: badge('M50 6 Q60 16 76 14 Q86 14 90 18 Q82 30 86 44 Q90 62 72 78 L50 94 L28 78 Q10 62 14 44 Q18 30 10 18 Q14 14 24 14 Q40 16 50 6 Z', K,
    P('M0 80 L100 26 V46 L0 100 Z', I), I, 3) + g('rotate(-28 50 62)', T('TSG 1899', 50, 66, 13, K)),
  ath: badge('M14 18 H40 L44 8 H56 L60 18 H86 V54 Q86 82 50 94 Q14 82 14 54 Z', I, vs(50, 7, K, 30, 100) + P('M0 18 H100 V30 H0 Z', K)) +
    Cf(32, 46, 12, '#3a8a4a') + P('M30 56 h4 v14 h-4 Z', '#6a4a2a') + S('M18 22 L26 28 M26 22 L18 28 M74 22 L82 28 M82 22 L74 28', I, 2.5),
  pfc: badge('M14 10 H86 V54 Q86 82 50 94 Q14 82 14 54 Z', C1, '', '#7fb3e6') + T('PARIS FC', 50, 28, 14, I) + P('M50 34 L58 80 H52 L50 64 L48 80 H42 Z', '#7fb3e6') + S('M44 58 H56 M46 46 H54', '#7fb3e6', 3) + ball(66, 76, 6),
  ren: badge(HEATR, C2, P('M50 0 H100 V100 H50 Z', K)) + S(HEATR, G, 3) + P('M50 26 L44 56 L50 50 L56 56 Z', I) + Cf(50, 22, 4, I) + Cf(42, 28, 4, I) + Cf(58, 28, 4, I) + T('STADE RENNAIS', 50, 74, 8, I),
  aek: badge(HEAT, K, P('M0 8 H100 V24 H0 Z', I)) + T('AEK', 50, 21, 15, D) + g('translate(18 22) scale(0.64)', P(EAGLE2, D)),
  'ct-fey': Cf(50, 50, 44, D) + Cs(50, 50, 44, G, 3) + badge(ring(30), I, P('M0 0 H50 V100 H0 Z', K)) + P('M42 30 H66 V38 H50 V46 H62 V54 H50 V72 H42 Z', G),
  pao: Cf(50, 50, 44, I) + Cs(50, 50, 44, K, 5) + Cs(50, 50, 34, K, 2) +
    Cf(50, 36, 10, K) + Cf(39, 52, 10, K) + Cf(61, 52, 10, K) + S('M50 54 Q52 66 46 76', K, 4),
  and: star(30, 7, 5, G) + star(50, 5, 5, G) + star(70, 7, 5, G) + S('M24 28 Q8 58 34 90', G, 2.5) + S('M76 28 Q92 58 66 90', G, 2.5) +
    leaf(20, 36, -65) + leaf(15, 48, -85) + leaf(15, 60, -100) + leaf(19, 71, -120) + leaf(26, 81, -140) +
    leaf(80, 36, 65) + leaf(85, 48, 85) + leaf(85, 60, 100) + leaf(81, 71, 120) + leaf(74, 81, 140) +
    badge('M28 34 H72 V62 Q72 82 50 90 Q28 82 28 62 Z', K, P('M40 34 H60 V100 H40 Z', I), I, 3) + Cf(50, 52, 9, I) + Cs(50, 52, 9, K, 2) + T('SCA', 50, 56, 10, K) +
    P('M36 32 L32 18 L42 24 L50 14 L58 24 L68 18 L64 32 Z', G),
  ray: badge('M10 20 Q50 6 90 20 Q92 60 76 80 Q62 92 50 92 Q38 92 24 80 Q8 60 10 20 Z', I, '', G) + P('M70 14 L52 46 L64 46 L28 92 L44 56 L32 56 L50 14 Z', K2) + T('RV', 72, 70, 18, D),
  bjk: star(30, 6, 5, I) + star(50, 4, 5, I) + star(70, 6, 5, I) +
    badge('M16 18 Q14 12 20 12 Q34 18 50 14 Q66 18 80 12 Q86 12 84 18 Q80 30 82 42 Q84 52 86 62 Q84 82 50 96 Q16 82 14 62 Q16 52 18 42 Q20 30 16 18 Z', D,
      P('M0 18 H100 V34 H0 Z', I) + vs(22, 8, I, 34, 100) + P('M0 72 H100 V84 H0 Z', I), I, 3.5) +
    T('B', 32, 31, 13, D) + T('J', 50, 31, 13, D) + T('K', 68, 31, 13, D) +
    P('M36 38 H64 V58 Q64 68 50 70 Q36 68 36 58 Z', '#e30a17') + P('M50 44 A9 9 0 1 0 50 62 A7 7 0 1 1 50 44 Z', I) + star(55, 53, 3.5, I) + T('1903', 50, 82, 11, D),
  ata: Cf(50, 50, 47, I) + Cs(50, 50, 42, D, 6) + badge(ring(38), K,
    P('M38 20 Q28 24 26 34 L21 44 L26 46 L24 50 L27 53 L26 58 Q28 62 34 62 L36 72 Q38 80 46 90 L60 90 Q50 76 50 64 Q52 50 48 36 Q46 26 38 20 Z', I) +
    S('M40 21 Q56 15 66 23 T94 23 M46 31 Q60 25 70 33 T96 35 M49 41 Q62 35 72 43 T96 47 M50 51 Q64 45 74 53 T94 59 M50 61 Q62 57 72 65 T90 71', D, 5), K, 1),

  // Division 7
  gnk: badge('M14 8 H86 V54 Q86 82 50 94 Q14 82 14 54 Z', K, vs(20, 5, '#5aa0e0')) + P('M70 30 H36 V70 H64 V54 H52 V46 H72 V78 H28 V22 H70 Z', I),
  tfc: Cf(50, 50, 44, K) + Cs(50, 50, 32, I, 2) + P('M30 70 V40 H38 V34 H44 V40 H56 V34 H62 V40 H70 V70 Z', I) + P('M44 70 V56 Q50 48 56 56 V70 Z', K) + T('19', 22, 56, 10, I) + T('37', 78, 56, 10, I),
  svw: P('M50 4 L94 50 L50 96 L6 50 Z', K) + S('M50 4 L94 50 L50 96 L6 50 Z', I, 3) + P('M26 34 H36 L42 58 L48 34 H54 L60 58 L66 34 H76 L64 70 H56 L50 50 L44 70 H36 Z', I),
  scb: P('M14 22 V10 H22 V16 H30 V10 H38 V16 H46 V10 H54 V16 H62 V10 H70 V16 H78 V10 H86 V22 Z', '#b08a4a') +
    badge('M14 24 H86 V58 Q86 84 50 94 Q14 84 14 58 Z', I, P('M0 24 H100 V36 H0 Z', K)) + P('M24 44 H38 V80 H24 Z M62 44 H76 V80 H62 Z M22 40 h4 v4 h-4 Z M36 40 h4 v4 h-4 Z M60 40 h4 v4 h-4 Z M74 40 h4 v4 h-4 Z', '#6a6a6a'),
  'ct-din': badge(ring(42, 50, 54), K, P('M0 0 H50 V54 H0 Z', I) + [0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3, 4].filter((c) => (r + c) % 2 === 0).map((c) => P(`M${8 + c * 9} ${12 + r * 9} h9 v9 h-9 Z`, '#d7262f'))).join('') + P('M50 54 H100 V100 H0 L50 54 Z', K)) +
    P('M58 46 H66 V84 H58 V80 Q54 84 48 84 Q36 84 36 70 Q36 56 48 56 Q54 56 58 60 Z M50 64 Q44 64 44 70 Q44 76 50 76 Q58 76 58 70 Q58 64 50 64 Z', I) + star(34, 6, 4, G) + star(50, 4, 4, G) + star(66, 6, 4, G),
  sge: P('M44 42 Q36 34 34 22 L28 30 L26 14 L20 26 L16 12 L12 28 L6 18 L6 34 L2 30 L6 44 Q16 52 30 52 L42 54 Z', K) +
    g('matrix(-1 0 0 1 100 0)', P('M44 42 Q36 34 34 22 L28 30 L26 14 L20 26 L16 12 L12 28 L6 18 L6 34 L2 30 L6 44 Q16 52 30 52 L42 54 Z', K)) +
    P('M42 36 Q50 32 58 36 Q62 50 58 64 Q50 70 42 64 Q38 50 42 36 Z', K) + P('M44 38 L43 28 Q42 20 49 18 Q56 19 56 26 L56 38 Z', K) + P('M43 22 L33 24 L38 27 L43 28 Z', K) +
    P('M43 16 L42 9 L46 12 L49 6 L52 12 L56 9 L55 16 Z', K) + P('M44 64 L36 90 L44 83 L50 94 L56 83 L64 90 L56 64 Z', K) +
    S('M44 62 L32 72 M32 72 L26 70 M32 72 L28 78 M56 62 L68 72 M68 72 L74 70 M68 72 L72 78', K, 3.5) + Cf(48, 23, 1.6, D) +
    P('M44 44 H56 V56 Q56 62 50 64 Q44 62 44 56 Z', I) + T('E', 50, 59, 12, K),
  m05: Cf(50, 50, 44, K) + Cs(50, 50, 38, I, 3) + P('M26 30 Q16 50 26 70 Q36 82 44 70 Q50 54 44 34 Q36 20 26 30 Z M30 40 Q26 50 30 60 Q34 66 37 60 Q40 50 37 40 Q34 34 30 40 Z', I) + P('M56 28 H76 V36 H64 V44 Q78 44 78 58 Q78 74 62 74 Q56 74 54 70 L58 64 Q62 66 66 64 Q70 60 68 54 Q64 50 56 52 Z', I),
  rcc: P('M46 6 H54 V30 Q62 20 70 26 Q64 30 58 32 V40 Q70 34 76 42 L64 46 L56 52 V70 L50 96 L44 70 V52 L36 46 L24 42 Q30 34 42 40 V32 Q36 30 30 26 Q38 20 46 30 Z', '#e0283a') +
    badge('M36 34 H64 V48 Q64 60 50 66 Q36 60 36 48 Z', K, '', I, 3) + P('M38 30 L36 22 L44 26 L50 20 L56 26 L64 22 L62 30 Z', G),
  'ct-cop': S('M18 78 A38 38 0 0 1 22 22', '#e0283a', 7) + S('M18 78 A38 38 0 0 1 22 22', I, 2) +
    P('M44 20 L54 12 L58 20 L66 12 L68 22 L78 18 L76 28 L88 28 L80 38 L92 44 L82 50 L92 58 L80 62 L86 72 L74 72 L76 84 L58 86 Q62 74 54 70 L44 74 L36 66 L40 60 L32 56 L38 48 L34 40 Q36 26 44 20 Z', '#3b6fd8') + S('M58 32 Q66 40 64 52 M62 56 Q68 62 66 70', I, 3) + Cf(48, 40, 2.5, I),
  rcs: Cf(50, 50, 44, K) + Cs(50, 50, 32, I, 3) + Cf(50, 50, 30, I) + P('M24 66 Q40 44 74 40 Q56 52 50 70 Z', '#d7262f') + T('RCS', 50, 58, 22, K),
  b29: badge('M16 10 Q50 2 84 10 V46 Q84 76 50 94 Q16 76 16 46 Z', K) + P('M46 12 L50 6 L54 12 L52 22 H48 Z M44 16 h4 v4 h-4 Z M52 16 h4 v4 h-4 Z', I) + T('SB', 50, 52, 30, I) + T('29', 50, 80, 26, I),
  az: badge('M6 50 Q6 30 30 28 H70 Q94 30 94 50 Q94 70 70 72 H30 Q6 70 6 50 Z', I, P('M0 0 H100 V40 Q50 46 0 60 Z', K)) + P('M22 64 L36 34 H44 L58 64 H50 L46 56 H34 L30 64 Z M36 50 H44 L40 40 Z M56 36 H80 V42 L64 58 H80 V64 H54 V58 L70 42 H56 Z', D),

  // Division 8
  kaa: Cf(50, 50, 44, K) + Cs(50, 50, 32, I, 2) +
    P('M58 30 Q46 30 44 42 L38 50 L44 52 L42 58 Q46 66 54 64 L56 76 H66 Q62 66 64 58 Q70 44 64 34 Z', I) +
    S('M58 28 Q40 16 34 24 M60 28 Q50 10 40 12 M64 30 Q64 12 54 8 M66 34 Q76 20 70 12 M68 40 Q82 34 80 24 M68 48 Q82 52 84 42', I, 3.5),
  lec: badge('M14 10 H38 L42 4 H58 L62 10 H86 V62 Q86 86 50 94 Q14 86 14 62 Z', I, P('M0 0 H100 V26 H0 Z', K) + vs(22, 8, K, 26, 100)) + T('LECH', 50, 22, 14, I) + P('M30 34 L50 74 L70 34 H62 L50 58 L38 34 Z', D),
  ala: Cf(50, 50, 44, K) + Cs(50, 50, 32, I, 2) + Cf(50, 50, 30, I) + P('M26 36 H76 L58 54 L76 70 H26 Z', K) + clip('M26 36 H76 L58 54 L76 70 H26 Z', hs(36, 6, I)) + T('DA', 40, 58, 14, D),
  mbr: Cf(50, 50, 44, I) + Cs(50, 50, 44, K, 4) + Cs(50, 50, 32, K, 2) + g('translate(22 20) scale(0.58)', lion(K)) + T('18', 18, 54, 9, K) + T('76', 82, 54, 9, K),
  sev: badge('M6 6 Q50 16 94 6 L88 50 Q80 78 50 96 Q20 78 12 50 Z', I,
    P('M0 0 H50 V52 H0 Z', '#ead9a6') + P('M22 50 V34 Q22 28 29 28 Q36 28 36 34 V50 Z', '#8a5a2a') + Cf(29, 24, 4.5, '#8a5a2a') + P('M24 20 L25 14 L28 17 L29 12 L31 17 L34 14 L35 20 Z', G) +
    Cf(13, 30, 3, '#8a5a2a') + P('M9 34 H17 L18 50 H8 Z', '#8a5a2a') + Cf(44, 30, 3, '#8a5a2a') + P('M40 34 H48 L49 50 H39 Z', '#8a5a2a') + P('M18 50 H40 V44 H18 Z', '#6a4a2a') +
    vs(10, 8, K2, 52, 100) + S('M0 14 Q50 26 100 14', K2, 6), '#c9a24a', 3) +
    S('M80 22 Q72 15 65 21 Q60 29 71 34 Q81 39 74 46 Q66 52 59 45', D, 3.5) + S('M70 17 V50 M70 27 H78', D, 3) + ball(50, 54, 9, '#c08a4a', '#5a3a1a'),
  sou: S('M38 12 Q50 2 62 12', G, 3) + ball(50, 22, 8) +
    P('M8 30 Q30 24 50 34 Q70 24 92 30 L86 38 Q70 32 50 42 Q30 32 14 38 Z', K) + badge('M22 36 H78 V62 Q78 84 50 94 Q22 84 22 62 Z', I, P('M0 72 H100 V100 H0 Z', '#3a6aaa') + S('M18 80 Q34 74 50 80 T82 80', I, 3)) +
    Cf(50, 50, 10, '#3a8a4a') + P('M48 58 h4 v12 h-4 Z', '#6a4a2a'),
  vcf: g('translate(10 -8) scale(0.8)', P(BAT, I)) + badge('M18 30 Q50 22 82 30 Q86 66 50 94 Q14 66 18 30 Z', '#f2c14e', vs(22, 8, '#d7262f') + P('M0 30 H100 V42 H0 Z', D)) + ball(50, 62, 10, '#b06a2a', '#5a3a1a'),
  ts: P('M22 22 Q40 12 54 20 Q70 28 82 18 V60 Q70 72 54 64 Q40 56 22 66 Z', K) + S('M22 22 V94', K, 5) + S('M60 30 Q44 26 40 38 Q38 50 54 52 Q66 54 64 42', K2, 7) + star(50, 8, 5, G),
  fio: P('M50 4 L94 50 L50 96 L6 50 Z', I) + S('M50 4 L94 50 L50 96 L6 50 Z', K, 6) + P('M22 50 L50 80 L78 50 L72 46 L50 70 L28 46 Z', K) +
    P('M50 18 Q56 28 52 40 L54 46 Q60 34 70 34 Q68 44 58 48 H62 V52 H38 V48 H42 Q32 44 30 34 Q40 34 46 46 L48 40 Q44 28 50 18 Z M48 52 H52 V62 Q50 66 48 62 Z', '#d7262f'),
  fca: badge('M14 8 H86 V56 Q86 84 50 94 Q14 84 14 56 Z', I, P('M0 8 H100 V28 H0 Z', K) + P('M0 28 H34 V100 H0 Z', K) + P('M66 28 H100 V100 H66 Z', K2)) + T('FCA', 50, 25, 18, I) +
    P('M50 34 Q62 40 60 54 Q58 62 50 64 Q42 62 40 54 Q38 40 50 34 Z', K2) + P('M46 64 H54 V80 H58 V84 H42 V80 H46 Z', G),
  rafc: P('M36 16 L32 4 L42 8 L50 2 L58 8 L68 4 L64 16 Z', G) + badge('M18 18 H82 Q84 18 84 22 V58 Q84 84 50 94 Q16 84 16 58 V22 Q16 18 18 18 Z', I, '', K, 7) + ball(50, 46, 14, D, I) + T('1', 50, 86, 20, D),

  // The pool
  whu: badge('M14 10 H86 V52 Q86 80 50 94 Q14 80 14 52 Z', K, '', K2, 6) + T('WEST HAM', 50, 26, 13, I) + S('M30 40 L70 80 M70 40 L30 80', G, 6) + P('M24 34 L36 30 L40 42 L28 46 Z M76 34 L64 30 L60 42 L72 46 Z', G),
  'ct-sal': star(50, 8, 5, G) + g('translate(-2 18) scale(0.52)', P(BULL, K)) + g('translate(102 18) scale(-0.52 0.52)', P(BULL, K)) + Cf(50, 30, 10, '#ffcc00') +
    P('M14 66 H86 L80 84 H20 Z', I) + S('M14 66 H86 L80 84 H20 Z', K, 3) + T('SALZBURG', 50, 80, 10, K),
  dep: P('M30 24 L26 8 L40 14 L50 2 L60 14 L74 8 L70 24 Z', G) + Cf(50, 58, 36, I) + Cs(50, 58, 36, K, 4) + Cs(50, 58, 26, K, 2) +
    P('M24 70 L66 36 L76 46 L34 80 Z', '#6a2a8a') + P('M58 58 H86 L80 66 L86 74 H58 Z', K),
  lud: P('M50 22 Q34 6 10 10 Q20 18 16 28 Q30 24 36 32 Z M50 22 Q66 6 90 10 Q80 18 84 28 Q70 24 64 32 Z', D) + S('M50 22 Q34 6 10 10 Q20 18 16 28 Q30 24 36 32 Z M50 22 Q66 6 90 10 Q80 18 84 28 Q70 24 64 32 Z', I, 2) + Cf(50, 22, 6, D) + Cs(50, 22, 6, I, 2) +
    badge('M20 26 H80 V58 Q80 84 50 94 Q20 84 20 58 Z', C1, vs(30, 10, C2) + P('M0 40 H100 V52 H0 Z', I)) + T('LEVANTE', 50, 50, 10, D) + ball(50, 72, 9, G, D),
  fcl: badge('M14 8 H86 V54 Q86 86 50 94 Q14 86 14 54 Z', K, P('M0 0 H100 V34 H0 Z', I) + vs(14, 7, D, 0, 34) + P('M0 34 H100 V48 H0 Z', D)) + T('FC LORIENT', 50, 45, 9, I) +
    P('M26 70 Q40 56 60 64 L74 56 L72 72 L60 70 Q40 82 26 70 Z', D) + Cf(34, 68, 2, I),
  paok: badge('M18 8 H82 Q88 8 88 14 V54 Q86 84 50 94 Q14 84 12 54 V14 Q12 8 18 8 Z', I, '', D, 6) + T('ΠΑΟΚ', 50, 24, 14, D) + g('translate(14 22) scale(0.72)', P(EAGLE2F, D)),
  ogcn: g('translate(0 -6)', P('M50 6 L54 12 L52 18 Q64 6 92 6 Q86 20 90 26 Q78 30 66 38 L60 40 H40 L34 38 Q22 30 10 26 Q14 20 8 6 Q36 6 48 18 L46 12 Z', G)) +
    badge('M28 36 H72 V60 Q72 80 50 90 Q28 80 28 60 Z', D, vs(28, 8, K)) + P('M28 36 H72 V50 H28 Z', D) + T('NICE', 50, 48, 12, I),
  wlv: P('M4 50 L28 10 H72 L96 50 L72 90 H28 Z', K) + P('M50 82 L36 62 L30 46 L26 20 L40 34 L50 30 L60 34 L74 20 L70 46 L64 62 Z', D) + P('M38 46 L46 50 L40 52 Z M62 46 L54 50 L60 52 Z', K),
  elc: badge('M14 8 H86 V56 Q86 84 50 94 Q14 84 14 56 Z', I, P('M0 30 H100 V44 H0 Z', K2) + hs(70, 6, '#d7262f')) + T('ELCHE', 50, 41, 11, I) + T('C', 28, 24, 14, D) + T('F', 72, 24, 14, D) +
    P('M36 70 V56 Q50 44 64 56 V70 Z', '#c9a24a'),
  fsn: badge(HEATR, K2, P('M0 64 L100 20 V36 L0 80 Z', K)) + T('FROSINONE', 50, 20, 9, K) + g('translate(28 28) scale(0.5)', lion(I)),
  sve: Cf(50, 50, 44, I) + Cs(50, 50, 44, D, 3) + Cs(50, 50, 38, D, 2) +
    S('M66 26 Q50 16 36 26 Q28 36 40 44 Q60 52 62 64 Q62 80 44 80 Q34 78 32 72', D, 7) + S('M30 30 L50 74 L70 30', D, 5),
  'ct-sha': badge('M50 4 Q84 14 86 48 Q86 78 50 96 Q14 78 14 48 Q16 14 50 4 Z', K, P('M50 4 Q36 30 38 50 Q38 66 50 70 Q62 66 62 50 Q64 30 50 4 Z', D) + P('M0 70 H100 V100 H0 Z', D)) +
    S('M42 78 L58 90 M58 78 L42 90', K, 3.5) + P('M18 54 H82 V64 H18 Z', D) + T('ШАХТАР', 50, 63, 9, I),
  fcm: Cf(50, 50, 44, D) + Cs(50, 50, 44, I, 2) + Cs(50, 50, 34, I, 1.5) + P('M50 80 Q38 74 32 60 L26 28 L40 40 L50 36 L60 40 L74 28 L68 60 Q62 74 50 80 Z', K2) + P('M38 50 L46 54 L40 56 Z M62 50 L54 54 L60 56 Z M46 66 H54 L50 72 Z', D),
  'ct-red': star(30, 8, 5, G) + star(50, 5, 5, G) + star(70, 8, 5, G) + badge('M18 16 H82 V54 Q82 82 50 94 Q18 82 18 54 Z', K) + star(50, 56, 26, I) + T('ФК', 50, 30, 12, I),
  osa: P('M30 22 L26 6 L40 12 L50 2 L60 12 L74 6 L70 22 Z', G) + badge('M16 24 H84 V58 Q84 84 50 94 Q16 84 16 58 Z', K, P('M50 0 H100 V100 H50 Z', K2)) +
    S('M50 30 V86', G, 3) + T('C', 32, 54, 16, I) + T('A', 68, 54, 16, I) + Cf(50, 58, 6, G),
  esp: P('M32 22 L28 6 L40 12 L50 2 L60 12 L72 6 L68 22 Z', G) + Cf(50, 58, 38, '#d7262f') + badge(ring(26, 50, 58), I, vs(28, 7, K)) + Cs(50, 58, 38, G, 2),
  tor: badge('M14 18 Q14 6 28 6 H72 Q86 6 86 18 V54 Q86 84 50 94 Q14 84 14 54 Z', K, P('M0 6 H100 V24 H0 Z', I)) + T('TORINO', 50, 21, 14, K) + g('translate(18 22) scale(0.66)', P(BULLR, I)),
  cas: g('translate(14 -10) scale(0.72)', P(BAT, D) + S(BAT, I, 2.5)) + badge('M16 22 Q50 14 84 22 V56 Q84 82 50 94 Q16 82 16 56 Z', I, P('M0 22 H100 V36 H0 Z', D) + vs(20, 8, '#d7262f', 36, 100) + vs(28, 8, '#f2c14e', 36, 100)) + ball(50, 84, 6),
  rac: P('M30 22 L26 6 L40 12 L50 2 L60 12 L74 6 L70 22 Z', G) + Cf(50, 58, 36, I) + Cs(50, 58, 36, D, 4) + Cs(50, 58, 26, D, 2) +
    S('M34 76 V36', D, 3) + P('M36 38 H72 V66 H36 Z', K2) + P('M36 38 L72 66 H58 L36 50 Z', I),
  spa: Cf(50, 54, 40, D) + Cs(50, 54, 40, I, 3) + P('M24 82 A40 40 0 0 0 76 82 L70 76 A32 32 0 0 1 30 76 Z', '#2f6fd0') + P('M30 76 A32 32 0 0 0 70 76 L64 70 A24 24 0 0 1 36 70 Z', '#f2c14e') +
    T('S', 50, 72, 44, I) + star(30, 8, 5, G) + star(50, 5, 5, G) + star(70, 8, 5, G),
  bcfc: P('M10 30 Q30 18 50 26 Q70 18 90 30 L84 40 Q70 30 50 36 Q30 30 16 40 Z', K) + badge(ring(30, 50, 60), I, S('M20 60 H80 M50 30 V90 M24 46 H76 M24 74 H76', K, 2.5) + `<ellipse cx="50" cy="60" rx="14" ry="30" style="fill:none;stroke:${K};stroke-width:2.5"/>`),
  gen: badge(HEAT, K2, P('M50 30 H100 V100 H50 Z', K) + P('M0 0 H100 V30 H0 Z', I) + P('M46 0 H54 V30 H46 Z M0 15 H100 V21 H0 Z', '#d7262f')) +
    g('translate(28 32) scale(0.48)', lion(G)) + P('M56 38 Q72 30 76 44 Q66 42 60 52 Z', G),
  koe: Cf(50, 66, 26, K) + Cs(50, 66, 26, I, 3) + P('M38 80 V58 L42 46 L46 58 V80 Z M54 80 V58 L58 46 L62 58 V80 Z M44 66 H56 V80 H44 Z', I) +
    P('M22 30 Q20 18 30 16 Q40 18 38 28 L64 28 Q72 22 78 30 L80 46 L74 46 L72 36 L66 40 V48 H60 V38 H40 V48 H34 V38 L26 34 L24 40 L18 36 Z', I) + S('M28 18 Q20 8 12 14 M34 16 Q34 4 26 4', I, 3),
  scp: badge(ring(42, 50, 54), I, P('M0 54 H100 V100 H0 Z', K)) + P('M8 36 H92 V52 H8 Z', D) + T('PADERBORN', 50, 48, 11, I) + T('07', 50, 82, 22, I) + T('SC', 50, 30, 14, K),
  fcu: P('M4 36 H96 V64 H4 Z', '#ffd500') + S('M4 36 H96 V64 H4 Z', K, 3) + T('1.FC', 22, 56, 15, K) + T('UNION', 78, 56, 15, K) + Cf(50, 50, 14, I) + Cs(50, 50, 14, K, 3) + P('M44 56 L50 42 L56 56 Z', K),
  hsv: P('M8 18 H92 V82 H8 Z', '#0a5ab0') + P('M50 22 L78 50 L50 78 L22 50 Z', I) + P('M50 32 L68 50 L50 68 L32 50 Z', D) + P('M50 40 L60 50 L50 60 L40 50 Z', I),
  'ct-yb': Cf(50, 50, 44, K) + Cs(50, 50, 38, D, 3) + T('YB', 50, 66, 40, D) + star(50, 24, 6, D),
  'ct-ran': Cf(50, 50, 44, K) + Cs(50, 50, 44, I, 3) + Cf(50, 50, 30, I) + g('translate(26 24) scale(0.5)', lion('#d7262f')) + P('M30 72 H70 L66 80 H34 Z', K) + T('READY', 50, 79, 7, I),
  'ct-cel': Cf(50, 50, 44, K) + Cf(50, 50, 32, I) + [[50, 36], [36, 50], [64, 50], [50, 64]].map(([x, y]) => Cf(x, y, 11, K)).join('') + S('M50 50 Q56 66 64 74', K, 3),
  s04: Cf(50, 50, 44, K) + Cs(50, 50, 36, I, 4) + T('S', 50, 52, 34, I) + T('04', 50, 80, 26, I),
  wre: badge('M14 18 Q24 6 34 14 Q42 4 50 12 Q58 4 66 14 Q76 6 86 18 V56 Q86 84 50 94 Q14 84 14 56 Z', I, P('M0 0 H100 V34 H0 Z', '#2f8a3a') + P('M0 34 H100 V40 H0 Z', K)) +
    P('M40 30 Q36 18 42 12 Q44 22 46 30 Z M50 30 Q46 16 50 8 Q54 16 50 30 Z M60 30 Q64 18 58 12 Q56 22 54 30 Z', I) +
    P('M14 60 L22 50 L20 44 L28 46 Q34 40 42 44 L48 36 L44 22 L56 30 L60 20 L66 32 L72 26 L70 40 Q78 46 76 56 L88 48 L86 58 L80 62 L80 66 Q70 72 58 70 L56 80 L50 80 L50 70 L42 70 L40 80 L34 80 L36 66 Q28 62 22 64 Z', K) + Cf(26, 50, 1.8, I) + ball(66, 84, 6),
  ase: star(50, 10, 7, I) + badge('M16 16 H84 V54 Q84 82 50 94 Q16 82 16 54 Z', K) + T('ASSE', 50, 44, 22, I) + S('M40 56 L60 76 M60 56 L40 76', I, 3),
  stp: Cf(50, 50, 44, I) + Cs(50, 50, 44, K, 6) + Cs(50, 50, 32, K, 2) + P('M32 72 V46 L38 36 L44 46 V52 H56 V46 L62 36 L68 46 V72 Z', '#d7262f') + P('M44 72 V62 Q50 56 56 62 V72 Z', I) + T('1910', 50, 90, 9, K),

  // Neighbour
  kbs: P('M36 22 L32 8 L42 14 L50 4 L58 14 L68 8 L64 22 Z', '#d7262f') + badge('M16 24 H84 V58 Q84 84 50 94 Q16 84 16 58 Z', K, P('M0 40 L100 100 H0 Z', D) + P('M0 24 H100 V40 H0 Z', I)) + T('K.B.S.', 50, 37, 12, D),

  // World champions (world 2)
  'cw2-fla': badge('M14 10 H86 V50 Q86 78 50 94 Q14 78 14 50 Z', D, hs(10, 10, K)) + P('M30 22 H70 V44 H30 Z', D) + T('CRF', 50, 41, 17, I),
  'cw2-riv': badge('M16 10 Q50 4 84 10 V50 Q84 78 50 94 Q16 78 16 50 Z', I, P('M0 66 L100 22 V44 L0 88 Z', K2)) + Cf(50, 46, 16, I) + Cs(50, 46, 16, D, 3) + T('CARP', 50, 51, 12, D),
  'cw2-ahl': star(26, 8, 4, G) + star(42, 5, 4, G) + star(58, 5, 4, G) + star(74, 8, 4, G) + badge(HEAT.replace('M14 8', 'M14 14').replace('H86 V44', 'H86 V48'), K, P('M0 74 H100 V82 H0 Z', I)) +
    g('translate(18 18) scale(0.64)', P(EAGLE, D)),
  'cw2-ura': P('M18 10 H82 V18 H18 Z', I) + badge('M18 18 H82 V54 Q82 80 50 92 Q18 80 18 54 Z', K, P('M50 0 H100 V100 H50 Z', D)) + ball(50, 50, 14) + P('M10 76 H90 L84 92 H16 Z', K) + S('M10 76 H90 L84 92 H16 Z', I, 2),
  'cw2-mty': badge('M14 10 H86 V50 Q86 78 50 94 Q14 78 14 50 Z', K, vs(14, 7, '#2a4a8b')) + P('M24 24 H38 L50 46 L62 24 H76 V72 H64 V46 L50 70 L36 46 V72 H24 Z', I),
  'cw2-sun': Cf(50, 50, 40, K) + Cs(50, 50, 40, '#2f8a3a', 6) + P('M2 50 H98 L92 60 L98 70 H2 L8 60 Z', '#2f8a3a') + star(40, 4, 4, G) + star(60, 4, 4, G) + T('SUNDOWNS', 50, 64, 9, I),
  'cw2-akl': badge('M16 8 H40 L44 4 H56 L60 8 H84 V52 Q84 80 50 94 Q16 80 16 52 Z', K, P('M0 30 H50 V46 H0 Z', I) + P('M50 46 H100 V60 H50 Z', I)) +
    P('M48 18 H52 V36 L56 40 L52 44 V86 H48 V44 L44 40 L48 36 Z', I) + Cf(50, 40, 5, I) + T('AC', 30, 24, 12, I) + T('FC', 70, 24, 12, I),
};
