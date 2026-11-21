import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SetRowHead } from '../../src/screens/settings/SetRow';

describe('y9-settings Settings', () => {
  it('a row: its icon in a square of its colour, its name, and its value in that colour', () => {
    const out = html(<SetRowHead icon="save" ink="#5fe3a1" title="Backups and data" sub="Last backup today" end="right" />);
    expect(out).toContain('class="k-set-ic"');
    expect(out).toContain('--c:#5fe3a1');
    expect(out).toContain('Backups and data');
    expect(out).toMatch(/class="k-q k-set-v"[^>]*>Last backup today/);
  });
  it('a row without a value still names itself', () => {
    expect(html(<SetRowHead icon="save" ink="#5fe3a1" title="Backups" end="up" />)).toContain('Backups');
  });
});
