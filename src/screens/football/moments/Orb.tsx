// The ring-and-rays moment (board 23, m23-rival, m23-level, m23-open, m23-awake): one shared orb. The centre piece is
// the grid's only child in flow, placed by `place-items: center` with no offset transform, so it sits dead centre at
// every size (owner's board 23 note). The ring and the rays are drawn behind it and hidden from screen readers.
import type { CSSProperties, ReactNode } from 'react';

const ink = (colour: string) => ({ ['--c' as string]: colour }) as CSSProperties;

export function Orb({ colour, rays = 12, children }: { colour: string; rays?: number; children: ReactNode }) {
  return (
    <div className="orb" style={ink(colour)}>
      <span className="orb-ring" aria-hidden="true" />
      <span className="orb-rays" aria-hidden="true">{Array.from({ length: rays }, (_, k) => <i key={k} style={{ ['--a' as string]: `${Math.round((k * 360) / rays)}deg`, animationDelay: `${(k * 0.2).toFixed(1)}s` } as CSSProperties} />)}</span>
      <span className="orb-core">{children}</span>
    </div>
  );
}

/** One fact under a moment: a coloured tile, the words, and an optional figure at the end. */
export function MomentRow({ colour, mark, title, line, end }: { colour: string; mark: ReactNode; title: string; line?: string; end?: string }) {
  return (
    <div className="mo-row" style={ink(colour)}>
      <i aria-hidden="true">{mark}</i>
      <span><b>{title}</b>{line && <small>{line}</small>}</span>
      {end && <em>{end}</em>}
    </div>
  );
}

/**
 * A full-screen moment page (board 23): its colour washes the top, the hero (an orb or a stamp), a two-line title with
 * the second line in the colour, then the body and one button at the foot.
 */
export function MomentPage({ colour, hero, title, sub, titleId, children, action, onAction }: {
  colour: string; hero: ReactNode; title: string; sub: string; titleId: string; children?: ReactNode; action: string; onAction: () => void;
}) {
  return (
    <main className="mo-page" style={ink(colour)}>
      {hero}
      <h2 id={titleId} className="mo-title">{title}<br /><span>{sub}</span></h2>
      {children}
      <button type="button" className="mo-go" onClick={onAction}>{action}</button>
    </main>
  );
}

export const BOLT = <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
