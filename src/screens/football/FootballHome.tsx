import type { ReactNode } from 'react';
import { go } from '../../router';

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

/** Football's home: the four top tabs as a segmented control, then the section. */
export function FootballHome({ section, children, night }: { section: FbSection; children?: ReactNode; night?: boolean }) {
  return (
    <Aurora className={night ? 'md-night' : undefined}>
      <main className="fb-page">
        <nav className="fb-seg" aria-label="Football">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.path}`}
              className={section === s.id ? 'on' : undefined}
              aria-current={section === s.id ? 'page' : undefined}
              onClick={(e) => { e.preventDefault(); go(s.path, undefined, { replace: true }); }}
            >
              {s.label}
            </a>
          ))}
        </nav>
        {children}
      </main>
    </Aurora>
  );
}
