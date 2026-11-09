// The Ground skyline's labels (vision check, 9 Nov): under the Café, the Ferry stop's one-line "building · waiting for
// the money" ran into the Café's own line. Each label now keeps to its own column and wraps onto further lines.
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PROJECTS } from '../../src/football/content/projects';
import { PLACES } from '../../src/football/ground';
import { placeLines, Skyline, wrapWords } from '../../src/screens/football/tree/Skyline';

const LABEL_X: Record<string, number> = { ferry: 40, cafe: 196, shop: 330, kaai: 470, academy: 960, training: 1104, museum: 1300 };
const xs = Object.values(LABEL_X).sort((a, b) => a - b);
const column = (place: string) => (xs.find((x) => x > LABEL_X[place]) ?? 1420) - LABEL_X[place] - 14;
const places = (mode: 'now' | 'stage' | 'none' | 'built') => PLACES.map((pl) => {
  const list = PROJECTS.filter((p) => p.place === pl.id);
  return { place: pl.id, name: pl.name, stages: [], built: mode === 'built' ? 3 : mode === 'stage' ? 2 : 0, of: 3, now: mode === 'now' ? list[0] : undefined };
});
const WORST = ['waiting for the money', '1,800 of 2,000', 'ready', '18 of 25'];

describe('Ground skyline labels', () => {
  it('wraps words to a width and never splits a word', () => {
    expect(wrapWords('waiting for the money', 120, 10)).toEqual(['waiting for', 'the money']);
    expect(wrapWords('built', 120, 10)).toEqual(['built']);
    expect(wrapWords('extraordinarily', 50, 10)).toEqual(['extraordinarily']);
  });
  it('every line of every label fits its column, whatever the state', () => {
    for (const mode of ['now', 'stage', 'none', 'built'] as const) {
      for (const text of WORST) {
        for (const p of places(mode)) {
          const lines = placeLines(p as never, () => text);
          for (const l of lines) expect(l.length * 9.4, `${p.place} "${l}"`).toBeLessThanOrEqual(column(p.place));
        }
      }
    }
  });
  it('draws one line per row, each lower than the last, and grows the drawing to fit', () => {
    const out = html(<Skyline places={places('now') as never} progress={() => 'waiting for the money'} />);
    const cafe = [...out.matchAll(/<text class="sub" x="196" y="(\d+)">([^<]*)<\/text>/g)].map((m) => [Number(m[1]), m[2]] as const);
    expect(cafe.map(([, t]) => t)).toEqual(['building', 'waiting for', 'the money']);
    expect(cafe.map(([y]) => y)).toEqual([398, 420, 442]);
    expect(out).toContain('viewBox="0 0 1420 458"');
    // The words for a screen reader stay whole.
    expect(out).toContain('Supporters’ café: building · waiting for the money');
  });
});
