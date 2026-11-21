import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LivingMonth } from '../../src/screens/reports/LivingMonth';

const cal = [{ closed: 4, of: 4 }, { closed: 2, of: 4 }, null, { closed: 4, of: 4 }, 'later', 'later'] as const;

describe('p5-reports Reports, a living month', () => {
  it('the month as a calendar with each day named, records ringed, and days to come plain', () => {
    const out = html(<LivingMonth month="2026-03" cal={[...cal]} records={new Set(['2026-03-04'])} frames={[]} onPlay={() => {}} />);
    expect(out).toContain('March');
    expect(out).toContain('4 days in');
    expect(out).toMatch(/aria-label="1 Mar: Plated, every ring"/);
    expect(out).toMatch(/aria-label="2 Mar: Clean, two of four rings"/);
    expect(out).toMatch(/aria-label="3 Mar: not logged"/);
    expect(out).toMatch(/class="lm-d rec"[^>]*aria-label="4 Mar: Plated, every ring, a record"/);
    expect(out).toContain('lm-d later');
  });
  it('a key that counts the days in words', () => {
    const out = html(<LivingMonth month="2026-03" cal={[...cal]} records={new Set(['2026-03-04'])} frames={[]} onPlay={() => {}} />);
    expect(out).toContain('Plated: 2');
    expect(out).toContain('Clean: 1');
    expect(out).toContain('Not logged: 1');
    expect(out).toContain('White ring: a record');
  });
  it('the story so far is one button, named', () => {
    expect(html(<LivingMonth month="2026-03" cal={[...cal]} records={new Set()} frames={[]} onPlay={() => {}} />)).toContain('aria-label="Play the story of March so far"');
  });
  it('the month’s moments as frames, when there are some', () => {
    const out = html(<LivingMonth month="2026-03" cal={[...cal]} records={new Set()} frames={[{ id: 'a', text: 'A test record', date: '2026-03-04' }]} onPlay={() => {}} />);
    expect(out).toContain('A test record');
    expect(out).toContain('4 Mar');
  });
});
