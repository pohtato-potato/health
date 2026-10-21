import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TodayLine } from '../src/screens/today/TodayLine';

describe('TodayLine', () => {
  it('shows the glance with the time trailing it', () => {
    const html = renderToStaticMarkup(<TodayLine text="On track." kind="glance" clock="16:10" />);
    expect(html).toContain('On track.');
    expect(html).toContain('16:10');
    expect(html).toContain('td-line-glance');
  });
  it('sets the voice in italic, gold on a perfect day', () => {
    const html = renderToStaticMarkup(<TodayLine text="All three." kind="voice" gold clock="21:30" />);
    expect(html).toContain('td-line-voice gold');
  });
  it('gives a theme day its why, named in words', () => {
    const html = renderToStaticMarkup(<TodayLine text="On track." kind="glance" clock="21:30" why={{ name: 'Orionids peak', text: 'Look east after midnight.' }} />);
    expect(html).toContain('Orionids peak.');
    expect(html).toContain('Look east after midnight.');
  });
});
