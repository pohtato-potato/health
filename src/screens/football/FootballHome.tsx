import { createContext, useContext, type ReactNode } from 'react';
import { go, useRoute } from '../../router';
import type { Family } from '../../ui/kit/families';
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
  /** The kind of place (ledger O40); left out, it is worked out from the route. */
  family?: Family;
}

/** Ledger O40: every page inside Football belongs to one family of doors, shown on its header's small line. */
const PATH_FAMILY: Record<string, Family> = {
  '/football/sheet': 'people', '/football/staff': 'people', '/football/academy': 'people', '/football/trials': 'people', '/football/tie': 'people',
  '/football/duty': 'people', '/football/cast': 'people', '/football/player': 'people', '/football/unit': 'people', '/football/card': 'people', '/football/limit': 'people',
  '/football/projects': 'place',
  '/football/market': 'money', '/football/loans': 'money', '/football/loan': 'money', '/football/packs': 'money', '/football/album': 'record',
  '/football/tech': 'plans', '/football/era': 'plans', '/football/eureka': 'plans', '/football/board': 'plans', '/football/boon': 'plans', '/football/desk': 'plans', '/football/blend': 'plans',
  '/football/atlas': 'world', '/football/cup': 'world', '/football/congress': 'world', '/football/club-page': 'world', '/football/redrawn': 'world',
  '/football/rival': 'record', '/football/track': 'record', '/football/bounties': 'record', '/football/wrapped': 'record',
};
const VIEW_FAMILY: Record<string, Family> = {
  squad: 'people', ground: 'place', kits: 'place', money: 'money', deals: 'money', tree: 'plans',
  divisions: 'world', full: 'world', pyramid: 'world', calendar: 'world', cups: 'world', table: 'world',
  news: 'record', seasons: 'record', moments: 'record', olds: 'record', rivals: 'record',
};
export function familyOf(path: string, view: string | null): Family | undefined {
  if (view && VIEW_FAMILY[view]) return VIEW_FAMILY[view];
  return PATH_FAMILY[path] ?? PATH_FAMILY[path.split('/').slice(0, 3).join('/')];
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
  const route = useRoute();
  return (
    <Aurora className={night ? 'md-night' : undefined}>
      <main className={`fb-page${inner ? ' k-headed' : ''}`}>
        {inner ? (
          <PageHead back={inner.back} title={inner.title} help={inner.help} family={inner.family ?? familyOf(route.path, route.params.get('view'))} onBack={() => go(inner.to, inner.params, { replace: true })} />
        ) : (
          <FootballNav section={section} help={help} />
        )}
        <Headed.Provider value={Boolean(inner)}>{children}</Headed.Provider>
      </main>
    </Aurora>
  );
}
