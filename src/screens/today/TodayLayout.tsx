import type { CSSProperties, ReactNode } from 'react';

/**
 * Today on the kit (look pass, boards three and five). The first screen: the walk as a short banner, the count of
 * closed rings as the heading with the day's line under it, the rings with their numbers (the lead), the one lit
 * panel with the next thing to log and its glowing action, then Football's panel. Then the day's other panels
 * (status, what is due, banners, the season, training), and, scrolled, tonight's shape, quick add, the meals, the
 * body log and the checklist. The moon Close the day rides above the tab bar, and the page leaves room for it.
 */
export function TodayLayout(p: { walk: ReactNode; status?: ReactNode; due?: ReactNode; banner?: ReactNode; line: ReactNode; season?: ReactNode; rings: ReactNode; moment: ReactNode; football?: ReactNode; next: ReactNode; shape?: ReactNode; fx?: ReactNode; log: ReactNode; handle: ReactNode; overlays?: ReactNode; before?: ReactNode; light?: CSSProperties; glow?: boolean }) {
  return (
    <>
      {p.before}
      {p.overlays}
      <div className={`page td-page k-page k-light today${p.glow ? ' td-glow' : ''}`} style={p.light}>
        {p.fx}
        <h1 className="sr-only">Today</h1>
        {p.walk}
        {p.line}
        {p.rings}
        {p.moment}
        {p.football}
        {p.status}
        {p.due}
        {p.banner}
        {p.season}
        {p.next}
        {p.shape}
        {p.log}
      </div>
      {p.handle}
    </>
  );
}
