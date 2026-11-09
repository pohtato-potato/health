import type { CSSProperties, ReactNode } from 'react';
import { Aurora } from '../../ui/live/Aurora';

/**
 * Today in the pinned order (closing drawing, Today AM): the walk, the status chip, the line, what is due today, the
 * rings, then the morning match and tonight's shape; after them the banner slot, the season strip, the moment card,
 * Next up, then logging. The drawer handle rides above the tab bar after them. The page sits on the aurora
 * tinted by the region the walk is in, as every Walk page does.
 */
export function TodayLayout(p: { walk: ReactNode; status?: ReactNode; due?: ReactNode; banner: ReactNode; line: ReactNode; season?: ReactNode; rings: ReactNode; moment: ReactNode; football?: ReactNode; next: ReactNode; fx?: ReactNode; log: ReactNode; handle: ReactNode; overlays?: ReactNode; before?: ReactNode; tint?: CSSProperties; glow?: boolean }) {
  return (
    <>
      {p.before}
      {p.overlays}
      <div className={`page td-page lv lv-tab${p.glow ? ' lv-glow' : ''}`} style={p.tint}>
        <Aurora />
        {p.fx}
        <h1 className="sr-only">Today</h1>
        {p.walk}
        {p.status}
        {p.line}
        {p.due}
        {p.rings}
        {p.football}
        {p.banner}
        {p.season}
        {p.moment}
        {p.next}
        {p.log}
      </div>
      {p.handle}
    </>
  );
}
