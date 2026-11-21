import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AllClear } from '../../src/screens/settings/DataParts';

describe('o23-check Checkup', () => {
  it('all clear: a tick that draws itself, and the line says what was checked', () => {
    const out = html(<AllClear />);
    expect(out).toContain('Nothing looks off');
    expect(out).toMatch(/Empty days, double entries, odd weights and steps, open sessions and doses ticked twice/);
    expect(out).toMatch(/<path[^>]*class="dc-tick"/);
  });
});
