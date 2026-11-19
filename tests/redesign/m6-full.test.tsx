import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusRow } from '../../src/ui/StatusRow';
import { alsoThisMorning } from '../../src/domain/morningLog';
import { StepsRing } from '../../src/ui/StepsRing';

describe('Good morning, the whole page (m6-full, m6-also)', () => {
  it('runs dial, rested, weigh-in, soreness (the body chart), then "Also this morning"', () => {
    const src = readFileSync('src/sheets/MorningLog.tsx', 'utf8');
    const at = ['<NightDial', 'How rested?', 'ml-weigh', '<BodyChart', 'Also this morning'].map((k) => src.indexOf(k));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('gives each place its own colour class and its name as the label', () => {
    const src = readFileSync('src/sheets/MorningLog.tsx', 'utf8');
    expect(src).toMatch(/className=\{`ml-pl k-\$\{p\.kind\}/);
    expect(src).toMatch(/<PlaceIcon place=\{p\}[^/]*\/>\s*\{p\.name\}/);
  });

  it('asks "How are you" with Fine first, each status coloured and named', () => {
    const html = renderToStaticMarkup(<StatusRow today="2026-01-02" current="sick" fine />);
    const labels = [...html.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((m) => m[1]);
    expect(labels[0]).toBe('Fine');
    expect(labels).toContain('Sick');
    expect(html).toMatch(/class="chip sm st-sick on"[^>]*aria-checked="true"|aria-checked="true"[^>]*class="chip sm st-sick on"/);
    expect(html).toContain('st-fine');
  });

  it('keeps "None" last where the row is not the morning one', () => {
    const labels = [...renderToStaticMarkup(<StatusRow today="2026-01-02" />).matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((m) => m[1]);
    expect(labels.at(-1)).toBe('None');
  });

  it('counts the parts of "Also this morning" that are done', () => {
    expect(alsoThisMorning({ place: true, status: false, steps: true })).toEqual({ done: 2, of: 3 });
  });

  it('shows yesterday’s steps beside a steps ring, in words', () => {
    expect(renderToStaticMarkup(<StepsRing steps={10500} goal={10000} />)).toContain('goal met');
    expect(renderToStaticMarkup(<StepsRing steps={6000} goal={10000} />)).toContain('4,000 to the goal');
  });

  it('renders with no data: a dash and no ring fill', () => {
    const html = renderToStaticMarkup(<StepsRing steps={undefined} goal={10000} />);
    expect(html).toContain('—');
    expect(html).not.toContain('goal met');
  });
});
