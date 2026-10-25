import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Milestone } from '../src/screens/walk/Milestone';

describe('the stone', () => {
  it('labels the stone in words, with the Hindi name on its cap', () => {
    const html = renderToStaticMarkup(<Milestone stone={{ name: 'Gwalior', hindi: 'ग्वालियर', km: 112 }} />);
    expect(html).toContain('aria-label="Milestone: Gwalior, 112 km"');
    expect(html).toContain('ग्वालियर');
    expect(html).toContain('>112<');
  });
});
