import type { DayKey } from './dates';

export interface Festival {
  id: 'diwali' | 'holi';
  name: string;
  /** The main day. */
  day: DayKey;
  /** The whole festival, for seasonal themes. */
  from: DayKey;
  to: DayKey;
}

/**
 * Dates checked against Indian festival calendars (drikpanchang and others).
 * Add later years here as they're confirmed.
 */
export const FESTIVALS: Festival[] = [
  { id: 'diwali', name: 'Diwali', day: '2026-11-08', from: '2026-11-06', to: '2026-11-10' },
  { id: 'holi', name: 'Holi', day: '2027-03-22', from: '2027-03-21', to: '2027-03-22' },
  { id: 'diwali', name: 'Diwali', day: '2027-10-29', from: '2027-10-27', to: '2027-10-31' },
];

export function festivalOn(date: DayKey): Festival | undefined {
  return FESTIVALS.find((f) => date >= f.from && date <= f.to);
}

export function nextFestival(date: DayKey): Festival | undefined {
  return FESTIVALS.find((f) => f.to >= date);
}
