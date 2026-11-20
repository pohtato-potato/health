import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MatchCard, fogLine } from '../../src/screens/today/MatchToday';
import { TodayLine } from '../../src/screens/today/TodayLine';

// Invented club and numbers.
const card = (pct?: [number, number, number]) =>
  renderToStaticMarkup(<MatchCard title="Test Town (A) · 4 am" pct={pct} inks={['#fa0', '#ccc', '#f00']} fogLine="Power in fog: no data." notes={[]} radar={<svg />} />);

describe('Home after the owner’s review (h6-c)', () => {
  it('starts at Today: the date and place under the heading, no walk banner, no Quick add, no session strip in Next', () => {
    const src = readFileSync('src/screens/Today.tsx', 'utf8');
    expect(src).not.toContain('<WalkTop');
    expect(src).not.toContain('Quick add');
    expect(src).not.toContain('<NextUpCard');
    expect(src).not.toContain('<DueCard');
    expect(src).not.toContain('Body log');
    const html = renderToStaticMarkup(<TodayLine head="Today" level={1} sub="Thu 1 Jan · Home" text="" kind="glance" clock="9:00 am" />);
    expect(html).toMatch(/<h1 class="td-head">Today<\/h1>[\s\S]*<p class="td-sub">Thu 1 Jan · Home<\/p>/);
  });

  it('lets the rings fill their half of The day', () => {
    const css = readFileSync('src/styles/today.css', 'utf8');
    expect(css).toMatch(/\.td-panel \.td-rings-row \{ display: grid; grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/\.td-panel \.td-ringfig svg \{ display: block; width: 100%/);
    // The ring button shrinks with its column at 340–360 px, so the drawing never runs under the bars.
    expect(css).toMatch(/\.td-panel \.td-ringfig > \.lr, \.td-panel \.td-ringfig \.lr-spin \{ display: block; width: 100%/);
  });

  it('puts tonight’s match in one panel: opponent and kick-off, the win chip, three numbers, the shape', () => {
    const html = card([31, 27, 42]);
    expect(html).toMatch(/<h2 class="td-panel-title"[^>]*>Test Town \(A\) · 4 am<\/h2><span class="td-pchip"[^>]*>31% win<\/span>/);
    expect(html).toContain('win 31 in 100, draw 27, loss 42');
    expect(html).toMatch(/<b>Tonight’s shape<\/b><span> · Power in fog: no data.<\/span>/);
    expect(html).not.toMatch(/Pace \d+ tonight|lead you on|played out/);
  });

  it('says the fog in one line', () => {
    expect(fogLine(['Power'], ['Rest'])).toBe('Power in fog: no data. Rest not logged yet.');
    expect(fogLine([], [])).toBeUndefined();
  });

  it('renders with no data: no chance yet, no chip and no numbers', () => {
    const html = card();
    expect(html).not.toContain('td-pchip');
    expect(html).not.toContain('tm-pcts');
    expect(html).toContain('Tonight’s shape');
  });
});
