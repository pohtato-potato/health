import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
const today = readFileSync(new URL('../src/screens/Today.tsx', import.meta.url), 'utf8');

describe('No meaning-carrying text under 14 px on Today at the standard size', () => {
  it('tab bar labels are 14 px', () => {
    const start = app.indexOf('\n.tabbar a,\n.tabbar button {');
    const body = app.slice(start, app.indexOf('}', start));
    expect(Number(body.match(/font-size:\s*(\d+)px/)?.[1])).toBeGreaterThanOrEqual(14);
  });
  it('ring targets ("of 130") use the 14 px size', () => {
    expect(today).not.toMatch(/className="t12 q grow right tn"/);
    expect(today).toMatch(/className="t14 q grow right tn"/);
  });
});
