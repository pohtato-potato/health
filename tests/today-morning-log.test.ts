import { describe, expect, it } from 'vitest';
import { BANNER_PRIORITY, morningLogBanner } from '../src/domain/banners';

describe('the morning log reminder stays until the morning log is done', () => {
  it('after 14:00, and late at night, it stays as a plain reminder', () => {
    expect(morningLogBanner(false, 14 * 60)).toEqual({ text: 'Morning log still open.', priority: BANNER_PRIORITY.morningLog });
    // Logging minutes run past midnight: 1 am is 25:00 on the same logging day.
    expect(morningLogBanner(false, 25 * 60)?.text).toBe('Morning log still open.');
  });

  it('is gone once the morning log is done', () => {
    expect(morningLogBanner(true, 9 * 60)).toBeUndefined();
    expect(morningLogBanner(true, 22 * 60)).toBeUndefined();
  });
});
