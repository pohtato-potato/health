import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Awakening } from '../../src/screens/football/moments/Awakening';
import { allAxes } from '../../src/football/types';

describe('An awakening (m23-awake)', () => {
  const values = { ...allAxes(10), Pace: 12 };
  it('the card is the orb’s centre piece; the new trait and the stretch are words', () => {
    const out = renderToStaticMarkup(<Awakening axis="Pace" at={15} values={values} onDone={() => {}}><i className="card-x" /></Awakening>);
    expect(out).toContain('<span class="orb-core"><span class="mo-card"><i class="card-x"></i></span></span>');
    expect(out).toContain('Pace<br/><span>awakens</span>');
    expect(out).toContain('New trait: Burst');
    expect(out).toContain('12 before, 15 now');
    expect(out).toContain('>Back to the club</button>');
  });
  it('with no player in the unit, the new value sits in the centre', () => {
    const out = renderToStaticMarkup(<Awakening axis="Pace" at={15} values={values} onDone={() => {}} />);
    expect(out).toContain('<span class="orb-core"><b class="mo-big">15</b></span>');
  });
});
