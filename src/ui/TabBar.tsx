import { useState } from 'react';
import { flushSync } from 'react-dom';
import { go } from '../router';
import { Icon, type IconName } from './Icon';
import { useToday } from '../db/hooks';
import { useMatchNight } from './motion/matchNight';
import '../styles/motion.css';

/**
 * Moving between tabs (motion board one, O44): the page slides the way you are going, toward the tab's side; the tab
 * bar stays put. Uses the browser's view transitions; without them the tab simply changes.
 */
function slide(run: () => void, dir: 'left' | 'right') {
  const d = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (!d.startViewTransition) return run();
  const html = document.documentElement;
  html.classList.add(`mo-go-${dir}`);
  try {
    d.startViewTransition(() => flushSync(run)).finished.finally(() => html.classList.remove(`mo-go-${dir}`));
  } catch {
    html.classList.remove(`mo-go-${dir}`);
    run();
  }
}

const TABS: { id: string; label: string; icon?: IconName; path: string }[] = [
  { id: 'today', label: 'Today', icon: 'today', path: '/today' },
  { id: 'train', label: 'Train', icon: 'train', path: '/train' },
  { id: 'football', label: 'Football', path: '/football' },
  { id: 'walk', label: 'Walk', icon: 'journey', path: '/walk' },
  { id: 'you', label: 'You', icon: 'you', path: '/you' },
];

/** The round crest mark in the centre slot: Brabo's orange ring with a slow glow. */
function FootballMark() {
  return (
    <span className="fb-tabmark" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="7" />
        <path d="M38 62 V40 M46 60 V32 M54 60 V30 M62 62 V38 M32 50 L38 62 Q46 74 58 70 Q66 66 66 56" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function TabBar({ active }: { active: string }) {
  // The tapped icon bounces and draws itself (O44): remounting it restarts its one animation.
  const [tap, setTap] = useState({ id: '', n: 0 });
  const night = useMatchNight(useToday());
  const at = (id: string) => TABS.findIndex((x) => x.id === id);
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <a
          key={t.id}
          href={`#${t.path}`}
          className={[active === t.id ? 'on' : '', t.id === 'football' ? 'fb' : '', tap.id === t.id ? 'mo-tap' : '', t.id === 'football' && night ? 'mo-night' : ''].filter(Boolean).join(' ') || undefined}
          data-tab={t.id}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            setTap((x) => ({ id: t.id, n: x.n + 1 }));
            if (active === t.id) {
              if (t.id === 'football' && location.hash.replace(/^#/, '').split('?')[0] !== '/football') go('/football', undefined, { replace: true });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else slide(() => go(t.path, undefined, { replace: true }), at(t.id) > at(active) ? 'right' : 'left');
          }}
        >
          <span key={tap.id === t.id ? tap.n : 0} style={{ display: 'contents' }}>{t.icon ? <Icon name={t.icon} size={24} /> : <FootballMark />}</span>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
