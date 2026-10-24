import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/ui/light';
import { landmarkFor } from '../src/walk/art/landmarks';
import { Vista, todayBandTop } from '../src/walk/art/vista';

const PARTS = ['dawn', 'day', 'dusk', 'night'] as const;

describe('the vista', () => {
  for (const region of REGIONS)
    for (const part of PARTS)
      it(`draws ${region} at ${part}: sky, skyline, road and walker`, () => {
        const html = renderToStaticMarkup(<Vista region={region} part={part} todayKm={8} />);
        expect(html).toContain('vista-sky');
        expect(html).toContain('vista-far');
        expect(html).toContain('vista-mid');
        expect(html).toContain('vista-road');
        expect(html).toContain('vista-walker');
        expect(html).toMatch(/class="vista-tree [a-z]+"/);
        expect(html.includes('vista-star')).toBe(part === 'night');
      });

  it('gives each kind of land its own trees', () => {
    const tree = (r: (typeof REGIONS)[number]) => renderToStaticMarkup(<Vista region={r} part="day" todayKm={0} />).match(/class="vista-tree ([a-z]+)"/)![1];
    expect(tree('ravines')).toBe('acacia');
    expect(tree('coast')).toBe('palm');
    expect(tree('himalaya')).toBe('conifer');
    expect(tree('east')).toBe('broadleaf');
  });

  it('draws today’s piece of road only when there is one, and never past the crest', () => {
    expect(renderToStaticMarkup(<Vista region="ravines" part="dusk" todayKm={0} />)).not.toContain('vista-today');
    expect(renderToStaticMarkup(<Vista region="ravines" part="dusk" todayKm={10} />)).toContain('vista-today');
    expect(todayBandTop(0.1)).toBeLessThan(250);
    expect(todayBandTop(10)).toBeGreaterThan(todayBandTop(40));
    expect(todayBandTop(400)).toBeGreaterThanOrEqual(180);
  });

  it('raises the landmark ahead on the horizon', () => {
    const lm = landmarkFor('Gwalior')!;
    expect(renderToStaticMarkup(<Vista region="ravines" part="dusk" todayKm={5} landmark={lm} landmarkScale={0.8} />)).toContain('vista-landmark');
    expect(renderToStaticMarkup(<Vista region="ravines" part="dusk" todayKm={5} />)).not.toContain('vista-landmark');
  });

  it('carries no text: the stone and the strip say things in words', () => {
    expect(renderToStaticMarkup(<Vista region="deccan" part="day" todayKm={5} />)).not.toContain('<text');
  });
});
