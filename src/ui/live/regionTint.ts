import type { CSSProperties } from 'react';
import { useAllDays } from '../../db/hooks';
import { regionAt } from '../../domain/regions';
import { kmFromSteps } from '../../domain/walk';
import { auroraFor } from '../../walk/page';

/** How the day went, as a light on the land: in range, a record night, a perfect day. */
export type DayGlow = 'in' | 'record' | 'perfect';

/**
 * Each glow: the live session's own deep colour, which fills half the field, and its bright light. Gold only for
 * what was earned: a record night or a perfect day.
 */
const GLOW: Record<DayGlow, [string, string]> = { in: ['#1a8f6a', '#bfe8d4'], record: ['#8a6420', '#f6cf72'], perfect: ['#8a6420', '#f6cf72'] };

/**
 * The aurora for where the walk is, outside a live session: the region is the ground, and the day's glow, if any,
 * is the small light on it. The whole field changes colour only in a live session and in full-screen moments.
 */
export function regionTint(km: number, glow?: DayGlow): CSSProperties {
  const t = auroraFor(regionAt(km));
  return (glow ? { ...t, '--lv-glow': GLOW[glow][0], '--lv-accent': GLOW[glow][1] } : t) as CSSProperties;
}

/** The region's km from every logged step, for pages that don't already add them up. */
export function useWalkKm(): number | undefined {
  const days = useAllDays();
  return days ? kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0)) : undefined;
}
