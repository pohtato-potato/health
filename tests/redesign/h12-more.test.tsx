import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// MoreSheet reads the database through hooks, so its rows are pinned in the source and the stylesheet.
const src = readFileSync('src/sheets/LogSheet.tsx', 'utf8');
const css = readFileSync('src/styles/components.css', 'utf8');

describe('The + sheet (h12-more)', () => {
  it('gives every entry an icon badge and a label', () => {
    expect(src).toMatch(/<span className="mr-ic" aria-hidden="true"><Icon name=\{icon\} size=\{24\} \/><\/span>\s*<span className="mr-tx"><b>\{title\}<\/b>/);
    for (const [k, label] of [['drk', 'Drinks'], ['nit', 'Night out'], ['fre', 'Free meal'], ['wst', 'Waist'], ['chk', 'Check-in']]) expect(src).toMatch(new RegExp(`row\\('${k}', '[a-z]+', '${label}'`));
    expect(src).toMatch(/className="mr-row mr-sta"[\s\S]*<Icon name="sun" size=\{24\} \/>[\s\S]*>Status</);
  });

  it('carries each theme on the row’s border', () => {
    for (const k of ['drk', 'nit', 'fre', 'wst', 'chk', 'sta']) expect(css).toMatch(new RegExp(`\\.mr-${k} \\{[^}]*(--bd|box-shadow)`));
  });

  it('keeps every row at least 44 px, with no reduced-motion variant', () => {
    expect(css).toMatch(/\.mr-row \{[^}]*min-height: 68px/);
    expect(css).not.toContain('prefers-reduced-motion'); // no reduced-motion variants (PRODUCT.md)
  });

  it('renders with no data: each row still has words when nothing is logged', () => {
    expect(src).toContain("'None today. Logged quietly.'");
    expect(src).toContain("'Monthly: photos and the tape'");
    expect(src).toContain("'Relaxed, tucked, slouched, shoulders'");
  });
});
