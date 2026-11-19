import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusChip } from '../../src/screens/today/StatusChip';
import { CHIP_STATUSES } from '../../src/domain/statusChip';

const src = readFileSync('src/screens/today/StatusChip.tsx', 'utf8');
const css = readFileSync('src/styles/today.css', 'utf8');

describe('Status, for an occasion (h10-status)', () => {
  it('takes the occasions from the app’s own list', () => {
    expect(src).toMatch(/CHIP_STATUSES\.map\(\(s\) =>[\s\S]*role="radio"/);
    expect(CHIP_STATUSES.map((s) => s.label)).toEqual(['Travelling', 'Sick', 'Injured', 'Break']);
  });

  it('hangs the lanterns as decoration only, and stills them under reduced motion', () => {
    expect(src).toContain('<span className="td-lanterns" aria-hidden="true">');
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.td-lanterns i \{ animation: none/);
  });

  it('asks what is going on, and says what turning it on does', () => {
    expect(src).toContain('What’s going on?');
    expect(src).toContain('Calories go up to maintenance while it lasts.');
    expect(src).toContain("'Turn it on'");
  });

  it('renders with no data: the closed chip with no status', () => {
    const html = renderToStaticMarkup(<StatusChip today="2026-01-05" days={[]} />);
    expect(html).toContain('td-chip');
    expect(html).not.toContain('td-lanterns');
  });
});
