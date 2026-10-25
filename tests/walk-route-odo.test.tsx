import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Odometer, ThenLine } from '../src/screens/walk/RouteNumbers';

describe('the route page’s numbers', () => {
  it('shows km walked as odometer tiles, read as words', () => {
    const html = renderToStaticMarkup(<Odometer km={1234} of={17000} about />);
    expect(html.match(/class="walk-odo-digit"/g)).toHaveLength(4);
    expect(html).toContain('class="walk-odo-sep"');
    expect(html).toContain('1,234 km walked');
  });

  it('puts then and you on one line, each with its day', () => {
    const html = renderToStaticMarkup(<ThenLine who="The marchers" place="Kareli" theirDay={8} yourDay={12} totalDays={25} />);
    expect(html).toContain('Then and you · reaching Kareli');
    expect(html).toContain('>Day 8<');
    expect(html).toContain('>Day 12<');
    expect(html).toContain('>Then<');
    expect(html).toContain('>You<');
    expect(html).toContain('The marchers took 25 days in all.');
    // Markers sit along the line by day.
    const lefts = [...html.matchAll(/left:([\d.]+)%/g)].map((m) => Number(m[1]));
    expect(lefts[0]).toBeLessThan(lefts[1]);
  });

  it('without your day yet, shows theirs alone', () => {
    const html = renderToStaticMarkup(<ThenLine who="The Rani" place="Kalpi" theirDay={2} totalDays={75} />);
    expect(html).toContain('>Day 2<');
    expect(html).not.toContain('>You<');
  });

  it('keeps then and you apart when the days are close', () => {
    const html = renderToStaticMarkup(<ThenLine who="The marchers" place="Kareli" theirDay={8} yourDay={9} totalDays={25} />);
    expect(html).toMatch(/class="mark you stack"/);
    expect(renderToStaticMarkup(<ThenLine who="The marchers" place="Kareli" theirDay={8} yourDay={20} totalDays={25} />)).not.toContain('stack');
  });

  it('holds its tiles steady while it counts: as many tiles as the final number', async () => {
    const { odometerTiles } = await import('../src/screens/walk/RouteNumbers');
    expect(odometerTiles(7, 1234)).toEqual([' ', ',', ' ', ' ', '7']);
    expect(odometerTiles(1234, 1234)).toEqual(['1', ',', '2', '3', '4']);
  });
});
