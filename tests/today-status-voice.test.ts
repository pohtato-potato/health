import { describe, expect, it } from 'vitest';
import { plainLine, plainStatusLine } from '../src/domain/voice';

describe('a status day speaks plainly', () => {
  it('sick, injured and break days have a kind plain line that never mentions training', () => {
    for (const s of ['sick', 'injured', 'break'] as const) {
      const line = plainStatusLine(s);
      expect(line).toBeTruthy();
      expect(line).not.toMatch(/session|train|lift|set|steps|ring/i);
    }
  });

  it('travelling, an occasion and no status keep the usual voice', () => {
    expect(plainStatusLine('travelling')).toBeUndefined();
    expect(plainStatusLine('occasion')).toBeUndefined();
    expect(plainStatusLine(undefined)).toBeUndefined();
  });

  it('the status outranks every moment; a joint flag still comes first', () => {
    expect(plainLine({ status: 'sick' })).toBe(plainStatusLine('sick'));
    expect(plainLine({ status: 'injured', flag: 'Joint flagged. Take it easy.' })).toBe('Joint flagged. Take it easy.');
    expect(plainLine({ status: 'travelling' })).toBeUndefined();
    expect(plainLine({})).toBeUndefined();
  });
});
