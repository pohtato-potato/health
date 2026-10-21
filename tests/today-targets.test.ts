import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = ['app.css', 'components.css'].map((f) => readFileSync(new URL(`../src/styles/${f}`, import.meta.url), 'utf8')).join('\n');

/** The px value of a height or min-height in the first rule for this exact selector. */
function heightOf(selector: string): number | undefined {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) return undefined;
  const body = css.slice(start, css.indexOf('}', start));
  const m = body.match(/(?:^|\s)(?:min-)?height:\s*(\d+)px/);
  return m ? Number(m[1]) : undefined;
}

describe('Pill Rule: nothing tappable on Today is under 44 px at the standard text size', () => {
  for (const sel of ['.place-chip', '.ring-row', '.btn.sm', '.chip.sm', '.chip', '.btn'])
    it(`${sel} is at least 44 px`, () => {
      expect(heightOf(sel)).toBeGreaterThanOrEqual(44);
    });
});
