import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CAM_LINE, CameraScene, eventCamera } from '../../src/screens/football/match/Broadcast';

const inks = { us: '#ff9a4d', them: '#ece8f4' };

describe('Event camera (m17-tap, m17-scream, m17-clear)', () => {
  it('each event kind picks its camera', () => {
    expect(eventCamera({ side: 'atk', type: 'Tap-in' })).toBe('tap');
    expect(eventCamera({ side: 'atk', type: 'Scramble in the box' })).toBe('tap');
    expect(eventCamera({ side: 'atk', type: 'Long shot' })).toBe('scream');
    expect(eventCamera({ side: 'atk', type: 'Counter-attack' })).toBe('move');
    expect(eventCamera({ side: 'def', type: 'Corner' })).toBe('corner');
    expect(eventCamera({ side: 'def', type: 'Counter-attack' })).toBeUndefined();
  });

  it('the line under each camera is text', () => {
    for (const k of ['move', 'tap', 'scream', 'corner'] as const) expect(CAM_LINE[k]).toMatch(/^[A-Z].+\.$/);
  });

  it('the long shot rises on a curve with a purple trail; their corner comes from the flag', () => {
    const scream = renderToStaticMarkup(<CameraScene kind="scream" chain={['Ada', 'Bo']} inks={inks} />);
    expect(scream).toContain('mb-cam scream');
    expect(scream).toMatch(/class="mb-comet" d="M[^"]* Q/);
    expect(scream).toContain('--tail:#c86bff');
    const corner = renderToStaticMarkup(<CameraScene kind="corner" chain={[]} inks={inks} />);
    expect(corner).toContain('mb-cam corner');
    expect(corner).not.toContain('mb-names');
  });

  it('renders with no data: a tap-in with no names still draws one player', () => {
    const h = renderToStaticMarkup(<CameraScene kind="tap" chain={[]} inks={inks} />);
    expect((h.match(/class="mb-tok"/g) ?? []).length).toBe(1);
  });
});
