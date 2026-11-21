import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ArchTiles } from '../../src/screens/reports/ArchTiles';

describe('o23-arch Reports archive', () => {
  it('a heading with its count, then each week or month as a coloured tile that opens it', () => {
    const out = html(<ArchTiles title="Weeks" tiles={[
      { id: 'a', name: 'Week 10', sub: '2 Mar to 8 Mar', onOpen: () => {} },
      { id: 'b', name: 'Week 9', sub: '23 Feb to 1 Mar', onOpen: () => {} },
    ]} />);
    expect(out).toMatch(/<h2 class="ar-h">Weeks<\/h2><span>2<\/span>/);
    expect(out.match(/<button/g)).toHaveLength(2);
    expect(out).toContain('<b>Week 10</b><span>2 Mar to 8 Mar</span>');
    expect(out.match(/--c:#/g)).toHaveLength(2);
  });
  it('nothing when there are no tiles', () => {
    expect(html(<ArchTiles title="Months" tiles={[]} />)).toBe('');
  });
});
