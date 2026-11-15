/**
 * Colour mixing in OKLCH, so two vivid colours meet through vivid colours: a sand gold pulled toward a dusk purple
 * passes through rose, never through the grey-brown a plain RGB mix gives (look pass: no muddy or brown mixes).
 */

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function toOklch(c: string): [number, number, number] {
  const [r, g, b] = hex(c).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function rgbOf(L: number, C: number, H: number): number[] {
  const h = (H * Math.PI) / 180;
  const [A, B] = [C * Math.cos(h), C * Math.sin(h)];
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

/** Back to hex, keeping the hue: chroma is eased down until the colour fits the screen, rather than clipped. */
export function fromOklch(L: number, C: number, H: number): string {
  let c = C;
  let rgb = rgbOf(L, c, H);
  for (let i = 0; i < 24 && rgb.some((v) => v < -0.001 || v > 1.001); i++) rgb = rgbOf(L, (c *= 0.9), H);
  return '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(1, toSrgb(Math.max(0, v)))) * 255).toString(16).padStart(2, '0')).join('');
}

/** a toward b by t, in OKLCH, the hue taking the short way round. */
export function mixOk(a: string, b: string, t: number): string {
  const [l1, c1, h1] = toOklch(a);
  const [l2, c2, h2] = toOklch(b);
  // A near-grey has no hue worth keeping: take the other's.
  const ha = c1 < 0.02 ? h2 : h1;
  const hb = c2 < 0.02 ? h1 : h2;
  const dh = ((hb - ha + 540) % 360) - 180;
  return fromOklch(l1 + (l2 - l1) * t, c1 + (c2 - c1) * t, (ha + dh * t + 360) % 360);
}

/**
 * a toward b by t, keeping the hour's hue when the short way would land a dark colour in the orange-yellow
 * band, where low light reads as brown or olive (a jungle green at dusk goes plum, not khaki).
 */
export function mixVivid(a: string, b: string, t: number, keepHue = false, lean: 'a' | 'b' = 'a'): string {
  const [l1, c1, h1] = toOklch(a);
  const [l2, c2, h2] = toOklch(b);
  const L = l1 + (l2 - l1) * t;
  const C = c1 + (c2 - c1) * t;
  if (keepHue) return fromOklch(L, C, h2);
  const short = ((h2 - h1 + 540) % 360) - 180;
  const muddy = (h: number) => L < 0.66 && h >= 38 && h <= 108;
  const hs = (h1 + short * t + 720) % 360;
  // Muddy the short way: stay in a's own light (the hour's), leaning a little cool; or take b's hue (a theme's).
  if (!muddy(hs)) return fromOklch(L, C, hs);
  return fromOklch(L, C, lean === 'a' ? (h1 - 18 + 360) % 360 : h2);
}

/** The same colour, lighter or darker by d in OKLCH lightness. */
export function shade(c: string, d: number): string {
  const [L, C, H] = toOklch(c);
  return fromOklch(Math.max(0, Math.min(1, L + d)), C, H);
}
