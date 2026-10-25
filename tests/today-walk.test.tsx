import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { todayWalkLine, walkCaption } from '../src/domain/walkCaption';
import { WalkTop } from '../src/screens/today/WalkTop';

describe('walkCaption', () => {
  it('gives date · place · status, the Walk tab’s title, and the one walk line', () => {
    expect(walkCaption({ date: '2026-10-21', place: 'Home', status: 'sick', title: 'Test Country', line: '16 km to Test Town' })).toEqual([
      'Wed 21 Oct · Home · sick',
      'Test Country',
      '16 km to Test Town',
    ]);
  });
  it('leaves the status out on a normal day', () => {
    expect(walkCaption({ date: '2026-10-21', place: 'Home', title: 'Near Test Town', line: '' })[0]).toBe('Wed 21 Oct · Home');
  });
  it('leaves the place out when there are no places', () => {
    expect(walkCaption({ date: '2026-10-21', title: 'Near Test Town', line: '' })[0]).toBe('Wed 21 Oct');
  });
  it('never counts days: the Walk tab counts days on the stretch, so Today says none', () => {
    expect(walkCaption({ date: '2026-10-21', title: 'Test Country', line: '16 km to Test Town' }).join(' ')).not.toMatch(/Day \d/);
  });
});

describe('todayWalkLine', () => {
  const stone = { name: 'Test Town', hindi: 'x', km: 56 };
  const tomorrow = 'Tomorrow: a usual day takes you to 46 km from Test Town.';
  it('puts an arrival first', () => {
    expect(todayWalkLine({ arrival: 'Test City', stop: 'River · Test River', sky: 'Full moon tonight.', tomorrow, stepsIn: true, stone })).toBe('Arrived in Test City today.');
  });
  it('then a small stop, then the sky', () => {
    expect(todayWalkLine({ stop: 'River · Test River', sky: 'Full moon tonight.', tomorrow, stepsIn: true, stone })).toBe('River · Test River');
    expect(todayWalkLine({ sky: 'Full moon tonight.', tomorrow, stepsIn: true, stone })).toBe('Full moon tonight.');
  });
  it('puts a rest day after a small stop and before the sky, as the Walk tab does', () => {
    expect(todayWalkLine({ stop: 'River · Test River', rest: 'Resting at camp outside Test Town. The road waits.', sky: 'Full moon tonight.', stepsIn: false, stone })).toBe('River · Test River');
    expect(todayWalkLine({ rest: 'Resting at camp outside Test Town. The road waits.', sky: 'Full moon tonight.', stepsIn: false, stone })).toBe('Resting at camp outside Test Town. The road waits.');
  });
  it('gives tomorrow only once today’s steps are in', () => {
    expect(todayWalkLine({ tomorrow, stepsIn: true, stone })).toBe(tomorrow);
    expect(todayWalkLine({ tomorrow, stepsIn: false, stone })).toBe('56 km to Test Town');
  });
  it('falls back to the milestone, in the same km the stone shows', () => {
    expect(todayWalkLine({ stepsIn: false, stone })).toBe('56 km to Test Town');
  });
  it('says nothing at the end of the road', () => {
    expect(todayWalkLine({ stepsIn: false })).toBe('');
  });
});

describe('WalkTop', () => {
  const html = renderToStaticMarkup(<WalkTop caption={['Wed 21 Oct · Home', 'Test Country', '16 km to Test Town']} scene={<svg />} onOpen={() => {}} />);
  it('renders the three caption lines', () => {
    for (const l of ['Wed 21 Oct · Home', 'Test Country', '16 km to Test Town']) expect(html).toContain(l);
  });
  it('is one button labelled as the way to the Walk tab, in the walk slot', () => {
    expect(html).toContain('aria-label="Wed 21 Oct · Home. Test Country. 16 km to Test Town. Open the Walk tab"');
    expect(html).toContain('data-section="walk"');
  });
  it('shows the arrival stamp only on an arrival day, named for the screen reader', () => {
    expect(html).not.toContain('td-walk-stamp');
    const arrived = renderToStaticMarkup(<WalkTop caption={['Wed 21 Oct', 'Near Test City', 'Arrived in Test City today.']} scene={<svg />} stamp={<svg aria-label="Passport stamp" />} onOpen={() => {}} />);
    expect(arrived).toContain('td-walk-stamp');
    expect(arrived).toContain('Passport stamp');
  });
  it('never doubles a full stop in the label', () => {
    const sky = renderToStaticMarkup(<WalkTop caption={['Wed 21 Oct', 'Test Country', 'Full moon tonight.']} scene={<svg />} onOpen={() => {}} />);
    expect(sky).toContain('aria-label="Wed 21 Oct. Test Country. Full moon tonight. Open the Walk tab"');
  });
  it('leaves an empty third line out', () => {
    const none = renderToStaticMarkup(<WalkTop caption={['Wed 21 Oct', 'Test Country', '']} scene={<svg />} onOpen={() => {}} />);
    expect(none).not.toContain('td-walk-next');
  });
});
