import type { CSSProperties, ReactNode } from 'react';
import { Aurora } from '../../ui/live/Aurora';

/**
 * Today in the spec's order: the walk, the banner slot, the line (and the season strip), the rings, the moment card,
 * Next up, then logging below the fold. The drawer handle rides above the tab bar after them. The page sits on the aurora
 * tinted by the region the walk is in, as every Walk page does.
 */
export function TodayLayout(p: { walk: ReactNode; banner: ReactNode; line: ReactNode; season?: ReactNode; rings: ReactNode; moment: ReactNode; next: ReactNode; log: ReactNode; handle: ReactNode; overlays?: ReactNode; before?: ReactNode; tint?: CSSProperties; asIs?: boolean }) {
  return (
    <>
      {p.before}
      {p.overlays}
      <div className={`page td-page lv lv-tab${p.asIs ? ' as-is' : ''}`} style={p.tint}>
        <Aurora />
        <h1 className="sr-only">Today</h1>
        {p.walk}
        {p.banner}
        {p.line}
        {p.season}
        {p.rings}
        {p.moment}
        {p.next}
        {p.log}
      </div>
      {p.handle}
    </>
  );
}
