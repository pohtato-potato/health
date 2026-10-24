import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChallengeCard, ExpeditionLine } from '../src/screens/walk/RouteCards';
import { StatusLines } from '../src/screens/walk/StatusLines';
import { WalkDoors } from '../src/screens/walk/WalkDoors';
import { WalkTitle } from '../src/screens/walk/WalkTitle';
import { WalkTop } from '../src/screens/walk/WalkTop';

describe('the Walk tab’s sections', () => {
  it('shows a challenge card with its km and state in words', () => {
    const html = renderToStaticMarkup(<ChallengeCard id="dandi" km={118} state="walking" line="Across the Mahi." onOpen={() => {}} />);
    expect(html).toContain('>118<');
    expect(html).toContain('of 387 km');
    expect(html).toContain('Across the Mahi.');
    expect(html).toContain('The Dandi March');
  });

  it('says set down in words on a set-down card, and shows a target as aiming for', () => {
    expect(renderToStaticMarkup(<ChallengeCard id="dandi" km={118} state="set down" onOpen={() => {}} />)).toContain('Set down');
    expect(renderToStaticMarkup(<ChallengeCard id="dandi" km={118} state="walking" target="aiming for 1 Feb" onOpen={() => {}} />)).toContain('aiming for 1 Feb');
  });

  it('shows an expedition as a slim line with its km', () => {
    const html = renderToStaticMarkup(<ExpeditionLine id="xuanzang" km={2610} state="walking" onOpen={() => {}} />);
    expect(html).toContain('Xuanzang&#x27;s road');
    expect(html).toContain('2,610 of 17,000 km');
  });

  it('keeps the status lines’ space when there are none', () => {
    const html = renderToStaticMarkup(<StatusLines lines={[]} />);
    expect(html).toContain('walk-lines');
    expect(html).toContain('aria-hidden="true"');
  });

  it('ends the block with tomorrow’s line, so it is rarely empty', () => {
    const html = renderToStaticMarkup(<StatusLines lines={[]} tomorrow="Tomorrow: a usual day reaches Agra." />);
    expect(html).toContain('Tomorrow: a usual day reaches Agra.');
    expect(html).not.toContain('aria-hidden');
  });

  it('writes each status line', () => {
    expect(renderToStaticMarkup(<StatusLines lines={[{ kind: 'rest', text: 'Resting at camp outside Agra. The road waits.' }]} />)).toContain('Resting at camp outside Agra.');
  });

  it('opens each door', () => {
    const html = renderToStaticMarkup(<WalkDoors onGo={() => {}} />);
    for (const d of ['Passport', 'Map', 'Departures', 'Wrapped']) expect(html).toContain(`>${d}<`);
  });

  it('reads the strip as words, and leaves the stone out at the end of the road', () => {
    expect(renderToStaticMarkup(<WalkTop km={238} todayKm={8} stone={{ name: 'Gwalior', hindi: 'ग्वालियर', km: 112 }} onStrip={() => {}} />)).toContain('Gwalior · 112 km');
    expect(renderToStaticMarkup(<WalkTop km={1e9} todayKm={0} onStrip={() => {}} />)).not.toContain('walk-stone');
  });

  it('titles the page with where you are and how far from the start', () => {
    const html = renderToStaticMarkup(<WalkTitle where="Near Agra" sub="241 km from Delhi · day 31" />);
    expect(html).toContain('<h1');
    expect(html).toContain('Near Agra');
    expect(html).toContain('241 km from Delhi · day 31');
  });
});
