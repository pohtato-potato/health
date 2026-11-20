import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MorningLogged, morningParts } from '../../src/ui/MorningLogged';

// Invented values.
const parts = morningParts({ sleepMin: 450, rested: 3, weightKg: 70.2, place: 'Office' });

describe('After you save the morning (s5-saved)', () => {
  it('lists each saved part, in order', () => {
    expect(parts).toEqual(['Sleep 7 h 30', 'Rested 3', '70.2 kg', 'Office']);
    const html = renderToStaticMarkup(<MorningLogged parts={parts} sleepMin={450} sleepTarget={480} />);
    const items = [...html.matchAll(/<li[^>]*>.*?<span>([^<]+)<\/span><\/li>/g)].map((m) => m[1]);
    expect(items).toEqual(parts);
  });

  it('ticks them in one after another', () => {
    const html = renderToStaticMarkup(<MorningLogged parts={parts} />);
    expect(html).toContain('--i:0');
    expect(html).toContain('--i:3');
  });

  it('has no reduced-motion variant', () => {
    const css = readFileSync('src/styles/food.css', 'utf8');
    expect(css).not.toContain('prefers-reduced-motion'); // no reduced-motion variants (PRODUCT.md)
  });

  it('fills the sleep ring with words beside it', () => {
    const html = renderToStaticMarkup(<MorningLogged parts={parts} sleepMin={450} sleepTarget={480} />);
    expect(html).toContain('Sleep ring');
    expect(html).toContain('7 h 30 of 8 h');
  });

  it('renders with no data: only what was saved, no ring', () => {
    expect(morningParts({})).toEqual([]);
    const html = renderToStaticMarkup(<MorningLogged parts={[]} />);
    expect(html).not.toContain('Sleep ring');
    expect(html).not.toContain('<li');
  });
});
