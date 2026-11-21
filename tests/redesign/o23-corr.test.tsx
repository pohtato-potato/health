import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CorrLedger } from '../../src/screens/reports/CorrLedger';

describe('o23-corr Corrections', () => {
  it('an empty ledger says so, with a count of 0 nowhere', () => {
    const out = html(<CorrLedger rows={[]} onRemove={() => {}} />);
    expect(out).toContain('The ledger');
    expect(out).toContain('Nothing corrected so far.');
    expect(out).not.toMatch(/>0</);
  });
  it('each correction: what and when, the new number, what it was and why, and Remove', () => {
    const out = html(<CorrLedger onRemove={() => {}} rows={[{ id: 'a', at: 0, date: '2026-03-02', what: 'Steps', was: '1,000', now: '2,000', note: 'Phone died' }]} />);
    expect(out).toMatch(/<h2 class="ar-h">The ledger<\/h2><span>1<\/span>/);
    expect(out).toContain('Steps, 2 Mar: 2,000');
    expect(out).toContain('Was 1,000. Phone died');
    expect(out).toContain('aria-label="Remove the correction to Steps, 2 Mar"');
  });
});
