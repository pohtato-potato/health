import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DayCard, breakout, dayTier } from '../../src/screens/close/DayCard';

const none = { debut: false, records: [], prevOpen: false };

describe('Breakouts as a ribbon (c5-break)', () => {
  it('carries the ribbon with its words on the card', () => {
    const b = breakout({ ...none, records: [{ line: 'Row 40 kg × 10' }] })!;
    const html = renderToStaticMarkup(<DayCard tier={dayTier(4, 4)} dateLabel="1 Jan" title="Thursday at home" rings={[1, 1, 1, 1]} stats={[]} ribbon={b} foot={b.foot} />);
    expect(html).toMatch(/<div class="dc-rib"[^>]*>Record night<\/div>/);
    expect(html).toContain('Row 40 kg × 10');
  });

  it('names each kind of breakout in words', () => {
    expect(breakout({ ...none, debut: true })?.text).toBe('Gym debut');
    expect(breakout({ ...none, debut: true })?.foot).toBe('Only ever one of these');
    expect(breakout({ ...none, prevOpen: true })?.text).toBe('Comeback');
    expect(breakout({ ...none, prevOpen: true })?.foot).toBe('Closed after an open day');
    expect(breakout({ ...none, status: 'sick' })?.text).toBe('Rest day');
    expect(breakout({ ...none, status: 'sick' })?.foot).toBe('Marked sick; it still counts');
  });

  it('shows one ribbon at most: a debut beats a record beats a comeback beats a rest day', () => {
    expect(breakout({ debut: true, records: [{ line: 'x' }], prevOpen: true, status: 'sick' })?.text).toBe('Gym debut');
    expect(breakout({ debut: false, records: [{ line: 'x' }], prevOpen: true, status: 'sick' })?.text).toBe('Record night');
    expect(breakout({ debut: false, records: [], prevOpen: true, status: 'sick' })?.text).toBe('Comeback');
  });

  it('renders with no data: no ribbon', () => {
    expect(breakout(none)).toBeUndefined();
    expect(renderToStaticMarkup(<DayCard tier={dayTier(0, 4)} dateLabel="1 Jan" title="x" rings={[0, 0, 0, 0]} stats={[]} />)).not.toContain('dc-rib');
  });
});
