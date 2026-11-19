import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NightDial, dialAngle, minutesAt, nudge } from '../../src/ui/NightDial';

const noop = () => {};
// Invented times: lights out 0:50, woke 8:10.
const dial = (asleep?: number, woke?: number) => renderToStaticMarkup(<NightDial asleep={asleep} woke={woke} hintAsleep={23 * 60} hintWoke={7 * 60} onAsleep={noop} onWoke={noop} />);

describe('Sleep: the night dial (s5-a)', () => {
  it('makes both handles labelled controls that say their time as text', () => {
    const html = dial(50, 490);
    expect(html).toMatch(/role="slider"[^>]*aria-label="Lights out"[^>]*aria-valuetext="12:50 am"/);
    expect(html).toMatch(/role="slider"[^>]*aria-label="Woke"[^>]*aria-valuetext="8:10 am"/);
  });

  it('writes the hours asleep in the middle, and each time under the dial', () => {
    const html = dial(50, 490);
    expect(html).toContain('7 h 20');
    expect(html).toContain('asleep');
    expect(html).toMatch(/Lights out<\/span><b[^>]*>12:50 am<\/b>/);
    expect(html).toMatch(/Woke<\/span><b[^>]*>8:10 am<\/b>/);
  });

  it('nudges each time by ten minutes with labelled buttons', () => {
    const html = dial(50, 490);
    for (const l of ['Lights out 10 minutes earlier', 'Lights out 10 minutes later', 'Woke 10 minutes earlier', 'Woke 10 minutes later']) expect(html).toContain(`aria-label="${l}"`);
    expect(nudge(5, -10)).toBe(1435);
    expect(nudge(1435, 10)).toBe(5);
  });

  it('runs the day round the dial from midnight at the top', () => {
    expect(dialAngle(0)).toBe(0);
    expect(dialAngle(6 * 60)).toBe(90);
    expect(minutesAt(110, 10, 110, 110)).toBe(0);
    expect(minutesAt(210, 110, 110, 110)).toBe(360);
    expect(minutesAt(110, 210, 110, 110)).toBe(720);
  });

  it('renders with no data: a dash in the middle and for each time, handles at last night', () => {
    const html = dial();
    expect(html).not.toContain(' h ');
    expect(html).toMatch(/Lights out<\/span><b[^>]*>—<\/b>/);
    expect(html).toMatch(/aria-label="Lights out"[^>]*aria-valuetext="not set"/);
  });
});
