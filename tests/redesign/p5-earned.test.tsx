import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CaseGrid, CaseHead, Spotlight, type CaseItem } from '../../src/screens/earned/Case';

const items: CaseItem[] = [
  { id: 'a', name: 'Test walker', cat: 'steps', tier: 'g', earned: true, date: '2026-03-04' },
  { id: 'b', name: 'Test lifter', cat: 'training', tier: 's', earned: false, progress: [3, 10] },
  { id: 'c', name: 'Test secret', cat: 'secret', tier: 'b', earned: false },
];

describe('p5-earned Earned, the case', () => {
  it('the count and how full the case is, in words', () => {
    const out = html(<CaseHead got={41} total={66} />);
    expect(out).toContain('41 of 66 in the case');
    expect(out).toMatch(/role="progressbar"[^>]*aria-valuenow="41"/);
  });
  it('the newest award on its stage, named, with its date', () => {
    const out = html(<Spotlight item={items[0]} line="Walked a test distance" />);
    expect(out).toContain('Newest');
    expect(out).toContain('Test walker');
    expect(out).toContain('4 Mar');
  });
  it('each medal is named; one to earn says how close it is in words', () => {
    const out = html(<CaseGrid items={items} />);
    expect(out).toContain('Test walker');
    expect(out).toContain('Test lifter');
    expect(out).toContain('3 of 10');
    expect(out).toMatch(/class="cs-m earned/);
    expect(out).toMatch(/class="cs-m locked/);
  });
  it('a secret not yet found keeps its name hidden', () => {
    const out = html(<CaseGrid items={items} />);
    expect(out).not.toContain('Test secret');
    expect(out).toContain('A secret');
  });
});

describe('p5-earned match pass', () => {
  it('a medal is line art in its metal: an outline and a dashed inner ring, no filled gradient', async () => {
    const { Medal } = await import('../../src/screens/earned/Case');
    const out = html(<Medal item={items[0]} />);
    expect(out).toContain('stroke="#ffc94d"');
    expect(out).toMatch(/stroke-dasharray="3 4"/);
    expect(out).not.toContain('linearGradient');
  });
  it('kinds without a round or six-sided medal take a rosette', async () => {
    const { Medal } = await import('../../src/screens/earned/Case');
    const out = html(<Medal item={{ id: 'f', name: 'Test food', cat: 'food', tier: 'b', earned: true }} />);
    expect(out).toContain('data-shape="rosette"');
  });
});
