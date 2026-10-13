import { go, openSheet } from '../router';
import { Icon, type IconName } from './Icon';

const TABS: { id: string; label: string; icon: IconName; path: string }[] = [
  { id: 'today', label: 'Today', icon: 'today', path: '/today' },
  { id: 'train', label: 'Train', icon: 'train', path: '/train' },
  { id: 'walk', label: 'Walk', icon: 'journey', path: '/journey' },
  { id: 'you', label: 'You', icon: 'you', path: '/you' },
];

export function TabBar({ active }: { active: string }) {
  const tab = (t: (typeof TABS)[number]) => (
    <a
      key={t.id}
      href={`#${t.path}`}
      className={active === t.id ? 'on' : undefined}
      data-tab={t.id}
      aria-current={active === t.id ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault();
        if (active === t.id) window.scrollTo({ top: 0, behavior: 'smooth' });
        else go(t.path, undefined, { replace: true });
      }}
    >
      <Icon name={t.icon} size={24} />
      {t.label}
    </a>
  );
  return (
    <nav className="tabbar" aria-label="Main">
      {tab(TABS[0])}
      {tab(TABS[1])}
      <button type="button" className="plus" aria-label="Log something" onClick={() => openSheet('log')}>
        <span>
          <Icon name="plus" size={24} stroke={2} />
        </span>
      </button>
      {tab(TABS[2])}
      {tab(TABS[3])}
    </nav>
  );
}
