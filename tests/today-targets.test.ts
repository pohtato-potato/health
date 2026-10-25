import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = ['app.css', 'components.css', 'today.css', 'access.css'].map((f) => readFileSync(new URL(`../src/styles/${f}`, import.meta.url), 'utf8')).join('\n');

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
/** The ::after rule for a selector, alone or in a group of selectors. */
function afterOf(selector: string): string | undefined {
  const re = new RegExp(`\\n((?:[^{}\\n]+,\\n)*)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}::after(?:,\\n[^{}]+)? \\{([^}]*)\\}`);
  return css.match(re)?.[2];
}
/** The tap area: the visible height plus an invisible ::after that reaches beyond it, or one centred at a 44 px minimum. */
function hitOf(selector: string): number | undefined {
  const h = heightOf(selector) ?? 0;
  const after = afterOf(selector);
  const inset = after?.match(/inset:\s*-(\d+)px/);
  const min = after?.match(/height:\s*max\(100%,\s*(\d+)px\)/);
  return Math.max(h + (inset ? 2 * Number(inset[1]) : 0), min ? Number(min[1]) : 0);
}

describe('Pill Rule: everything tappable on Today has a 44 px tap area at the standard text size', () => {
  for (const sel of ['.td-num', '.td-banner-act', '.td-banner-x', '.btn.sm', '.chip.sm', '.chip', '.btn'])
    it(`${sel} has a tap area of at least 44 px`, () => {
      expect(hitOf(sel)).toBeGreaterThanOrEqual(44);
    });
});

describe('The pages Today opens and the sheets: small controls reach 44 px without changing their look', () => {
  for (const sel of ['.tap44', '.tool', '.seg button', '.grip'])
    it(`${sel} has a tap area of at least 44 px`, () => {
      expect(hitOf(sel)).toBeGreaterThanOrEqual(44);
      expect(afterOf(sel)).toMatch(/width:\s*max\(100%,\s*44px\)/);
    });
});

describe('Bordered small controls keep their look; only the tap area grows', () => {
  for (const [sel, px] of [['.btn.sm', 40], ['.chip.sm', 36]] as const)
    it(`${sel} still looks ${px} px tall`, () => {
      expect(heightOf(sel)).toBe(px);
    });
});
