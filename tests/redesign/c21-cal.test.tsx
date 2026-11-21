import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Calendar, TonightLead } from '../../src/screens/football/league/Calendar';

describe('c21 Calendar', () => {
  it('tonight leads: both crests, who, and the round in words', () => {
    const out = html(<TonightLead us="<svg></svg>" them="<svg></svg>" name="Testville Rovers" line="Day 3 of 28 · Big Cup, Last 128 · at home" />);
    expect(out).toContain('class="tn21"');
    expect(out).toContain('Testville Rovers, tonight');
    expect(out).toContain('Day 3 of 28 · Big Cup, Last 128 · at home');
  });
  it('the season’s days follow in order, tonight marked in words', () => {
    const out = html(<Calendar season={1} today={3} matches={[]} world={2} lead={<p>lead</p>} />);
    expect(out.indexOf('lead')).toBeLessThan(out.indexOf('fb-calgrid'));
    const days = [...out.matchAll(/aria-label="Day (\d+),/g)].map((m) => Number(m[1]));
    expect(days).toEqual([...days].sort((a, b) => a - b));
    expect(out).toMatch(/aria-label="Day 3, [^"]*, today"/);
  });
});
