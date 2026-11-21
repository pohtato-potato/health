import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ApptLeaf, DoseGrid, MedHero, StockBar } from '../../src/screens/meds/MedParts';

const DAYS = ['2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10'];

describe('y9-meds Medicines', () => {
  it('the hero gives the month in words', () => {
    const out = html(<MedHero taken={40} planned={42} late={1} missed={1} />);
    expect(out).toContain('40 of 42');
    expect(out).toContain('Doses on time this month. One late and one missed.');
    expect(html(<MedHero taken={0} planned={0} late={0} missed={0} />)).toContain('Nothing due this month');
  });

  it('the last seven days per medicine say each day in words, not colour alone', () => {
    const out = html(<DoseGrid days={DAYS} rows={[{ name: 'Test tablet', tones: ['on-time', 'late', 'missed', 'none', 'on-time', 'on-time', 'on-time'] }]} />);
    expect(out).toContain('Test tablet');
    expect(out).toMatch(/aria-label="Wed 4 Mar: on time"/);
    expect(out).toMatch(/aria-label="Thu 5 Mar: late"/);
    expect(out).toMatch(/aria-label="Fri 6 Mar: missed"/);
    expect(out).toMatch(/aria-label="Sat 7 Mar: nothing due"/);
    expect(out).toContain('On time');
    expect(out).toContain('Missed');
  });

  it('the stock bar says how many are left and turns low inside a week', () => {
    const low = html(<StockBar left={6} daysLeft={3} refill="2026-03-13" today="2026-03-10" />);
    expect(low).toContain('6 left');
    expect(low).toContain('refill by 13 Mar');
    expect(low).toContain('md-low');
    const ok = html(<StockBar left={30} daysLeft={30} refill="2026-04-09" today="2026-03-10" />);
    expect(ok).not.toContain('md-low');
  });

  it('an appointment as a calendar leaf', () => {
    const out = html(<ApptLeaf date="2026-12-04" title="Test visit" when="Fri 4 Dec, 5:30 pm" />);
    expect(out).toContain('Dec');
    expect(out).toContain('>4<');
    expect(out).toContain('Test visit');
  });
});
