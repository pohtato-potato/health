import { checkInDue } from './checkinSchedule';
import { addDays, dayKey, daysBetween, type DayKey } from './dates';
import { fmtDayMonth } from './format';
import type { Day, Settings } from './types';
import { lastFullWeek } from './weekly';

export interface DueItem { id: 'story' | 'checkin' | 'backup'; text: string; action: string; path: string }

const BACKUP_DAYS = 10;
const FIRST_CHECKIN_AFTER = 3;

/** The backup sentence, once ten days have gone by unsaved. */
export function backupLine(settings: Settings, today: DayKey, days: Day[]): string | undefined {
  if (!days.length) return undefined;
  const last = Math.max(settings.backup.lastQuick ?? 0, settings.backup.lastFull ?? 0);
  if (!last) return daysBetween(dayKey(new Date(settings.createdAt)), today) >= BACKUP_DAYS ? 'No backup yet' : undefined;
  const saved = dayKey(new Date(last));
  const gap = daysBetween(saved, today);
  return gap >= BACKUP_DAYS ? `Backup safe up to ${fmtDayMonth(saved)} · ${gap} days not saved` : undefined;
}

export function dueItems(i: { today: DayKey; settings: Settings; days: Day[]; lastCheckIn?: DayKey; storySeenWeek?: DayKey }): DueItem[] {
  const out: DueItem[] = [];
  const week = lastFullWeek(i.today);
  const end = addDays(week, 6);
  if (i.storySeenWeek !== week && i.days.some((d) => d.date >= week && d.date <= end)) {
    out.push({ id: 'story', text: "Last week's story is ready", action: 'Open', path: '/week' });
  }
  const checkIn = i.lastCheckIn
    ? checkInDue(i.today, i.settings.checkInDay ?? 1, i.lastCheckIn)
    : daysBetween(dayKey(new Date(i.settings.createdAt)), i.today) > FIRST_CHECKIN_AFTER;
  if (checkIn) out.push({ id: 'checkin', text: 'Your check-in is due', action: 'Open', path: '/checkin' });
  const backup = backupLine(i.settings, i.today, i.days);
  if (backup) out.push({ id: 'backup', text: backup, action: 'Save', path: '/settings' });
  return out;
}
