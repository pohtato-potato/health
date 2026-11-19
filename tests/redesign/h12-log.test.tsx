import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogBuckets, MealsPanel, type Buckets } from '../../src/screens/today/LogBelow';

const noop = () => {};
const on = { food: noop, morning: noop, checklist: noop, steps: noop, session: noop, more: noop };
// Invented numbers.
const full: Buckets = {
  food: { kcal: 1240, aim: 1900 },
  morning: { at: new Date(2026, 0, 2, 7, 12).getTime() },
  checklist: { done: 2, of: 4 },
  steps: { n: 6420, of: 10000 },
  session: { name: 'Session B', done: false },
};
const log = (b: Buckets) => renderToStaticMarkup(<LogBuckets b={b} on={on} />);

describe('Logging, each bucket its own fill (h12-log)', () => {
  it('gives every bucket its own fill style', () => {
    const html = log(full);
    for (const k of ['k-food', 'k-morning', 'k-check', 'k-steps', 'k-session']) expect(html).toContain(`td-bk${k === 'k-session' ? ' wide' : ''} ${k}`);
    // Close the day is the moon button at the end of the page, not a tile (owner, 19 Nov).
    expect(html).not.toContain('k-close');
    const css = readFileSync('src/styles/today.css', 'utf8');
    for (const s of ['.td-bk-fill {', '.td-bk .sun {', '.td-bk .box i {', '.td-bk .feet i {', '.td-bk .bar i {', '.td-bk .rings .on {']) expect(css).toContain(s);
  });

  it('puts each bucket’s number in words', () => {
    const html = log(full);
    expect(html).toContain('1,240<small>of 1,900 kcal</small>');
    expect(html).toContain('7:12 am<small>logged</small>');
    expect(html).toContain('2<small>of 4 ticked</small>');
    expect(html).toContain('6,420<small>of 10k</small>');
  });

  it('fills the organiser one slot per item, a pill per tick, and walks the steps as far as they reach', () => {
    const html = log(full);
    expect((html.match(/<span class="box"[^>]*>(.*?)<\/span><\/span>/)?.[1].match(/<span>/g) ?? []).length).toBe(4);
    expect((html.match(/<i style="--d:0\.\d+s|<i style="--d:0s/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((html.match(/<i style="--x:/g) ?? []).length).toBe(5);
  });

  it('opens More under the tiles', () => {
    expect(log(full)).toMatch(/class="td-more"><span>More: drinks, night out, free meal, waist, status, check-in<\/span>/);
  });

  it('plays the pictures once; reduced motion shows them still', () => {
    const css = readFileSync('src/styles/today.css', 'utf8');
    for (const r of ['.td-bk .sun {', '.td-bk .box i {', '.td-bk .feet i {', '.td-bk .bar i {']) {
      const rule = css.slice(css.indexOf(r));
      expect(rule.slice(0, rule.indexOf('}'))).not.toMatch(/infinite/);
    }
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.td-ml-lq, [^{]*\.td-bk \.rings \.on \{ animation: none/);
  });

  it('shows the meals panel with the day’s totals in its chip', () => {
    const html = renderToStaticMarkup(<MealsPanel meals={[{ meal: 'breakfast', kcal: 510, protein: 24, canRepeat: false }, { meal: 'dinner', canRepeat: false }]} kcalAim={1800} proteinAim={120} onOpen={noop} onRepeat={noop} />);
    expect(html).toContain('>510 kcal · 24 g<');
    expect(html).toContain('id="td-panel-meals"');
  });

  it('renders with no data: dashes, no pills, no prints, no session', () => {
    const html = log({ food: { kcal: 0, aim: 1900 }, morning: {}, checklist: { done: 0, of: 0 }, steps: { of: 10000 } });
    expect(html).toContain('—<small>not yet</small>');
    expect(html).toContain('—<small>of 10k</small>');
    expect(html).not.toContain('k-session');
    expect(html).not.toContain('--x:');
  });
});
