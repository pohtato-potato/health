import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Sealed } from '../../src/screens/you/Sealed';

describe('y9-reveal-s Reveal, sealed', () => {
  const inside = [{ n: '3', what: 'check-ins of 7' }, { n: '2', what: 'lines sealed' }];
  it('says the days left and the date, and that nothing opens early', () => {
    const out = html(<Sealed days={129} date="2027-03-27" inside={inside} locked={false} />);
    expect(out).toContain('>129<');
    expect(out).toContain('days until 27 Mar');
    expect(out).toContain('Nothing here opens early.');
  });
  it('lists what is sealed inside, in words', () => {
    const out = html(<Sealed days={9} date="2027-03-27" inside={inside} locked={false} />);
    expect(out).toContain('Sealed inside');
    expect(out).toContain('check-ins of 7');
    expect(out).toContain('lines sealed');
  });
  it('one day left reads as one day', () => {
    expect(html(<Sealed days={1} date="2027-03-27" inside={[]} locked={false} />)).toContain('day until 27 Mar');
  });
  it('mentions the fingerprint only when photos are locked', () => {
    expect(html(<Sealed days={9} date="2027-03-27" inside={inside} locked />)).toContain('fingerprint');
    expect(html(<Sealed days={9} date="2027-03-27" inside={inside} locked={false} />)).not.toContain('fingerprint');
  });
});
