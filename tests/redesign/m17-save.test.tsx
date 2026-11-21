import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WonderSave } from '../../src/screens/football/match/Save';

const shape: [number, number][] = [[0, -0.8], [0.7, -0.4], [0.7, 0.4], [0, 0.8], [-0.7, 0.4], [-0.7, -0.4]];
const base = { minute: 24, fixture: 'Brabo v Harbour Town', shape, land: [0.2, -0.1] as [number, number], pct: 18,
  score: { home: 'Brabo', away: 'Harbour Town', n: [1, 0] as [number, number] }, facts: ['Corner', 'Rest unit', 'Lead kept'], onOn: () => {} };

describe('Wonder save (m17-save, t17-save)', () => {
  it('shows the minute, the saver card and who saved it at what odds', () => {
    const out = renderToStaticMarkup(<WonderSave {...base} saver="Test Keeper" line="Test Keeper stands tall. 24′."><span className="card-x">card</span></WonderSave>);
    expect(out).toContain('24′ · Brabo v Harbour Town');
    expect(out).toContain('class="ws-card"><span class="card-x">');
    expect(out).toContain('18%');
    expect(out).toContain('Test Keeper did.');
    expect(out).toContain('Still Brabo 1, Harbour Town 0');
    expect(out).toContain('Lead kept');
  });

  it('the end frame keeps the ball where it was stopped, inside the shape', () => {
    const out = renderToStaticMarkup(<WonderSave {...base} />);
    // 125 + 0.2*110 = 147 → 58.8%; 125 - 0.1*110 = 114 → 45.6%
    expect(out).toMatch(/class="ws-ball" style="left:58\.8%;top:45\.6%"/);
    expect(out).toContain('The ball stopped inside your defending shape');
  });

  it('renders with no saver, line or facts', () => {
    const out = renderToStaticMarkup(<WonderSave {...base} facts={[]} />);
    expect(out).toContain('Wonder save');
    expect(out).toContain('chance to stop it.</span>');
    expect(out).not.toContain('ws-facts');
    expect(out).not.toContain('ws-card');
    expect(out).toContain('Carry on');
  });
});
