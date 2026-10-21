import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = ['app.css', 'components.css'].map((f) => readFileSync(new URL(`../src/styles/${f}`, import.meta.url), 'utf8')).join('\n');

/** The body of the first rule for this exact selector. */
function rule(selector: string): string | undefined {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) return undefined;
  return css.slice(start, css.indexOf('}', start));
}
/** The px value of a height or min-height in that rule. */
function heightOf(selector: string): number | undefined {
  const m = rule(selector)?.match(/(?:^|\s)(?:min-)?height:\s*(\d+)px/);
  return m ? Number(m[1]) : undefined;
}
/** The tap area: the visible height plus an invisible ::after that reaches beyond it top and bottom. */
function hitOf(selector: string): number | undefined {
  const h = heightOf(selector);
  if (h === undefined) return undefined;
  const m = rule(`${selector}::after`)?.match(/inset:\s*-(\d+)px/);
  return h + (m ? 2 * Number(m[1]) : 0);
}

describe('Pill Rule: everything tappable on Today has a 44 px tap area at the standard text size', () => {
  for (const sel of ['.place-chip', '.ring-row', '.btn.sm', '.chip.sm', '.chip', '.btn'])
    it(`${sel} has a tap area of at least 44 px`, () => {
      expect(hitOf(sel)).toBeGreaterThanOrEqual(44);
    });
});

describe('Bordered small controls keep their look; only the tap area grows', () => {
  for (const [sel, px] of [['.place-chip', 34], ['.btn.sm', 40], ['.chip.sm', 36]] as const)
    it(`${sel} still looks ${px} px tall`, () => {
      expect(heightOf(sel)).toBe(px);
    });
});
