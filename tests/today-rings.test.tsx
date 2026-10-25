import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RingsNumbers, type RingRow } from '../src/screens/today/RingsNumbers';

const rows = (stepsKnown = true): RingRow[] => [
  { key: 'kcal', name: 'Calories', value: '1,640', unit: 'kcal', target: '1,840–2,190', ink: 'var(--kcal)', known: true },
  { key: 'protein', name: 'Protein', value: '98', unit: 'g', target: 'of 130 g', ink: 'var(--protein)', known: true },
  { key: 'steps', name: 'Steps', value: stepsKnown ? '7,310' : '—', unit: 'steps', target: 'of 10,000', ink: 'var(--steps)', known: stepsKnown },
];
const render = (r: RingRow[]) => renderToStaticMarkup(<RingsNumbers rows={r} rings={<svg />} closed={0} onLogFood={() => {}} onSaveSteps={() => {}} showCopyHint={false} />);

describe('RingsNumbers', () => {
  it('at rest shows only each number and its unit', () => {
    const html = render(rows());
    for (const t of ['1,640', 'kcal', '98', '>g<', '7,310', 'steps']) expect(html).toContain(t);
    expect(html).not.toContain('of 130');
    expect(html).not.toContain('%');
    expect(html.toLowerCase()).not.toContain('closed<');
  });
  it('shows steps not logged as "—", never 0', () => {
    const html = render(rows(false));
    expect(html).toContain('—');
    expect(html).not.toMatch(/>0<\/b>/);
  });
  it('makes each number a button labelled with the ring, value and unit', () => {
    const html = render(rows());
    expect(html).toContain('aria-label="Calories 1,640 kcal. Show target"');
    expect(html).toContain('aria-label="Steps 7,310 steps. Show target"');
    expect((html.match(/class="td-num"/g) ?? []).length).toBe(3);
  });
  it('sits in the rings slot', () => {
    expect(render(rows())).toContain('data-section="rings"');
  });
});
