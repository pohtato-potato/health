import type { DayKey } from './dates';
import type { UsageEvent } from './types';

export interface BannerCandidate {
  id: string;
  /** Higher shows first. */
  priority: number;
  /** Shown at any hour (an update, a dose that is due), not only near the usual hour. */
  anytime?: boolean;
}

const DAY_MS = 86_400_000;
const DEFAULT_HOUR_MIN = 21 * 60;

/** The owner's usual logging time, in minutes after midnight: the median over 14 days, else 21:00. */
export function usualHour(usage: Pick<UsageEvent, 'at' | 'kind'>[], now: number): number {
  const mins = usage
    .filter((u) => u.kind === 'log' && u.at <= now && now - u.at <= 14 * DAY_MS)
    .map((u) => {
      const d = new Date(u.at);
      // Logging just after midnight belongs to the evening before.
      const m = d.getHours() * 60 + d.getMinutes();
      return m < 240 ? m + 1440 : m;
    })
    .sort((a, b) => a - b);
  if (!mins.length) return DEFAULT_HOUR_MIN;
  const mid = Math.floor(mins.length / 2);
  const med = mins.length % 2 ? mins[mid] : Math.round((mins[mid - 1] + mins[mid]) / 2);
  return med % 1440;
}

/** Banners appear from an hour before the usual logging time to two hours after. */
const BEFORE_MIN = 60;
const AFTER_MIN = 120;

/** One banner at a time: the highest priority that may show now. */
export function pickBanner<T extends BannerCandidate>(candidates: T[], usage: Pick<UsageEvent, 'at' | 'kind'>[], now: number): T | undefined {
  const hour = usualHour(usage, now);
  const d = new Date(now);
  let m = d.getHours() * 60 + d.getMinutes();
  if (m < 240) m += 1440;
  const h = hour < 240 ? hour + 1440 : hour;
  const near = m >= h - BEFORE_MIN && m <= h + AFTER_MIN;
  return [...candidates].filter((c) => c.anytime || near).sort((a, b) => b.priority - a.priority)[0];
}

/** One banner at a time; higher shows first. The morning log, backup, check-in and occasion follow the spec's order; the others sit around them. */
export const BANNER_PRIORITY = {
  update: 100,
  dose: 95,
  morningLog: 90,
  backup: 80,
  maintenance: 75,
  checkin: 70,
  recap: 60,
  review: 55,
  occasion: 50,
  walkNews: 45,
  install: 40,
} as const;

/** Before 14:00 the moment card asks for the morning log; after it, the banner keeps a plain reminder. */
const MORNING_FROM_MIN = 14 * 60;

/**
 * The morning log banner, by logging minutes (1 am is 25:00). From 14:00 it stays as a plain reminder
 * until the log is done, since the whole day is often logged after 9 pm.
 */
export function morningLogBanner(done: boolean, minutes: number): { text: string; priority: number } | undefined {
  if (done || minutes < MORNING_FROM_MIN) return undefined;
  return { text: 'Morning log still open.', priority: BANNER_PRIORITY.morningLog };
}

/** Banners dismissed today stay away until the log day ends. */
export function notDismissed<T extends BannerCandidate>(c: T[], dismissed: { date: DayKey; ids: string[] } | null, today: DayKey): T[] {
  if (!dismissed || dismissed.date !== today) return c;
  return c.filter((x) => !dismissed.ids.includes(x.id));
}

/** A dose banner names its dose, so dismissing the morning dose never hides the evening one. */
export function doseBannerId(dose: { key: string }): string {
  return `next-dose:${dose.key}`;
}

/**
 * The banner slot holds what it showed on load: `held` is that banner's id (null when nothing showed, undefined before
 * the first decision). A banner that becomes due later waits for the next load; one dismissed or acted on leaves the slot empty.
 */
export function holdBanner<T extends BannerCandidate>(held: string | null | undefined, pick: T | undefined, all: T[]): T | undefined {
  if (held === undefined) return pick;
  if (held === null) return undefined;
  return all.find((c) => c.id === held);
}
