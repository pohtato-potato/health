import { describe, expect, it } from 'vitest';
import { BANNER_PRIORITY, morningLogBanner, notDismissed } from '../src/domain/banners';
import { occasionDue } from '../src/domain/occasions';
import type { Settings } from '../src/domain/types';

describe('one banner, in priority order', () => {
  it('ranks update > dose > morning log > backup > maintenance > check-in > recap > review > occasion > install', () => {
    const order = ['update', 'dose', 'morningLog', 'backup', 'maintenance', 'checkin', 'recap', 'review', 'occasion', 'install'] as const;
    const values = order.map((k) => BANNER_PRIORITY[k]);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(new Set(values).size).toBe(order.length);
  });
});

describe('notDismissed', () => {
  const c = [{ id: 'backup', priority: 80 }, { id: 'checkin', priority: 70 }];
  it('keeps a dismissed banner away for the rest of the log day', () => {
    expect(notDismissed(c, { date: '2026-10-21', ids: ['backup'] }, '2026-10-21').map((x) => x.id)).toEqual(['checkin']);
  });
  it("lets yesterday's dismissal lapse", () => {
    expect(notDismissed(c, { date: '2026-10-20', ids: ['backup'] }, '2026-10-21')).toHaveLength(2);
  });
  it('keeps everything with no dismissal', () => {
    expect(notDismissed(c, null, '2026-10-21')).toHaveLength(2);
  });
});

describe('the occasion banner', () => {
  const settings = (occasions: Settings['occasions'] = []) => ({ occasions }) as unknown as Settings;
  it('is due when a festival is within 21 days and not covered', () => {
    expect(occasionDue(settings(), '2026-10-21')).toMatchObject({ name: 'Diwali', from: '2026-11-06', to: '2026-11-10', inDays: 16 });
  });
  it('is not due more than 21 days ahead', () => {
    expect(occasionDue(settings(), '2026-10-15')).toBeUndefined();
  });
  it('is not due once an occasion covers the festival', () => {
    const covered = settings([{ id: 'o1', kind: 'festival', name: 'Diwali', from: '2026-11-06', to: '2026-11-10' } as unknown as NonNullable<Settings['occasions']>[number]]);
    expect(occasionDue(covered, '2026-10-21')).toBeUndefined();
  });
});

describe('the morning log banner only after 14:00 (before then the moment card asks)', () => {
  it('is absent before 14:00', () => {
    expect(morningLogBanner(false, 9 * 60)).toBeUndefined();
  });
  it('shows from 14:00 at the morning-log priority', () => {
    expect(morningLogBanner(false, 14 * 60)).toEqual({ text: 'Morning log still open.', priority: BANNER_PRIORITY.morningLog });
  });
});
