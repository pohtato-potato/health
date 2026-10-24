import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Milestone } from '../src/screens/walk/Milestone';
import { WalkScene } from '../src/walk/WalkScene';

describe('the scene’s road and the stone', () => {
  it('draws today’s road brighter only on a walking day', () => {
    expect(renderToStaticMarkup(<WalkScene km={240} hero todayKm={10} />)).toContain('walk-today');
    expect(renderToStaticMarkup(<WalkScene km={240} hero todayKm={0} />)).not.toContain('walk-today');
    expect(renderToStaticMarkup(<WalkScene km={240} hero />)).not.toContain('walk-today');
  });

  it('draws a longer piece for a longer day, up to the whole trail', () => {
    const share = (todayKm: number) => Number(renderToStaticMarkup(<WalkScene km={240} hero todayKm={todayKm} />).match(/class="walk-today"[^>]*stroke-dasharray="([\d.]+)/)![1]);
    expect(share(20)).toBeGreaterThan(share(10));
    expect(share(400)).toBe(1);
    expect(share(0.01)).toBeGreaterThan(0.02); // never thinner than a few pixels
  });

  it('has no small in-scene label on the Walk tab (the strip says it)', () => {
    expect(renderToStaticMarkup(<WalkScene km={240} hero />)).not.toContain('You ·');
  });

  it('labels the stone in words, with the Hindi name on its cap', () => {
    const html = renderToStaticMarkup(<Milestone stone={{ name: 'Gwalior', hindi: 'ग्वालियर', km: 112 }} />);
    expect(html).toContain('aria-label="Milestone: Gwalior, 112 km"');
    expect(html).toContain('ग्वालियर');
    expect(html).toContain('>112<');
  });
});
