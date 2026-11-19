import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChecklistPanel } from '../../src/screens/today/LogBelow';

const at = (h: number, m: number) => new Date(2026, 0, 2, h, m).getTime();
// Invented items.
const items = [
  { key: 'a', name: 'Vitamin D', on: true, at: at(8, 10) },
  { key: 'b', name: 'Stretch', on: true, at: at(8, 20) },
  { key: 'c', name: 'Fibre', on: false },
  { key: 'd', name: 'Floss', on: false },
];
const panel = (xs = items) => renderToStaticMarkup(<ChecklistPanel items={xs} onToggle={() => {}} />);

describe('Checklist, hold to tick (k7-live, k7-frames)', () => {
  it('heads the panel "Checklist" with the count done', () => {
    const html = panel();
    expect(html).toMatch(/<h2 class="td-panel-title"[^>]*>Checklist<\/h2>/);
    expect(html).toContain('2 of 4');
  });

  it('shows the time on a ticked row and "hold" on one to do', () => {
    const html = panel();
    expect(html).toMatch(/Vitamin D<\/span><span class="td-ck-when tn">8:10 am<\/span>/);
    expect(html).toMatch(/Fibre<\/span><span class="td-ck-when hold">hold<\/span>/);
  });

  it('says what each row is and how to change it, as a button that Enter or a screen reader can press', () => {
    const html = panel();
    expect(html).toMatch(/<button type="button" class="td-hold[^"]*" aria-pressed="true" aria-label="Vitamin D, ticked at 8:10 am. Press and hold to untick"/);
    expect(html).toMatch(/aria-label="Fibre, to do. Press and hold to tick"/);
    const src = readFileSync('src/screens/today/LogBelow.tsx', 'utf8');
    expect(src).toMatch(/e\.detail === 0/);
  });

  it('loops the hint ring on the next row to do, and only there', () => {
    const html = panel();
    expect((html.match(/td-ck-ring hint/g) ?? []).length).toBe(1);
    expect(html.indexOf('td-ck-ring hint')).toBeGreaterThan(html.indexOf('Stretch'));
    const css = readFileSync('src/styles/today.css', 'utf8');
    expect(css).toMatch(/\.td-ck-ring\.hint[^{]*\{[^}]*infinite/);
  });

  it('renders with no data: nothing at all', () => {
    expect(panel([])).toBe('');
  });
});
