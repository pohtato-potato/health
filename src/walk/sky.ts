import { dayKey, parseDay, type DayKey } from '../domain/dates';

/** The mean length of the moon's cycle, and a new moon to count from (6 Jan 2000, 18:14 UTC). */
const SYNODIC_DAYS = 29.530588853;
const NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;

/** Which night the sky belongs to: until noon it is still last night's. */
export function skyNight(now: Date): DayKey {
  const d = new Date(now);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Where the moon is in its cycle at an instant: 0 new, 0.5 full, back to 1. The mean cycle, good to within about half a day. */
export function moonPhase(at: Date): number {
  const days = (at.getTime() - NEW_MOON_2000) / DAY_MS;
  return (((days / SYNODIC_DAYS) % 1) + 1) % 1;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * The instant of full moon number `k` (k = n + 0.5 counted from the new moon of January 2000), by Meeus's method
 * (Astronomical Algorithms, chapter 49): the mean phase plus the main periodic terms, good to a few minutes.
 */
export function fullMoonAt(k: number): Date {
  const T = k / 1236.85;
  const jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = rad(2.5534 + 29.1053567 * k);
  const Mp = rad(201.5643 + 385.81693528 * k);
  const F = rad(160.7108 + 390.67050284 * k);
  const O = rad(124.7746 - 1.56375588 * k);
  const fix =
    -0.40614 * Math.sin(Mp) +
    0.17302 * E * Math.sin(M) +
    0.01614 * Math.sin(2 * Mp) +
    0.01043 * Math.sin(2 * F) +
    0.00734 * E * Math.sin(Mp - M) -
    0.00514 * E * Math.sin(Mp + M) +
    0.00209 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(Mp - 2 * F) -
    0.00057 * Math.sin(Mp + 2 * F) +
    0.00056 * E * Math.sin(2 * Mp + M) -
    0.00042 * Math.sin(3 * Mp) +
    0.00042 * E * Math.sin(M + 2 * F) +
    0.00038 * E * Math.sin(M - 2 * F) -
    0.00024 * E * Math.sin(2 * Mp - M) -
    0.00017 * Math.sin(O);
  return new Date((jde + fix - 2440587.5) * DAY_MS);
}

/**
 * A full-moon night: the night of `day` (local noon to the next noon) holds the moment of full moon, so the moon that
 * rises that evening is the full one.
 */
export function isFullMoon(day: DayKey): boolean {
  const start = parseDay(day);
  start.setHours(12, 0, 0, 0);
  const from = start.getTime();
  const to = start.getTime() + DAY_MS;
  const k0 = Math.round((start.getTime() - NEW_MOON_2000) / DAY_MS / SYNODIC_DAYS - 0.5) + 0.5;
  return [k0 - 1, k0, k0 + 1].some((k) => {
    const t = fullMoonAt(k).getTime();
    return t >= from && t < to;
  });
}

export type Shower = 'quadrantids' | 'lyrids' | 'perseids' | 'geminids';

/** The peak nights of the great annual showers, as month-day. */
const SHOWERS: [Shower, string[]][] = [
  ['quadrantids', ['01-03', '01-04']],
  ['lyrids', ['04-22', '04-23']],
  ['perseids', ['08-12', '08-13']],
  ['geminids', ['12-13', '12-14']],
];

export const SHOWER_NAMES: Record<Shower, string> = { quadrantids: 'the Quadrantids', lyrids: 'the Lyrids', perseids: 'the Perseids', geminids: 'the Geminids' };

/** A meteor shower at its peak that night, if any. */
export function meteorShower(day: DayKey): Shower | undefined {
  return SHOWERS.find(([, nights]) => nights.includes(day.slice(5)))?.[0];
}

/** The Walk tab's line for a night worth looking up: a shower at its peak, or else a full moon. */
export function skyLine(day: DayKey): string | undefined {
  const s = meteorShower(day);
  if (s) return `${SHOWER_NAMES[s][0].toUpperCase()}${SHOWER_NAMES[s].slice(1)} peak tonight.`;
  return isFullMoon(day) ? 'Full moon tonight.' : undefined;
}
