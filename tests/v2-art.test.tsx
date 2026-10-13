import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LANDMARKS, landmarkFor } from '../src/walk/art/landmarks';
import { Scene } from '../src/walk/art/scene';
import { approachScale } from '../src/walk/WalkScene';
import { CITIES } from '../src/domain/walk';
import { REGIONS } from '../src/ui/light';
import type { PartOfDay } from '../src/domain/dates';

describe('walk illustrations', () => {
  it('every ROUTE/QUAD/TOUR stop has a landmark and region', () => {
    for (const c of CITIES) {
      const l = landmarkFor(c);
      expect(l, c).toBeTruthy();
      expect(l!.paths.length, c).toBeGreaterThan(0);
      expect(REGIONS, c).toContain(l!.region);
    }
    expect(Object.keys(LANDMARKS).length).toBeGreaterThanOrEqual(CITIES.length);
  });

  it('scene renders for every part of day without missing fills', () => {
    const parts: PartOfDay[] = ['dawn', 'day', 'dusk', 'night'];
    for (const part of parts) {
      for (const city of ['Gwalior', 'Mumbai', 'Leh', 'Kolkata']) {
        const html = renderToStaticMarkup(<Scene city={city} part={part} people />);
        expect(html).not.toMatch(/fill="(undefined|null|NaN|)"/);
        expect(html).not.toMatch(/NaN/);
        expect(html).toContain('<svg');
      }
    }
  });

  it('the landmark ahead grows as you near it', () => {
    expect(approachScale(undefined)).toBe(1);
    expect(approachScale(90)).toBeCloseTo(0.55);
    expect(approachScale(30)).toBeCloseTo(0.775);
    expect(approachScale(0)).toBe(1);
  });
});
