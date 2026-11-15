import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TodayLine } from '../src/screens/today/TodayLine';

describe('TodayLine', () => {
  it('heads the rings with the count in words, never in the middle of the rings', async () => {
    const { closedWords } = await import('../src/screens/today/TodayLine');
    expect([0, 1, 2, 3, 4].map((n) => closedWords(n))).toEqual(['None closed yet', 'One closed so far', 'Two closed so far', 'Three closed so far', 'All four closed']);
    expect(renderToStaticMarkup(<TodayLine head="Two closed so far" text="x" kind="glance" clock="22:25" />)).toContain('<h2 class="td-head">Two closed so far</h2>');
  });
  it('drops the ring count from the glance, since the heading says it', async () => {
    const { glanceUnder } = await import('../src/screens/today/TodayLine');
    expect(glanceUnder('Two closed so far.')).toBe('');
    expect(glanceUnder('Three closed. One more before bed.')).toBe('One more before bed.');
    expect(glanceUnder('Test session tonight.')).toBe('Test session tonight.');
  });
  it('shows the glance with the time trailing it', () => {
    const html = renderToStaticMarkup(<TodayLine head="Two closed so far" text="On track." kind="glance" clock="16:10" />);
    expect(html).toContain('On track.');
    expect(html).toContain('16:10');
    expect(html).toContain('td-line-glance');
  });
  it('sets the voice in italic, gold on a perfect day', () => {
    const html = renderToStaticMarkup(<TodayLine head="Two closed so far" text="All three." kind="voice" gold clock="21:30" />);
    expect(html).toContain('td-line-voice gold');
  });
  it('gives a theme day its why, named in words', () => {
    const html = renderToStaticMarkup(<TodayLine head="Two closed so far" text="On track." kind="glance" clock="21:30" why={{ name: 'Orionids peak', text: 'Look east after midnight.' }} />);
    expect(html).toContain('Orionids peak.');
    expect(html).toContain('Look east after midnight.');
  });
});
