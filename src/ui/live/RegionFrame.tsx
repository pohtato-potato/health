import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Aurora } from './Aurora';
import { regionTint, useWalkKm } from './regionTint';

type FrameProps = { className?: string; style?: CSSProperties; children?: ReactNode };

/**
 * A page Today opens (Food, Close the day, Readiness, the week, Check-in) sits on the region's aurora, as Today
 * does; its cards turn to glass (region.css). The page keeps its own layout: the aurora is a fixed layer behind it.
 */
export function RegionFrame(p: FrameProps) {
  return <RegionFrameView km={useWalkKm()} {...p} />;
}

export function RegionFrameView({ km, className, style, children }: FrameProps & { km: number | undefined }) {
  return (
    <>
      <div className="lv rg-ground" style={km === undefined ? undefined : regionTint(km)}>
        <Aurora />
      </div>
      <div className={`page rg-page${className ? ` ${className}` : ''}`} style={style}>
        {children}
      </div>
    </>
  );
}

/** The region's colour on the root, so a sheet on any tab takes a solid tint of the land (region.css). */
export function RegionRoot() {
  const km = useWalkKm();
  const a = km === undefined ? undefined : (regionTint(km) as Record<string, string>)['--lv-a'];
  useEffect(() => {
    if (a) document.documentElement.style.setProperty('--region-a', a);
  }, [a]);
  return null;
}
