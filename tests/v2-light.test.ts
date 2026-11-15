import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast } from '../src/ui/light';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const token = (name: string) => {
  const m = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`missing token --${name}`);
  return m[1];
};

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
});
