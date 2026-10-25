import { describe, expect, it } from 'vitest';
import { STRIDE_M } from '../src/domain/walk';
import { weekWalk } from '../src/walk/week';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeekRoadCard } from '../src/screens/walk/WeekRoadCard';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);
// Delhi 0, Agra 230, Gwalior 350; Haryana 25, Uttar Pradesh 85, Rajasthan 255, Madhya Pradesh 285.
const road = new Map([
  ['2026-01-01', steps(100)], // before the week
  ['2026-01-05', steps(140)], // Monday: 240, Agra
  ['2026-01-11', steps(115)], // Sunday: 355, Rajasthan, Madhya Pradesh, Gwalior
  ['2026-01-12', steps(500)], // next Monday: Bhopal, not this week
]);

describe('the week on the road', () => {
  it('counts Monday to Sunday', () => {
    const w = weekWalk('2026-01-05', road, []);
    expect(w.km).toBeCloseTo(255, 0);
    expect(w.fromKm).toBeCloseTo(100, 0);
    expect(w.toKm).toBeCloseTo(355, 0);
  });
  it('names the cities and state lines first reached that week, in order', () => {
    const w = weekWalk('2026-01-05', road, []);
    expect(w.cities).toEqual(['Agra', 'Gwalior']);
    expect(w.states).toEqual(['Rajasthan', 'Madhya Pradesh']);
  });
  it('gives each joined route its km that week, and marks one finished in it', () => {
    const w = weekWalk('2026-01-05', road, [
      { id: 'meerut', spans: [{ from: '2026-01-05' }] },
      { id: 'dandi', spans: [{ from: '2026-01-11' }] },
      { id: 'kos', spans: [{ from: '2026-01-12' }] },
    ]);
    expect(w.routes.map((r) => [r.id, Math.round(r.km), r.done])).toEqual([
      ['meerut', 74, true],
      ['dandi', 115, false],
    ]);
  });
  it('is empty in a week with no steps', () => {
    const w = weekWalk('2026-02-02', road, [{ id: 'meerut', spans: [{ from: '2026-01-05' }] }]);
    expect(w).toMatchObject({ km: 0, cities: [], states: [], routes: [] });
  });
  it('shows nothing on the Monday story in a week with no walking, and the week when there was', () => {
    expect(renderToStaticMarkup(<WeekRoadCard w={weekWalk('2026-02-02', road, [])} />)).toBe('');
    const html = renderToStaticMarkup(<WeekRoadCard w={weekWalk('2026-01-05', road, [])} />);
    expect(html).toContain('Reached Agra and Gwalior.');
    expect(html).toContain('Into Rajasthan and Madhya Pradesh.');
  });
  it('hides a week too short to show in whole kilometres', () => {
    const w = weekWalk('2026-01-05', new Map([['2026-01-06', steps(0.3)]]), []);
    expect(renderToStaticMarkup(<WeekRoadCard w={w} />)).toBe('');
  });
});
