import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StatusLines } from '../src/screens/walk/StatusLines';
import { StopFacts, StopView } from '../src/screens/walk/StopView';
import { StretchEndView } from '../src/screens/walk/StretchEndView';
import { StretchView } from '../src/screens/walk/StretchView';
import { WalkTitle } from '../src/screens/walk/WalkTitle';
import { STOPS, STRETCHES } from '../src/walk/content';
import { STOP_KINDS } from '../src/walk/content/types';
import { stopLine } from '../src/walk/page';
import { StopMark } from '../src/walk/ui/StopMark';

const chambal = STOPS.find((s) => s.id === 'chambal')!;

describe('stretches and stops on screen', () => {
  it('makes the stretch name a button to its page, with the plain route and the day under it', () => {
    const html = renderToStaticMarkup(<WalkTitle where="Bandit Country" sub="Agra to Morena · day 3 of about 9" onWhere={() => {}} />);
    expect(html).toMatch(/<button[^>]*class="walk-title-btn"[^>]*>[\s\S]*Bandit Country/);
    expect(html).toContain('Agra to Morena · day 3 of about 9');
  });

  it('keeps a plain title when there is no stretch', () => {
    expect(renderToStaticMarkup(<WalkTitle where="Near Agra" sub="241 km from Delhi" />)).not.toContain('<button');
  });

  it('writes the stop line as its kind and name, and makes it a button', () => {
    expect(stopLine(chambal)).toEqual({ kind: 'stop', text: 'River · The Chambal', open: '/stop?id=chambal' });
    const html = renderToStaticMarkup(<StatusLines lines={[stopLine(chambal)]} onOpen={() => {}} />);
    expect(html).toMatch(/<button[^>]*>River · The Chambal<\/button>/);
  });

  it('shows one fact at a time with its count', () => {
    const html = renderToStaticMarkup(<StopFacts facts={chambal.facts} />);
    expect(html).toContain(chambal.facts[0]);
    expect(html).not.toContain(chambal.facts[1]);
    expect(html).toContain(`1 of ${chambal.facts.length} · tap for the next`);
  });

  it('names the kind in words on the stop page, with its sources', () => {
    const html = renderToStaticMarkup(<StopView stop={chambal} onBack={() => {}} />);
    expect(html).toContain('River · small stop');
    expect(html).toContain('The Chambal');
    expect(html).toContain('Back to the walk');
    expect(html).toContain('National Chambal Sanctuary');
  });

  it('shows the whole stretch page with its sources', () => {
    const s = STRETCHES[0];
    const html = renderToStaticMarkup(<StretchView stretch={s} onBack={() => {}} />);
    for (const p of s.page) expect(html).toContain(p.slice(0, 40).replace(/’/g, '’'));
    expect(html).toContain(s.deeper!.title);
    expect(html).toContain('Sources');
  });

  it('marks a stretch done and names the next', () => {
    const html = renderToStaticMarkup(<StretchEndView done={STRETCHES[0]} next={STRETCHES[1]} onRead={() => {}} onClose={() => {}} />);
    expect(html).toContain('Bandit Country');
    expect(html).toContain('done');
    expect(html).toContain('Next: The Scindias’ Road');
  });

  it('draws a mark for every kind of stop', () => {
    for (const k of STOP_KINDS) expect(renderToStaticMarkup(<StopMark kind={k} />), k).toMatch(/<path|<circle/);
  });
});
