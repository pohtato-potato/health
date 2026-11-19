import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayLayout, panelVars } from '../../src/screens/today/TodayLayout';
import { THEMES } from '../../src/domain/themes';

const css = readFileSync('src/styles/today.css', 'utf8');

describe('Twelve themes on Home C (t7-themes)', () => {
  it('hands the theme’s four ring inks to the page', () => {
    const inks = ['#111111', '#222222', '#333333', '#444444'] as const;
    const html = renderToStaticMarkup(<TodayLayout walk={null} line={null} rings={null} moment={null} next={null} log={null} handle={null} light={panelVars(inks)} />);
    expect(html).toContain('--td-i1:#111111');
    expect(html).toContain('--td-i4:#444444');
  });

  it('gives every theme four inks to hand over', () => {
    for (const t of THEMES) expect(Object.keys(panelVars(t.look.ring.inks))).toHaveLength(4);
  });

  it('colours the aurora and the panel bars from those inks, with the Dusk inks as the fallback', () => {
    const aur = css.slice(css.indexOf('.td-aur {'), css.indexOf('@keyframes td-aur'));
    for (const v of ['--td-i1', '--td-i2', '--td-i3', '--td-i4']) expect(aur).toContain(`var(${v}`);
    const bar = css.slice(css.indexOf('.td-panel-bar {'));
    expect(bar.slice(0, bar.indexOf('}'))).toContain('var(--td-i1');
  });
});
