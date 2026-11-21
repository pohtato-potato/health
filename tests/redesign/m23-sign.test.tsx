import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Signing } from '../../src/screens/football/moments/Signing';
import type { FbSave } from '../../src/football/store/tables';

const save = (risk: 'stable' | 'flashy' | 'dodgy') => ({
  season: 2, kits: [], signed: { brand: 'Test Brand Co', slot: 'shirt', perSeason: 1.2, seasons: 2, advance: 0.3, since: 2, risk, line: 'A test line.' },
}) as unknown as FbSave;

describe('A sponsor signs (m23-sign)', () => {
  it('stamps SIGNED over the brand, then the four rows from the stored deal', () => {
    const out = renderToStaticMarkup(<Signing save={save('flashy')} onKeep={() => {}} />);
    expect(out).toContain('<span class="mo-stamp" aria-hidden="true">SIGNED</span>');
    expect(out).toContain('Test<br/><span>Brand Co</span>');
    expect(out.match(/class="mo-row"/g)).toHaveLength(4);
    expect(out).toContain('On the shirt · two seasons · from season 2');
    expect(out).toContain('Paid today');
    expect(out).toContain('A habit clause');
    expect(out).toContain('It will see the deal out');
    expect(out).toContain('>Keep it</button>');
  });
  it('says when it may fold, and shows nothing without a deal', () => {
    expect(renderToStaticMarkup(<Signing save={save('dodgy')} onKeep={() => {}} />)).toContain('It may fold');
    expect(renderToStaticMarkup(<Signing save={{ season: 2 } as unknown as FbSave} onKeep={() => {}} />)).toBe('');
  });
});
