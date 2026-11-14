import { createContext, useContext, type ReactNode } from 'react';
import { go } from '../../router';
import { HelpButton, PageHead, type HowThisWorks } from '../../ui/kit/Kit';

export type FbSection = 'tonight' | 'club' | 'league' | 'story';
export const SECTIONS: { id: FbSection; label: string; path: string }[] = [
  { id: 'tonight', label: 'Tonight', path: '/football' },
  { id: 'club', label: 'Club', path: '/football/club' },
  { id: 'league', label: 'League', path: '/football/league' },
  { id: 'story', label: 'Story', path: '/football/story' },
];

/** The aurora field behind every Football screen. */
export function Aurora({ a, c, children, className }: { a?: string; c?: string; children: ReactNode; className?: string }) {
  const style = { ...(a ? { '--a': a } : {}), ...(c ? { '--c': c } : {}) } as React.CSSProperties;
  return (
    <div className={`fb-au ${className ?? ''}`} style={style}>
      <div className="fb-field" aria-hidden="true">
        <i className="bl b1" /><i className="bl b2" /><i className="bl b3" /><i className="bl b4" /><i className="dim" />
      </div>
      {children}
    </div>
  );
}

/** A page inside a section: its name, and the one way back. */
export interface FbInner {
  title: string;
  back: string;
  to: string;
  params?: Record<string, string>;
  help?: HowThisWorks;
}

/** True inside a page that already has its header, so older screens leave out their own back buttons. */
const Headed = createContext(false);
export const useHeaded = () => useContext(Headed);

/** Navigation A (look pass): four words across the top, underlined where you are. Everything else is a door. */
export function FootballNav({ section, help }: { section: FbSection; help?: HowThisWorks }) {
  return (
    <nav className="k-nav" aria-label="Football">
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.path}`}
          aria-current={section === s.id ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); go(s.path, undefined, { replace: true }); }}
        >
          {s.label}
        </a>
      ))}
      {help && <HelpButton how={help} />}
    </nav>
  );
}

/**
 * Football's frame. A section's own page shows the four words; a page inside a section shows only its way back and its
 * name (pass `inner`).
 */
export function FootballHome({ section, children, night, inner, help }: { section: FbSection; children?: ReactNode; night?: boolean; inner?: FbInner; help?: HowThisWorks }) {
  return (
    <Aurora className={night ? 'md-night' : undefined}>
      <main className={`fb-page${inner ? ' k-headed' : ''}`}>
        {inner ? (
          <PageHead back={inner.back} title={inner.title} help={inner.help} onBack={() => go(inner.to, inner.params, { replace: true })} />
        ) : (
          <FootballNav section={section} help={help} />
        )}
        <Headed.Provider value={Boolean(inner)}>{children}</Headed.Provider>
      </main>
    </Aurora>
  );
}
