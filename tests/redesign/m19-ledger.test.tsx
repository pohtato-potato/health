import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Offer } from '../../src/football/money';
import { OfferLetter, SponsorList } from '../../src/screens/football/club/Money';

const o: Offer = { brand: 'Testbrand Motors', what: 'Cars', risk: 'flashy', slot: 'partner', perSeason: 1.25, seasons: 2, line: 'A test line.' };

describe('m19 Money, the ledger', () => {
  it('an offer is a letter: brand, sum, slot, risk in words, seasons, its line, and Sign', () => {
    const out = html(<OfferLetter o={o} i={0} />);
    expect(out).toContain('class="of19-l"');
    expect(out).toContain('Testbrand Motors');
    expect(out).toContain('€1.25m');
    expect(out).toContain('Partner · Flashy · 2 seasons');
    expect(out).toContain('A test line.');
    expect(out).toContain('Sign Testbrand Motors');
  });
  it('the sponsors: each with what it brings and its risk named', () => {
    const out = html(<SponsorList sponsors={[{ ...o, since: 1 }]} scale={1} />);
    expect(out).toContain('class="sl19"');
    expect(out).toContain('Testbrand Motors');
    expect(out).toContain('>Flashy<');
  });
});
