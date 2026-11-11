import type { Day } from './types';

/**
 * The morning log on the loo (y-morning, 11 Nov): sleep and the checklist save straight away, and the weigh-in can
 * follow. Until it does, Today shows one "weigh-in to come" chip, so there is never a reason to back out.
 */
export function weighInToCome(day: Pick<Day, 'morning' | 'weightKg' | 'status'> | undefined | null): boolean {
  return !!day?.morning && day.weightKg === undefined && day.status !== 'sick' && day.status !== 'travelling';
}

/** The checklist slots the morning log offers: the ones named for the morning, and once-a-day items. */
export function isMorningSlot(slot: string): boolean {
  return /morning|^am$|breakfast|daily|wake/i.test(slot.trim());
}
