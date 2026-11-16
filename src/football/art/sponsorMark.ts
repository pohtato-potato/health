// Sponsor logos as original outlines (O41 letter 4, owner's note: "they anyways have to reflect on the kit"): each
// brand gets one outline shape and its initial, picked from its name, so the same brand always looks the same. Drawn
// here from nothing; no real logo is copied.
import { hashSeed } from '../rng';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const SHAPES = ['ring', 'diamond', 'hex', 'shield', 'wave', 'tri', 'twin', 'square'] as const;
export type MarkShape = (typeof SHAPES)[number];
export const markShape = (brand: string): MarkShape => SHAPES[hashSeed('sponsor-mark', brand) % SHAPES.length];

function outline(shape: MarkShape, r: number): string {
  const p = (pts: [number, number][]) => `<path d="M${pts.map(([x, y]) => `${(x * r).toFixed(1)} ${(y * r).toFixed(1)}`).join(' L')} Z"/>`;
  switch (shape) {
    case 'ring': return `<circle r="${r}"/>`;
    case 'diamond': return p([[0, -1], [1, 0], [0, 1], [-1, 0]]);
    case 'hex': return p([[0, -1], [0.87, -0.5], [0.87, 0.5], [0, 1], [-0.87, 0.5], [-0.87, -0.5]]);
    case 'shield': return `<path d="M${-r} ${-r * 0.8} H${r} V${r * 0.1} Q${r} ${r * 0.8} 0 ${r} Q${-r} ${r * 0.8} ${-r} ${r * 0.1} Z"/>`;
    case 'wave': return `<circle r="${r}"/><path d="M${-r * 0.8} ${r * 0.45} q${r * 0.4} ${-r * 0.35} ${r * 0.8} 0 t${r * 0.8} 0"/>`;
    case 'tri': return p([[0, -1], [0.95, 0.8], [-0.95, 0.8]]);
    case 'twin': return `<circle cx="${-r * 0.35}" r="${r * 0.72}"/><circle cx="${r * 0.35}" r="${r * 0.72}"/>`;
    case 'square': return `<rect x="${-r * 0.85}" y="${-r * 0.85}" width="${r * 1.7}" height="${r * 1.7}" rx="${r * 0.3}"/>`;
  }
}
/** The mark alone, centred on (cx, cy): the outline and the brand's initial. */
export function sponsorMarkGroup(brand: string, ink: string, cx: number, cy: number, r: number): string {
  const shape = markShape(brand);
  const dy = shape === 'tri' ? r * 0.35 : shape === 'shield' ? r * 0.12 : 0;
  return `<g transform="translate(${cx} ${cy})" fill="none" stroke="${ink}" stroke-width="${Math.max(1.2, r / 7).toFixed(1)}" stroke-linejoin="round">${outline(shape, r)}` +
    `<text y="${(dy + r * 0.36).toFixed(1)}" text-anchor="middle" fill="${ink}" stroke="none" style="font: 700 ${(r * (shape === 'tri' ? 0.8 : 1)).toFixed(1)}px 'Atkinson Hyperlegible Next', sans-serif">${esc(brand.trim().charAt(0).toUpperCase())}</text></g>`;
}
/** The logo as its own picture: the mark over the brand's name. */
export function sponsorLogoSvg(brand: string, size: number, ink = '#ede6da', label = true): string {
  const a = label ? `role="img" aria-label="${esc(brand)} logo"` : 'aria-hidden="true"';
  return `<svg class="fb-sponsor-logo" width="${size}" height="${Math.round(size * 0.8)}" viewBox="0 0 100 80" ${a}>${sponsorMarkGroup(brand, ink, 50, 30, 22)}` +
    `<text x="50" y="74" text-anchor="middle" fill="${ink}" style="font: 700 13px 'Atkinson Hyperlegible Next', sans-serif">${esc(brand.toUpperCase().slice(0, 16))}</text></svg>`;
}
