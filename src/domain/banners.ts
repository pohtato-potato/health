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
