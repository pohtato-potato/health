import { describe, expect, it } from 'vitest';
import { isMorningSlot, weighInToCome } from '../src/domain/morningLog';

describe('the morning log that waits for the weigh-in (y-morning)', () => {
  it('a saved morning without a weight leaves the chip', () => {
    expect(weighInToCome({ morning: { at: 1 } })).toBe(true);
  });
  it('the chip goes once the weight is in, and never shows before the log', () => {
    expect(weighInToCome({ morning: { at: 1 }, weightKg: 80 })).toBe(false);
    expect(weighInToCome({})).toBe(false);
    expect(weighInToCome(undefined)).toBe(false);
  });
  it('no chip when sick or away: the weigh-in is not expected', () => {
    expect(weighInToCome({ morning: { at: 1 }, status: 'sick' })).toBe(false);
    expect(weighInToCome({ morning: { at: 1 }, status: 'travelling' })).toBe(false);
  });
  it('morning and daily slots are offered; night ones wait', () => {
    expect(isMorningSlot('Morning')).toBe(true);
    expect(isMorningSlot('Daily')).toBe(true);
    expect(isMorningSlot('9 pm')).toBe(false);
    expect(isMorningSlot('Night')).toBe(false);
  });
});
