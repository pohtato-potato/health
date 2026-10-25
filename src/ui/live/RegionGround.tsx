import { useEffect } from 'react';
import { Aurora } from './Aurora';
import { regionTint, useWalkKm } from './regionTint';

/** Pages opened from Today that sit on the region's aurora with glass cards. */
export const REGION_PAGES = ['/food', '/close', '/readiness', '/week', '/checkin'];

/**
 * The region's aurora behind a page that has none of its own, and the region's colours on the root, so sheets
 * anywhere take a solid tint of the land.
 */
export function RegionGround({ path }: { path: string }) {
  const km = useWalkKm();
  const on = REGION_PAGES.includes(path);
  const tint = km === undefined ? undefined : (regionTint(km) as Record<string, string>);
  useEffect(() => {
    const root = document.documentElement;
    if (tint) root.style.setProperty('--region-a', tint['--lv-a']);
    root.classList.toggle('region', on);
    return () => root.classList.remove('region');
  }, [tint?.['--lv-a'], on]);
  if (!on || !tint) return null;
  return (
    <div className="lv lv-ground" style={tint}>
      <Aurora />
    </div>
  );
}
