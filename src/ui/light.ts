import type { PartOfDay } from '../domain/dates';

/** The walk's regions, each with its own small palette. */
export const REGIONS = ['plains', 'desert', 'ravines', 'deccan', 'ghats', 'coast', 'east', 'northeast', 'himalaya'] as const;
export type RegionId = (typeof REGIONS)[number];

export interface Light {
  /** Top, middle and horizon of the sky. */
  sky: [string, string, string];
  /** Far to near: far ridge, landmark ground, mid terrain, foreground. */
  layers: [string, string, string, string];
  /** The colour of the light source's glow (sun or moon). */
  glow: string;
}

/** Each region's four inks at full daylight, far to near. */
const INKS: Record<RegionId, [string, string, string, string]> = {
  plains: ['#a9a37a', '#7f7a52', '#5b5a38', '#3c3d26'],
  desert: ['#d9b07a', '#c08a52', '#9a6a3c', '#6e4a2a'],
  ravines: ['#b77a5c', '#8e5640', '#6a3d30', '#462820'],
  deccan: ['#a88a6a', '#86684c', '#634c38', '#433426'],
  ghats: ['#7fa77a', '#5a8458', '#3f6340', '#2a442c'],
  coast: ['#86b3b8', '#5e8f94', '#40696e', '#2a484c'],
  east: ['#8fae7f', '#6a8c5a', '#4c6b40', '#33492c'],
  northeast: ['#7aa08c', '#557d68', '#3c5d4c', '#283f34'],
  himalaya: ['#dfe6ee', '#a9b8c8', '#7a8ca0', '#4f5f72'],
};

/** A region's four inks at full daylight, far to near. */
export function inksFor(region: RegionId): [string, string, string, string] {
  return INKS[region];
}

const SKY: Record<PartOfDay, [string, string, string]> = {
  dawn: ['#2b3d73', '#9a7aa6', '#f2c49a'],
  day: ['#4f7fc0', '#8fb6e0', '#e6eef2'],
  dusk: ['#171b4c', '#b3605d', '#ec9a63'],
  night: ['#05081f', '#101a48', '#2a2a5d'],
};

const GLOW: Record<PartOfDay, string> = { dawn: '#ffd8a8', day: '#fff4d6', dusk: '#ffc48a', night: '#f6eed9' };

/** How strongly each part of day darkens and tints the land. */
const SHADE: Record<PartOfDay, { k: number; tint: string; t: number }> = {
  dawn: { k: 0.82, tint: '#e8a07c', t: 0.18 },
  day: { k: 1, tint: '#ffffff', t: 0 },
  dusk: { k: 0.62, tint: '#8a4a6a', t: 0.28 },
  night: { k: 0.3, tint: '#1d2353', t: 0.5 },
};

/** Far layers fade toward the horizon colour; near ones keep their own ink. */
const DEPTH = [0.55, 0.35, 0.15, 0.04];

export function lightFor(part: PartOfDay, region: RegionId): Light {
  const sky: [string, string, string] = part === 'night' ? [...SKY.night] : [SKY[part][0], SKY[part][1], mix(SKY[part][2], INKS[region][0], 0.12)];
  const { k, tint, t } = SHADE[part];
  const layers = INKS[region].map((ink, i) => {
    const lit = mix(scale(ink, k), tint, t);
    return mix(lit, sky[2], DEPTH[i]);
  }) as Light['layers'];
  return { sky, layers, glow: GLOW[part] };
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

export function mix(a: string, b: string, t: number): string {
  const [x, y] = [hex(a), hex(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

function scale(c: string, k: number): string {
  return toHex(hex(c).map((v) => v * k));
}

/** WCAG relative luminance. */
export function luminance(c: string): number {
  const [r, g, b] = hex(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
