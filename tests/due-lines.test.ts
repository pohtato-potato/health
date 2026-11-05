import { describe, expect, it } from 'vitest';
import { dueItems, backupLine } from '../src/domain/dueLines';
import { addDays } from '../src/domain/dates';
import { defaultSettings } from '../src/db/actions';
import type { Day, Settings } from '../src/domain/types';

const TODAY = '2026-11-05'; // A Thursday. The last full week began on Monday 26 October.
const at = (date: string) => new Date(`${date}T12:00:00`).getTime();
const settings = (over: Partial<Settings['backup']> = {}, created = '2026-01-01'): Settings => ({
  ...defaultSettings(),
  createdAt: at(created),
  backup: { nudgeDays: 7, ...over },
});
const lastWeek: Day[] = [{ date: '2026-10-28', steps: 5000 } as Day];
const base = { today: TODAY, lastCheckIn: TODAY };

describe('dueItems', () => {
  it('fixed order: story, then check-in, then backup', () => {
    const s = { ...settings(), checkInDay: 5 };
    const items = dueItems({ today: TODAY, settings: s, days: lastWeek, lastCheckIn: '2026-09-01' });
    expect(items.map((x) => x.id)).toEqual(['story', 'checkin', 'backup']);
  });

  it('story goes once that week has been opened', () => {
    const items = dueItems({ ...base, settings: settings({ lastQuick: at(TODAY) }), days: lastWeek, storySeenWeek: '2026-10-26' });
    expect(items.map((x) => x.id)).not.toContain('story');
  });

  it('story goes with no data that week', () => {
    const items = dueItems({ ...base, settings: settings({ lastQuick: at(TODAY) }), days: [{ date: '2026-10-01', steps: 1 } as Day] });
    expect(items.map((x) => x.id)).not.toContain('story');
  });

  it('nothing due gives an empty list', () => {
    expect(dueItems({ ...base, settings: settings({ lastQuick: at(TODAY) }), days: [] })).toEqual([]);
  });
});

describe('backupLine', () => {
  const days = lastWeek;
  it('is silent at 9 days and due at 10', () => {
    expect(backupLine(settings({ lastQuick: at(addDays(TODAY, -9)) }), TODAY, days)).toBeUndefined();
    expect(backupLine(settings({ lastQuick: at('2026-10-26') }), TODAY, days)).toBe('Backup safe up to 26 Oct · 10 days not saved');
  });

  it('no backup ever: silent for 9 days of use, "No backup yet" at 10', () => {
    expect(backupLine(settings({}, addDays(TODAY, -9)), TODAY, days)).toBeUndefined();
    expect(backupLine(settings({}, addDays(TODAY, -10)), TODAY, days)).toBe('No backup yet');
  });

  it('no data means nothing to back up', () => {
    expect(backupLine(settings({}, addDays(TODAY, -30)), TODAY, [])).toBeUndefined();
  });

  it('a full backup counts too, and the later one wins', () => {
    const line = backupLine(settings({ lastQuick: at('2026-10-01'), lastFull: at(addDays(TODAY, -2)) }), TODAY, days);
    expect(line).toBeUndefined();
  });
});
