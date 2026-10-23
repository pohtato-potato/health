import { describe, expect, it } from 'vitest';
import { CITIES } from '../src/domain/walk';
import { LANDMARKS } from '../src/walk/art/landmarks';

const RELIGIOUS = ['mosque', 'gopuram', 'shikhara', 'church', 'gurdwara', 'stupa'];

describe('city landmarks', () => {
  it('every city has a landmark, none of them a religious building', () => {
    for (const name of CITIES) {
      const l = LANDMARKS[name];
      expect(l, name).toBeTruthy();
      expect(l.paths.length, name).toBeGreaterThan(0);
      expect(RELIGIOUS, name).not.toContain(l.kind);
    }
  });

  it('labels name the new landmarks', () => {
    expect(LANDMARKS.Bhopal.label).toBe('the Upper Lake');
    expect(LANDMARKS.Madurai.label).toBe('Thirumalai Nayak Palace');
    expect(LANDMARKS.Nellore.label).toBe('the bridge over the Penna');
    expect(LANDMARKS.Bhubaneswar.label).toBe('Dhauli hill above the Daya');
    expect(LANDMARKS.Hubballi.label).toBe('Unkal Lake');
    expect(LANDMARKS.Puducherry.label).toBe('the old lighthouse');
    expect(LANDMARKS.Thiruvananthapuram.label).toBe('the Napier Museum');
    expect(LANDMARKS.Panaji.label).toBe('the Fontainhas houses');
    expect(LANDMARKS.Shimla.label).toBe("the toy train's viaduct");
    expect(LANDMARKS.Amritsar.label).toBe('the Town Hall');
    expect(LANDMARKS.Leh.label).toBe('Leh Palace');
  });
});
