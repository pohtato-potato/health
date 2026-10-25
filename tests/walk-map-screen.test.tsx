import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ALL_STOPS, statesReached } from '../src/domain/walk';
import { IndiaMap, MAP_ASPECT, MapKey, MapLevels, placeLabels } from '../src/screens/walk/IndiaMap';
import { REGIONS } from '../src/walk/geo';
import { labelPoint, levelBox } from '../src/walk/mapView';

const reached = ['Delhi', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh'];
const screenSizes = (html: string) => {
  // Labels sit in groups scaled to screen pixels; their font-size is the size on screen.
  return [...html.matchAll(/<text[^>]*font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
};

describe('the map on screen', () => {
  for (const level of ['stretch', 'chapter', 'india'] as const)
    it(`writes every label at 14 px or more at the ${level} level`, () => {
      const html = renderToStaticMarkup(<IndiaMap km={300} reached={reached} level={level} width={328} />);
      const sizes = screenSizes(html);
      expect(sizes.length).toBeGreaterThan(0);
      for (const s of sizes) expect(s).toBeGreaterThanOrEqual(14);
    });

  it('names every reached state, and inks it', () => {
    const html = renderToStaticMarkup(<IndiaMap km={300} reached={reached} level="india" width={328} />);
    for (const s of reached.filter((x) => x !== 'Delhi')) expect(html).toContain(`>${s}</text>`);
    expect(html.match(/class="walk-map-state on"/g)?.length).toBe(reached.length);
  });

  it('shows the stretch’s small stops at the stretch level only', () => {
    expect(renderToStaticMarkup(<IndiaMap km={300} reached={reached} level="stretch" width={328} />)).toContain('>The Chambal</text>');
    expect(renderToStaticMarkup(<IndiaMap km={300} reached={reached} level="india" width={328} />)).not.toContain('>The Chambal</text>');
  });

  it('says what it shows to a screen reader', () => {
    expect(renderToStaticMarkup(<IndiaMap km={300} reached={reached} level="stretch" width={328} />)).toMatch(/role="img" aria-label="[^"]*5 states and territories walked into/);
  });

  it('labels the levels in words and marks the one shown', () => {
    const html = renderToStaticMarkup(<MapLevels level="chapter" chapter={1} onLevel={() => {}} />);
    expect(html).toContain('>This stretch<');
    expect(html).toContain('>Chapter 1<');
    expect(html).toContain('>All of India<');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Chapter 1</);
  });

  it('names every line in the key in words', () => {
    const html = renderToStaticMarkup(<MapKey />);
    for (const w of ['Walked', 'The road ahead', 'By sea', 'States walked into']) expect(html).toContain(w);
  });
});

describe('labels that never collide', () => {
  // Each label: its anchor (translate) in map units, the scale back to screen pixels, its size, anchor side and text.
  const boxes = (html: string) => {
    const vb = html.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/)!.slice(1).map(Number);
    const unit = 328 / vb[2];
    return [...html.matchAll(/<g transform="translate\(([-\d.e]+) ([-\d.e]+)\) scale\([\d.e-]+\)"><text[^>]*font-size="([\d.]+)" x="([-\d.]+)" y="([-\d.]+)" text-anchor="(\w+)">([^<]+)</g)].map((m) => {
      const [x, y, size, dx, dy] = [m[1], m[2], m[3], m[4], m[5]].map(Number);
      const w = m[7].length * size * 0.55;
      const sx = (x - vb[0]) * unit + dx - (m[6] === 'end' ? w : m[6] === 'middle' ? w / 2 : 0);
      const sy = (y - vb[1]) * unit + dy - size;
      return { text: m[7], x0: sx, x1: sx + w, y0: sy, y1: sy + size * 1.2 };
    });
  };
  const overlap = (a: ReturnType<typeof boxes>[number], b: ReturnType<typeof boxes>[number]) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  for (const level of ['stretch', 'chapter', 'india'] as const)
    it(`keeps labels apart at the ${level} level`, () => {
      const b = boxes(renderToStaticMarkup(<IndiaMap km={300} reached={reached} level={level} width={328} />)).filter((l) => !/°[EN]$/.test(l.text));
      expect(b.length).toBeGreaterThan(1);
      for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) expect(overlap(b[i], b[j]), `${b[i].text} / ${b[j].text}`).toBe(false);
    });

  it('writes Dholpur at the stretch level, where the road crosses its corner of Rajasthan', () => {
    expect(renderToStaticMarkup(<IndiaMap km={300} reached={reached} level="stretch" width={328} />)).toContain('>Dholpur</text>');
  });

  it('always names the next city', () => {
    expect(renderToStaticMarkup(<IndiaMap km={300} reached={reached} level="india" width={328} />)).toContain('>Gwalior</text>');
  });
});

describe('part 5 fixes: labels', () => {
  const late = ALL_STOPS.at(-1)!.km - 10;
  const lateReached = statesReached(late).map((s) => s.name);
  const levels = ['stretch', 'chapter', 'india'] as const;

  it('draws each degree label once', () => {
    for (const km of [0, 300, 1620, 2870, late])
      for (const level of levels) {
        const html = renderToStaticMarkup(<IndiaMap km={km} reached={statesReached(km).map((s) => s.name)} level={level} width={328} />);
        const degs = [...html.matchAll(/>(\d+°[EN])<\/text>/g)].map((m) => m[1]);
        expect(new Set(degs).size, `${km} ${level}`).toBe(degs.length);
      }
  });

  it('lets state names win over degree labels late in the walk', () => {
    const html = renderToStaticMarkup(<IndiaMap km={late} reached={lateReached} level="india" width={328} />);
    const names = [...html.matchAll(/class="walk-imap-statename"[^>]*>([^<]+)</g)].map((m) => m[1]);
    const withoutDegrees = placeLabels(
      (REGIONS.india.states ?? []).filter((s) => lateReached.includes(s.name) && s.name !== 'Delhi' && s.name !== 'Chandigarh').sort((a, b) => b.areaKm2 - a.areaKm2).map((s) => ({ key: s.name, at: labelPoint(s.path), text: s.name, size: 14, cls: '', dx: 0, dy: 5, anchor: 'middle' as const })),
      ([x, y]) => {
        const [bx, by, bw] = levelBox('india', late, MAP_ASPECT);
        const u = 328 / bw;
        return [(x - bx) * u, (y - by) * u];
      },
      [328, 328 / MAP_ASPECT],
    ).length;
    expect(names.length).toBe(withoutDegrees);
  });

  it('keeps labels inside the frame', () => {
    const toScreen = (p: [number, number]): [number, number] => p;
    const [l] = placeLabels([{ key: 'a', at: [320, 100], text: 'Kanyakumari', size: 15, cls: '', dx: 6, dy: 4, anchor: 'start' }], toScreen, [328, 380]);
    expect(l.anchor).toBe('end');
  });
});
