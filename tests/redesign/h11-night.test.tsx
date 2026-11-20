import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// NightOutSheet reads the database and portals into document.body, so its parts are pinned in the source and CSS.
const src = readFileSync('src/sheets/NightOut.tsx', 'utf8');
const css = readFileSync('src/styles/components.css', 'utf8');

describe('Night out, all neon (h11-night)', () => {
  it('puts the whole sheet in the neon world with the sign as its heading', () => {
    expect(src).toMatch(/<Sheet title="Night out" tall className="no-neon" head=\{\s*<div className="no-sign">\s*<b>Night out<\/b>\s*<span>Have a good one\.<\/span>/);
    expect(src).toMatch(/<span className="no-bokeh" aria-hidden="true">/);
  });

  it('renders its fields: who, what you ate, the free meal, drinks, tonight, tomorrow and Save', () => {
    for (const s of ['With who, or where? Optional', 'What you ate, one thing at a time', 'Count it as this week', 'className="col gap8 no-tube no-drinks"', 'Tonight, roughly', 'Tomorrow, Health eases off', 'Save night out']) expect(src).toContain(s);
    expect(css).toMatch(/\.no-neon \.field \{[^}]*border: 1\.5px solid #22c4ff/);
    expect(css).toMatch(/\.no-tom \{[^}]*dashed #5fe3a1/);
    expect(css).toMatch(/\.no-neon \.no-save \{[^}]*background: #ff4fd8/);
  });

  it('moves only the sign’s tube and the dots, never text', () => {
    const sign = css.slice(css.indexOf('.no-sign b {'));
    expect(sign.slice(0, sign.indexOf('}'))).not.toMatch(/animation/);
    expect(css).toMatch(/@keyframes no-tube \{[^}]*box-shadow/);
    expect(css).not.toContain('prefers-reduced-motion'); // no reduced-motion variants (PRODUCT.md)
  });

  it('keeps every line at 14 px or more', () => {
    expect(src).not.toMatch(/t13/);
  });

  it('renders with no data: no drinks says so in words', () => {
    expect(src).toContain("'No drinks: Designated driver.'");
  });
});
