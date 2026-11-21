import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CheckSteps, RatioCard, TapeCard, TeeRow } from '../../src/screens/checkin/Parts';

describe('y8-body Body check-in, the monthly one', () => {
  it('four steps in order, named in words, the current one marked', () => {
    const out = html(<CheckSteps at="tape" />);
    const at = ['Photos', 'Tape', 'T-shirt', 'Done'].map((w) => out.indexOf(`>${w}<`));
    expect(at.every((n) => n > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(out).toMatch(/aria-current="step"[^>]*>(<i[^>]*><\/i>)?Tape</);
    expect(out).toContain('Step 2 of 4');
  });

  it('a tape reading shows its name, its number in inches and last time', () => {
    const out = html(<TapeCard label="Test waist" hint="Last time 30.2" value={30.4} onChange={() => {}} />);
    expect(out).toContain('Test waist');
    expect(out).toContain('30.4');
    expect(out).toContain('Last time 30.2');
  });

  it('the ratio says which way it moved in words', () => {
    expect(html(<RatioCard ratio={1.41} was={1.39} />)).toMatch(/1\.41.*up from 1\.39/);
    expect(html(<RatioCard ratio={1.41} />)).toContain('your starting point');
  });

  it('the T-shirt rows are five buttons each, the picked one pressed', () => {
    const out = html(<TeeRow label="Test fit" last={3} value={4} onPick={() => {}} />);
    expect(out.match(/<button/g)).toHaveLength(5);
    expect(out).toMatch(/aria-pressed="true"[^>]*>4</);
    expect(out).toContain('last time 3');
  });

  it('renders with no data', () => {
    const out = html(<TeeRow label="Test fit" value={0} onPick={() => {}} />);
    expect(out).not.toContain('aria-pressed="true"');
    expect(out).not.toContain('last time');
  });
});
