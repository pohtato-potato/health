import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REGIONS, contrast, lightFor, luminance } from '../src/ui/light';
import type { PartOfDay } from '../src/domain/dates';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const token = (name: string) => {
  const m = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`missing token --${name}`);
  return m[1];
};

const PARTS: PartOfDay[] = ['dawn', 'day', 'dusk', 'night'];

describe('Dusk Strata tokens and lighting', () => {
  it('every text and ground token pair meets 4.5:1', () => {
    for (const ground of ['ink', 'surface', 'raised', 'tabbar']) {
      for (const text of ['text', 'quiet', 'dim']) {
        expect(contrast(token(text), token(ground)), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('metric and form colours are readable on cards (3:1 for graphics)', () => {
    for (const c of ['kcal', 'protein', 'steps', 'sleep', 'gold', 'rose', 'f1', 'f2', 'f3', 'f4', 'f5']) {
      expect(contrast(token(c), token('surface')), c).toBeGreaterThanOrEqual(3);
    }
  });

  it('lightFor covers every part of day and region', () => {
    for (const part of PARTS) {
      for (const region of REGIONS) {
        const l = lightFor(part, region);
        expect(l.sky).toHaveLength(3);
        expect(l.layers).toHaveLength(4);
        for (const c of [...l.sky, ...l.layers, l.glow]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('the night sky is never brighter than dusk', () => {
    for (const region of REGIONS) {
      const night = lightFor('night', region).sky.map(luminance);
      const dusk = lightFor('dusk', region).sky.map(luminance);
      night.forEach((v, i) => expect(v).toBeLessThanOrEqual(dusk[i]));
    }
  });

  it('far layers sit closer to the sky colour than near ones (atmospheric depth)', () => {
    const l = lightFor('day', 'ravines');
    const horizon = luminance(l.sky[2]);
    const gap = (c: string) => Math.abs(luminance(c) - horizon);
    expect(gap(l.layers[0])).toBeLessThan(gap(l.layers[3]));
  });
});
