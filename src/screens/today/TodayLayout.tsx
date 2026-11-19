import type { CSSProperties, ReactNode } from 'react';

/** The theme's four ring inks as page variables, for the aurora, the panel bars and the ring bars (board seven). */
export function panelVars(inks: readonly string[]): CSSProperties {
  return Object.fromEntries(inks.slice(0, 4).map((c, i) => [`--td-i${i + 1}`, c])) as CSSProperties;
}

/** One of Home's panels (board six, Home C): a labelled header bar with an optional status chip, then its body. */
export function TodayPanel({ id, title, chip, chipInk, className, children }: { id: string; title: string; chip?: string; chipInk?: string; className?: string; children: ReactNode }) {
  return (
    <section className={`td-panel${className ? ` ${className}` : ''}`} aria-labelledby={`td-panel-${id}`}>
      <header className="td-panel-bar">
        <h2 className="td-panel-title" id={`td-panel-${id}`}>{title}</h2>
        {chip && (
          <span className="td-pchip" style={chipInk ? ({ '--c': chipInk } as CSSProperties) : undefined}>
            {chip}
          </span>
        )}
      </header>
      <div className="td-panel-body">{children}</div>
    </section>
  );
}

/**
 * Today, Home C (board six): the aurora behind everything, the walk as a short banner, the page heading with the
 * clock and the day's line, then the desk's labelled panels: The day (the rings with a bar for each) and Next (the
 * one lit thing to log, then training). Then Football's panel and the day's other panels (status, what is due,
 * banners, the season), and, scrolled, tonight's shape and the log. The moon Close the day rides at the end.
 */
export function TodayLayout(p: { walk: ReactNode; status?: ReactNode; due?: ReactNode; banner?: ReactNode; line: ReactNode; season?: ReactNode; rings: ReactNode; dayChip?: string; moment: ReactNode; football?: ReactNode; next: ReactNode; nextChip?: string; nextInk?: string; shape?: ReactNode; fx?: ReactNode; log: ReactNode; handle: ReactNode; overlays?: ReactNode; before?: ReactNode; light?: CSSProperties; glow?: boolean; /** All rings closed (h7-perfect): the day panel breathes a gold glow. */ perfect?: boolean }) {
  return (
    <>
      {p.before}
      {p.overlays}
      <div className={`page td-page k-page k-light today${p.glow ? ' td-glow' : ''}`} style={p.light}>
        <div className="td-aur" aria-hidden="true"></div>
        {p.fx}
        {p.walk}
        {p.line}
        <TodayPanel id="day" title="The day" chip={p.dayChip} className={p.perfect ? 'td-perfect' : undefined}>
          {p.perfect && (
            <span className="td-twinkles" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ '--t': i } as CSSProperties} />)}
            </span>
          )}
          {p.rings}
        </TodayPanel>
        <TodayPanel id="next" title="Next" chip={p.nextChip} chipInk={p.nextInk}>
          {p.moment}
          {p.next}
        </TodayPanel>
        {p.football}
        {p.status}
        {p.due}
        {p.banner}
        {p.season}
        {p.shape}
        {p.log}
        {/* The moon button closes the page, in the flow: nothing fixed covers content at any scroll (design check). */}
        {p.handle}
      </div>
    </>
  );
}
