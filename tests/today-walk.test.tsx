import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { walkCaption } from '../src/domain/walkCaption';
import { WalkTop } from '../src/screens/today/WalkTop';

describe('walkCaption', () => {
  it('gives date · place · status, Near place, and Day n · x km to landmark', () => {
    expect(walkCaption({ date: '2026-10-21', place: 'Home', status: 'sick', near: 'Test Town', dayN: 31, kmToNext: 16, landmark: 'Test Fort' })).toEqual([
      'Wed 21 Oct · Home · sick',
      'Near Test Town',
      'Day 31 · 16 km to Test Fort',
    ]);
  });
  it('leaves the status out on a normal day', () => {
    expect(walkCaption({ date: '2026-10-21', place: 'Home', near: 'Test Town', dayN: 31, kmToNext: 16, landmark: 'Test Fort' })[0]).toBe('Wed 21 Oct · Home');
  });
  it('leaves the place out when there are no places', () => {
    expect(walkCaption({ date: '2026-10-21', near: 'Test Town', dayN: 1, kmToNext: 3, landmark: 'Test Fort' })[0]).toBe('Wed 21 Oct');
  });
});

describe('WalkTop', () => {
  const html = renderToStaticMarkup(<WalkTop caption={['Wed 21 Oct · Home', 'Near Test Town', 'Day 31 · 16 km to Test Fort']} scene={<svg />} onOpen={() => {}} />);
  it('renders the three caption lines', () => {
    for (const l of ['Wed 21 Oct · Home', 'Near Test Town', 'Day 31 · 16 km to Test Fort']) expect(html).toContain(l);
  });
  it('is one button labelled as the way to the Walk tab, in the walk slot', () => {
    expect(html).toContain('aria-label="Wed 21 Oct · Home. Near Test Town. Day 31 · 16 km to Test Fort. Open the Walk tab"');
    expect(html).toContain('data-section="walk"');
  });
});
