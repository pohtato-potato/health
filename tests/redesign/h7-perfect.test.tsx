import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayLayout } from '../../src/screens/today/TodayLayout';
import { DrawerHandle } from '../../src/screens/today/TodayDrawer';
import { MomentCard } from '../../src/screens/today/MomentCard';

const layout = (perfect: boolean) =>
  renderToStaticMarkup(<TodayLayout walk={null} line={null} rings={<div className="td-ringfig" />} dayChip={perfect ? 'Perfect day' : '2 of 4 closed'} perfect={perfect} moment={null} next={null} log={null} handle={null} />);
const noop = () => {};

describe('A perfect day, without gold (h7-perfect)', () => {
  it('sets the glow class on the day panel when all the rings closed, and says so in its chip', () => {
    const html = layout(true);
    expect(html).toMatch(/<section class="td-panel td-perfect" aria-labelledby="td-panel-day">/);
    expect(html).toContain('>Perfect day<');
    expect(html).toMatch(/<span class="td-twinkles" aria-hidden="true">/);
  });

  it('says it is all in, with no gold text', () => {
    const html = renderToStaticMarkup(<MomentCard kind="perfect" data={{ closedRings: 4, proteinGapG: 0, gapFoods: '', addLabel: '', stepsLeft: 0 }} actions={{ logMorning: noop, closeDay: noop, addGap: noop, typeSteps: noop }} />);
    expect(html).toContain('Everything is in');
    expect(html).toContain('Close the day for its card.');
    expect(html).not.toContain('goldtxt');
    const css = readFileSync('src/styles/today.css', 'utf8');
    expect(css.slice(css.lastIndexOf('.td-moment.gold .td-moment-title'))).toMatch(/^\.td-moment\.gold \.td-moment-title \{ color: var\(--k-cream/);
    const src = readFileSync('src/screens/Today.tsx', 'utf8');
    expect(src).not.toMatch(/gold=\{moment === 'perfect'\}/);
  });

  it('names the tier on the Close the day button', () => {
    expect(renderToStaticMarkup(<DrawerHandle closeLabel="Close the day · Plated" gold onCloseDay={noop} />)).toContain('Close the day · Plated');
  });

  it('breathes as decoration only; reduced motion holds the glow still', () => {
    const css = readFileSync('src/styles/today.css', 'utf8');
    expect(css).toMatch(/\.td-perfect \.td-ringfig \{ animation: td-breathe [^}]*infinite/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.td-perfect \.td-ringfig \{ animation: none/);
  });

  it('renders with no data: no glow on an ordinary day', () => {
    const html = layout(false);
    expect(html).not.toContain('td-perfect');
    expect(html).not.toContain('td-twinkles');
  });
});
