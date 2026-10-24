import { describe, expect, it } from 'vitest';
import { ALL_STOPS } from '../src/domain/walk';
import { CITY_POINTS, REGIONS } from '../src/walk/geo';
import { flyoverBox, labelPoint, levelBox, pointAtKm, roadAhead, stateInk, trailTo } from '../src/walk/mapView';

const contains = ([x, y, w, h]: number[], [px, py]: [number, number]) => px >= x && px <= x + w && py >= y && py <= y + h;

describe('the map’s geometry', () => {
  it('puts a stop’s km on its city, and between stops by km', () => {
    expect(pointAtKm(0)).toEqual(CITY_POINTS.Delhi);
    expect(pointAtKm(230)).toEqual(CITY_POINTS.Agra);
    const [dx, dy] = CITY_POINTS.Delhi;
    const [ax, ay] = CITY_POINTS.Agra;
    expect(pointAtKm(115)[0]).toBeCloseTo((dx + ax) / 2, 5);
    expect(pointAtKm(115)[1]).toBeCloseTo((dy + ay) / 2, 5);
  });

  it('draws the trail through every stop passed, ending where you are', () => {
    const t = trailTo(240);
    expect(t[0]).toEqual(CITY_POINTS.Delhi);
    expect(t[1]).toEqual(CITY_POINTS.Agra);
    expect(t.at(-1)).toEqual(pointAtKm(240));
    expect(trailTo(0)).toEqual([CITY_POINTS.Delhi]);
  });

  it('marks legs to the islands as by sea', () => {
    const island = ALL_STOPS.find((s) => s.sea)!;
    const legs = roadAhead(island.km - 1);
    expect(legs.some((l) => l.sea)).toBe(true);
    expect(roadAhead(0).every((l) => l.points.length >= 2)).toBe(true);
  });

  it('frames each level around what it should show, never too small', () => {
    const india = levelBox('india', 300, 1);
    for (const p of [CITY_POINTS.Leh, CITY_POINTS.Kanyakumari, CITY_POINTS['Port Blair']]) expect(contains(india, p)).toBe(true);
    const stretch = levelBox('stretch', 300, 1.3);
    expect(contains(stretch, pointAtKm(300))).toBe(true);
    expect(contains(stretch, pointAtKm(230))).toBe(true); // Bandit Country starts at Agra
    expect(stretch[2]).toBeGreaterThanOrEqual(30);
    const chapter = levelBox('chapter', 300, 1);
    for (const c of ['Delhi', 'Bhopal', 'Kanyakumari']) expect(contains(chapter, CITY_POINTS[c])).toBe(true);
    expect(levelBox('stretch', 0, 1)[2]).toBeGreaterThanOrEqual(30); // the very start, before any stretch
    expect(contains(levelBox('stretch', 2000, 1), pointAtKm(2000))).toBe(true); // past the written stretches
  });

  it('keeps the frame to the shape it is drawn in', () => {
    const [, , w, h] = levelBox('chapter', 300, 1.5);
    expect(w / h).toBeCloseTo(1.5, 5);
  });

  it('inks a state by the land the walk enters it through, and labels it in its middle', () => {
    expect(stateInk('Rajasthan')).toMatch(/^#[0-9a-f]{6}$/);
    expect(stateInk('Rajasthan')).not.toBe(stateInk('Delhi'));
    const up = REGIONS.india.states!.find((s) => s.name === 'Uttar Pradesh')!;
    const [lx, ly] = labelPoint(up.path);
    expect(lx).toBeGreaterThan(0);
    expect(ly).toBeGreaterThan(0);
  });

  it('flies from the start to the whole trail', () => {
    const trail = trailTo(355);
    expect(contains(flyoverBox(trail, 0, 1), trail[0])).toBe(true);
    const end = flyoverBox(trail, 1, 1);
    for (const p of trail) expect(contains(end, p)).toBe(true);
    const one = flyoverBox([CITY_POINTS.Delhi], 0.5, 1);
    expect(one.every(Number.isFinite)).toBe(true);
    expect(contains(one, CITY_POINTS.Delhi)).toBe(true);
  });
});

describe('part 5 fixes: the map’s geometry', () => {
  it('splits the trail into legs, the legs to an island by sea', async () => {
    const { trailLegs } = await import('../src/walk/mapView');
    const kav = ALL_STOPS.find((s) => s.name === 'Kavaratti')!;
    const legs = trailLegs(kav.km + 10);
    expect(legs.some((l) => l.sea && l.points.some((p) => p[0] === CITY_POINTS.Kavaratti[0] && p[1] === CITY_POINTS.Kavaratti[1]))).toBe(true);
    expect(legs.filter((l) => !l.sea).length).toBeGreaterThan(0);
    // Joined up, the legs are the trail.
    const joined = legs.flatMap((l, i) => (i === 0 ? l.points : l.points.slice(1)));
    expect(joined).toEqual(trailTo(kav.km + 10));
    expect(trailLegs(300).every((l) => !l.sea)).toBe(true);
  });

  it('offers the flyover only with a trail to fly and when motion is allowed', async () => {
    const { flyoverAllowed } = await import('../src/walk/mapView');
    expect(flyoverAllowed(0, false)).toBe(false);
    expect(flyoverAllowed(300, false)).toBe(true);
    expect(flyoverAllowed(300, true)).toBe(false);
  });
});
