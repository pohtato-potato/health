import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { STRIDE_M } from '../src/domain/walk';
import { ArrivalFallback, ArrivalView, StampTemplate, StateLineView } from '../src/screens/walk/Arrival';
import { arrivalFor } from '../src/walk/arrivals';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);
const road = new Map([['2026-01-01', steps(100)], ['2026-01-02', steps(140)], ['2026-01-03', steps(115)]]);
const agra = arrivalFor('Agra', road, '2026-01-01')!;
const view = (beat: number) => renderToStaticMarkup(<ArrivalView a={agra} beat={beat} onNext={() => {}} onSkip={() => {}} />);

describe('the arrival on screen', () => {
  it('names the city, the day, the state and its height on the approach', () => {
    const html = view(1);
    expect(html).toContain('aria-label="Agra"');
    expect(html).toContain('Uttar Pradesh · day 2 · 230 km from Delhi');
    expect(html).toContain('170 m above sea level');
  });

  it('counts the steps, zooms out, races and stamps', () => {
    expect(view(2)).toContain('steps, from Delhi to Agra');
    expect(view(3)).toContain('states and territories walked into');
    expect(view(4)).toContain('The same 230 km, at other speeds');
    expect(view(5)).toContain('aria-label="Passport stamp: arrived, Agra, Uttar Pradesh"');
    expect(view(5)).toContain('Stamped · 2 of 46');
  });

  it('has Skip on every beat, and says which beat it is in words', () => {
    for (const b of [1, 2, 3, 4, 5]) {
      expect(view(b), `beat ${b}`).toMatch(/<button[^>]*>Skip<\/button>/);
      expect(view(b)).toContain(`${b} of 5`);
    }
  });

  it('fits the longest city name on its stamp', () => {
    const html = renderToStaticMarkup(<StampTemplate name="Thiruvananthapuram" state="Kerala" n={27} ut={false} />);
    expect(html).toMatch(/textLength="\d+"/);
  });

  it('draws a territory’s stamp differently from a state’s', () => {
    const state = renderToStaticMarkup(<StampTemplate name="Agra" state="Uttar Pradesh" n={2} ut={false} />);
    const ut = renderToStaticMarkup(<StampTemplate name="Delhi" state="Delhi" n={1} ut />);
    expect(state).toContain('walk-stamp state');
    expect(ut).toContain('walk-stamp ut');
    expect(ut).toContain('UNION TERRITORY');
  });

  it('marks a state line with its count and how the land has changed', () => {
    const html = renderToStaticMarkup(<StateLineView state="Madhya Pradesh" ut={false} counts={{ states: 4, uts: 1 }} landFrom="the plains" landNow="the ravines" onNext={() => {}} />);
    expect(html).toContain('Madhya Pradesh');
    expect(html).toContain('4 of 28 states · 1 of 8 union territories');
    expect(html).toContain('You set off on the plains. Now it’s the ravines.');
  });

  it('falls back calmly for a city it doesn’t know', () => {
    expect(renderToStaticMarkup(<ArrivalFallback onBack={() => {}} />)).toContain('Back to the walk');
  });
});
