import type { ReactNode } from 'react';

/**
 * Today in the spec's order: the walk, the banner slot, the line (and the season strip), the rings, the moment card,
 * Next up, then logging below the fold. The drawer handle rides above the tab bar after them.
 */
export function TodayLayout(p: { walk: ReactNode; banner: ReactNode; line: ReactNode; season?: ReactNode; rings: ReactNode; moment: ReactNode; next: ReactNode; log: ReactNode; handle: ReactNode; overlays?: ReactNode; before?: ReactNode }) {
  return (
    <>
      {p.before}
      {p.overlays}
      <div className="page td-page">
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
