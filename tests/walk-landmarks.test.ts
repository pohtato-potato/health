import { describe, expect, it } from 'vitest';
import { CITIES } from '../src/domain/walk';
import { LANDMARKS } from '../src/walk/art/landmarks';

const RELIGIOUS = ['mosque', 'gopuram', 'shikhara', 'church', 'gurdwara', 'stupa'];

describe('city landmarks', () => {
  it('every city has a landmark', () => {
    for (const name of CITIES) {
      expect(LANDMARKS[name], name).toBeTruthy();
      expect(LANDMARKS[name].paths.length, name).toBeGreaterThan(0);
    }
  });

  it('keeps places of worship to a mix: about one city in ten, where it is the defining sight', () => {
    const religious = CITIES.filter((c) => RELIGIOUS.includes(LANDMARKS[c].kind));
    expect(religious.sort()).toEqual(['Amritsar', 'Bhubaneswar', 'Madurai']);
  });

  it('labels name the new landmarks', () => {
    expect(LANDMARKS.Bhopal.label).toBe('the Upper Lake');
    expect(LANDMARKS.Madurai.label).toBe('the Meenakshi temple towers');
    expect(LANDMARKS.Nellore.label).toBe('the bridge over the Penna');
    expect(LANDMARKS.Bhubaneswar.label).toBe('the Lingaraj temple');
    expect(LANDMARKS.Hubballi.label).toBe('Unkal Lake');
    expect(LANDMARKS.Puducherry.label).toBe('the old lighthouse');
    expect(LANDMARKS.Thiruvananthapuram.label).toBe('the Napier Museum');
    expect(LANDMARKS.Panaji.label).toBe('the Fontainhas houses');
    expect(LANDMARKS.Shimla.label).toBe("the toy train's viaduct");
    expect(LANDMARKS.Amritsar.label).toBe('the Golden Temple');
    expect(LANDMARKS.Leh.label).toBe('Leh Palace');
  });
});
