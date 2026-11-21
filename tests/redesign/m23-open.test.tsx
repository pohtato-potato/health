import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OpeningNight, openingOf } from '../../src/screens/football/moments/OpeningNight';

describe('Opening night (m23-open)', () => {
  it('the building icon is the orb’s centre piece; the name and what it does are words', () => {
    const out = renderToStaticMarkup(<OpeningNight id="moving-day" onDone={() => {}} />);
    expect(out).toMatch(/<span class="orb-core"><svg [^>]*aria-hidden="true"><path d="M3 21h18/);
    expect(out).toContain('Opening<br/><span>night</span>');
    expect(out).toContain('<p class="mo-name">Kaai 42</p>');
    expect(out).toContain('the groundshare ends');
    expect(out).toContain('>Lights on</button>');
  });
  it('an unknown id still opens with plain words', () => {
    expect(openingOf('no-such-thing')).toEqual({ name: 'A new building', effect: 'Built.' });
  });
});
