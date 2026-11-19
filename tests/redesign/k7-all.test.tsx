import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChecklistPanel, allWord } from '../../src/screens/today/LogBelow';

// Invented items.
const items = (n: number, done: number) => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, name: `Item ${i + 1}`, on: i < done, at: i < done ? new Date(2026, 0, 2, 8, i).getTime() : undefined }));
const panel = (n: number, done: number) => renderToStaticMarkup(<ChecklistPanel items={items(n, done)} onToggle={() => {}} />);

describe('Checklist, the last tick of the day (k7-all)', () => {
  it('says "All six" in the chip when all six are done', () => {
    expect(panel(6, 6)).toMatch(/class="td-pchip"[^>]*>All six</);
  });

  it('turns gold only when everything is done', () => {
    expect(panel(6, 6)).toMatch(/class="td-panel td-ck-all"/);
    expect(panel(6, 5)).not.toContain('td-ck-all');
    expect(panel(6, 5)).toContain('5 of 6');
  });

  it('writes small counts as words and large ones as numbers', () => {
    expect(allWord(1)).toBe('Done');
    expect(allWord(4)).toBe('All four');
    expect(allWord(14)).toBe('All 14');
  });

  it('sends the gold light down the list once, never on a loop, and not with reduced motion', () => {
    const css = readFileSync('src/styles/today.css', 'utf8');
    const rule = css.slice(css.indexOf('.td-ck-all.sweep'));
    expect(rule.slice(0, rule.indexOf('}'))).not.toMatch(/infinite/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^}]*\.td-ck-all\.sweep/);
  });

  it('renders with no data: nothing', () => {
    expect(panel(0, 0)).toBe('');
  });
});
