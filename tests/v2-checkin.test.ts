import { describe, expect, it } from 'vitest';
import { flipFor, TORSO_GUIDES } from '../src/checkin/framing';
import { prefOn, type Prefs } from '../src/domain/types';

describe('check-in framing', () => {
  it('the saved photo is flipped for the front camera, and again in mirror mode', () => {
    expect(flipFor('user', false)).toBe(true);
    expect(flipFor('environment', false)).toBe(false);
    // Shooting a reflection with the back camera: flip it so left stays left.
    expect(flipFor('environment', true)).toBe(true);
    expect(flipFor('user', true)).toBe(false);
  });

  it('frames head to hips: the shoulder line sits above the hip edge, both inside the frame', () => {
    expect(TORSO_GUIDES.shoulder).toBeGreaterThan(0);
    expect(TORSO_GUIDES.hip).toBeLessThan(1);
    expect(TORSO_GUIDES.shoulder).toBeLessThan(TORSO_GUIDES.hip);
    expect(TORSO_GUIDES.head).toBeLessThan(TORSO_GUIDES.shoulder);
  });

  it('mirror mode is off until switched on', () => {
    expect(prefOn({} as Prefs, 'mirrorCheckIn')).toBe(false);
  });
});
