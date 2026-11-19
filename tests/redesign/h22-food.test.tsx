import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { FoodBar } from '../../src/screens/FoodBar';

// Invented sample numbers.
const byMeal = { breakfast: 400, lunch: 600, snacks: 200, dinner: 0 };
const bar = (fill = 40) =>
  renderToStaticMarkup(<FoodBar kcal={1200} byMeal={byMeal} aimMin={2000} aimMax={2200} scale={3000} fill={fill} />);

describe('Food: the meal bar (h22-food, f4-bar)', () => {
  it('builds the fill from one segment per logged meal, sized by its calories', () => {
    const html = bar();
    const segs = [...html.matchAll(/<span class="fd-seg m-(\w+)" style="flex:(\d+)/g)].map((m) => [m[1], m[2]]);
    expect(segs).toEqual([['breakfast', '400'], ['lunch', '600'], ['snacks', '200']]);
    expect(html).toContain('class="fd-segs" style="width:40%"');
  });

  it('draws the aim as a band', () => {
    expect(bar()).toMatch(/class="ok" style="left:66\.\d+%;width:6\.\d+%"/);
  });

  it('names each meal under the bar with a letter and its calories, a dash when not logged', () => {
    const letters = [...bar().matchAll(/<span class="m-(\w+)">([^<]+)<\/span>/g)].map((m) => m[2]);
    expect(letters).toEqual(['B 400', 'L 600', 'S 200', 'D —']);
  });

  it('says it all in words for a screen reader', () => {
    expect(bar()).toContain('aria-label="1,200 kcal: breakfast 400, lunch 600, snacks 200, dinner not logged. The aim is 2,000 to 2,200."');
  });

  it('writes no "to the aim" words over the bar', () => {
    expect(bar()).not.toMatch(/to the aim/);
  });

  it('keeps the bar still once poured: no looping animation on the fill', () => {
    const css = readFileSync('src/styles/food.css', 'utf8');
    const segs = css.slice(css.indexOf('.fd-segs'));
    expect(segs.slice(0, segs.indexOf('}'))).not.toMatch(/infinite/);
  });
});
