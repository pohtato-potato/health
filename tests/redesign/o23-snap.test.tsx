import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SnapTiles } from '../../src/screens/settings/DataParts';

describe('o23-snap Snapshots', () => {
  it('the daily copies as tiles, today marked, and the one before a big change in gold with its reason', () => {
    const out = html(<SnapTiles today="2026-03-04" onPick={() => {}} snaps={[
      { id: 'a', day: '2026-03-04', kind: 'daily' },
      { id: 'b', day: '2026-03-03', kind: 'daily' },
      { id: 'c', day: '2026-03-01', kind: 'before', reason: 'Before a restore' },
    ]} />);
    expect(out.match(/<button/g)).toHaveLength(3);
    expect(out).toContain('aria-label="Go back to 4 Mar, today"');
    expect(out).toMatch(/class="sn-t gold"[^>]*><b>1 Mar<\/b><span>Before a restore<\/span>/);
    expect(out).toContain('>today<');
  });
});
