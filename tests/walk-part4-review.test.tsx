import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CITIES, FINAL_KM, STRIDE_M } from '../src/domain/walk';
import { ArrivalFallback, ArrivalView, StampTemplate, StateLineView } from '../src/screens/walk/Arrival';
import { PassportView } from '../src/screens/walk/Passport';
import { arrivalFor, canPlayArrivalAt, passportPages } from '../src/walk/arrivals';
import { CITY_FACTS } from '../src/walk/content/cities';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);
const all = new Map([['2026-01-01', steps(FINAL_KM + 1)]]);

// Each city's real state or union territory.
const REAL: Record<string, string> = {
  Delhi: 'Delhi', Agra: 'Uttar Pradesh', Gwalior: 'Madhya Pradesh', Bhopal: 'Madhya Pradesh', Nagpur: 'Maharashtra', Hyderabad: 'Telangana', Bengaluru: 'Karnataka', Madurai: 'Tamil Nadu', Kanyakumari: 'Tamil Nadu',
  Chennai: 'Tamil Nadu', Nellore: 'Andhra Pradesh', Vijayawada: 'Andhra Pradesh', Visakhapatnam: 'Andhra Pradesh', Bhubaneswar: 'Odisha', Kolkata: 'West Bengal', Varanasi: 'Uttar Pradesh', Kanpur: 'Uttar Pradesh',
  Jaipur: 'Rajasthan', Udaipur: 'Rajasthan', Ahmedabad: 'Gujarat', Surat: 'Gujarat', Mumbai: 'Maharashtra', Pune: 'Maharashtra', Belagavi: 'Karnataka', Hubballi: 'Karnataka', Puducherry: 'Puducherry',
  Thiruvananthapuram: 'Kerala', Kavaratti: 'Lakshadweep', Panaji: 'Goa', Daman: 'Dadra and Nagar Haveli and Daman and Diu', Raipur: 'Chhattisgarh', 'Port Blair': 'Andaman and Nicobar Islands', Gangtok: 'Sikkim',
  Dispur: 'Assam', Shillong: 'Meghalaya', Agartala: 'Tripura', Aizawl: 'Mizoram', Imphal: 'Manipur', Kohima: 'Nagaland', Itanagar: 'Arunachal Pradesh', Dehradun: 'Uttarakhand', Shimla: 'Himachal Pradesh',
  Chandigarh: 'Chandigarh', Amritsar: 'Punjab', Srinagar: 'Jammu and Kashmir', Leh: 'Ladakh',
};

describe('part 4 review fixes', () => {
  it('puts every city in its real state, on its arrival and in the passport', () => {
    for (const c of CITIES) {
      expect(CITY_FACTS[c].state, c).toBe(REAL[c]);
      expect(arrivalFor(c, all, '2026-01-01')!.state, c).toBe(REAL[c]);
    }
    const page = (s: string) => passportPages(all).find((p) => p.state === s)!.cities.map((c) => c.name);
    expect(page('Andhra Pradesh')).toEqual(['Nellore', 'Vijayawada', 'Visakhapatnam']);
    expect(page('Uttar Pradesh')).toEqual(['Agra', 'Varanasi', 'Kanpur']);
    expect(page('Tamil Nadu')).toEqual(['Madurai', 'Kanyakumari', 'Chennai']);
  });

  it('plays an arrival only on Today or the Walk tab, never over an open sheet', () => {
    expect(canPlayArrivalAt('#/today')).toBe(true);
    expect(canPlayArrivalAt('#/walk')).toBe(true);
    expect(canPlayArrivalAt('')).toBe(true);
    expect(canPlayArrivalAt('#/today?sheet=steps')).toBe(false);
    expect(canPlayArrivalAt('#/session?id=x')).toBe(false);
  });

  it('can be stepped through by keyboard, and the state line has a way out', () => {
    const a = arrivalFor('Agra', all, '2026-01-01')!;
    expect(renderToStaticMarkup(<ArrivalView a={a} beat={2} onNext={() => {}} onSkip={() => {}} />)).toMatch(/<button[^>]*class="walk-arr-next"[^>]*>Next<\/button>/);
    expect(renderToStaticMarkup(<StateLineView state="Bihar" ut={false} counts={{ states: 1, uts: 0 }} landFrom="the plains" landNow="the plains" onNext={() => {}} />)).toMatch(/<button[^>]*>Back to the walk<\/button>/);
  });

  it('says a stamp’s date in words and in readable text', () => {
    expect(renderToStaticMarkup(<StampTemplate name="Agra" state="Uttar Pradesh" n={2} ut={false} date="2 Oct" />)).toContain('aria-label="Passport stamp: arrived, Agra, Uttar Pradesh, 2 Oct"');
    const html = renderToStaticMarkup(<PassportView pages={passportPages(all).slice(0, 3)} startDay="2026-01-01" onReplay={() => {}} />);
    expect(html).toMatch(/<span class="walk-pg-date">\d+ \w+<\/span>/);
  });

  it('doesn’t replay a 0 km arrival at the start', () => {
    const html = renderToStaticMarkup(<PassportView pages={passportPages(all).slice(0, 1)} startDay="2026-01-01" onReplay={() => {}} />);
    expect(html).not.toContain('Replay Delhi');
    expect(html).toContain('Where the walk began');
  });

  it('names the state on a territory’s or a long-named state’s stamp in full', () => {
    expect(renderToStaticMarkup(<StampTemplate name="Itanagar" state="Arunachal Pradesh" n={40} ut={false} />)).toContain('ARUNACHAL PRADESH');
    expect(renderToStaticMarkup(<StampTemplate name="Daman" state="Dadra and Nagar Haveli and Daman and Diu" n={30} ut />)).toContain('DADRA AND NAGAR HAVELI AND DAMAN AND DIU');
  });

  it('says a city is not reached yet rather than not on the walk', () => {
    expect(renderToStaticMarkup(<ArrivalFallback city="Bhopal" onBack={() => {}} />)).toContain('You haven’t reached Bhopal yet.');
    expect(renderToStaticMarkup(<ArrivalFallback city="Atlantis" onBack={() => {}} />)).toContain('isn’t on the walk');
  });

  it('keeps the heights the city articles give', () => {
    expect(CITY_FACTS.Hubballi.heightM).toBe(671);
    expect(CITY_FACTS.Chandigarh.heightM).toBe(321);
    expect(CITY_FACTS.Belagavi.heightM).toBe(770);
  });
});
