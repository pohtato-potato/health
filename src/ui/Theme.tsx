import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { ACHIEVEMENTS } from '../domain/achievements';
import type { DayKey } from '../domain/dates';
import { festivalOn } from '../domain/festivals';
import { THEMES, availableThemes, seasonalThemeOn, themeById, themeFor, unlockFor, type ThemeId } from '../domain/themes';
import { prefOn, type Settings } from '../domain/types';
import { patchSettings } from '../db/actions';
import { db } from '../db/db';
import { Confetti } from './Confetti';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

export function useUnlockedIds(): Set<string> | undefined {
  const rows = useLiveQuery(() => db.achievements.toArray(), []);
  return rows ? new Set(rows.map((r) => r.id)) : undefined;
}

/** Puts today's theme on the page. Night mode wins after 11 pm: dim beats festive at bedtime. */
export function useThemeClass(settings: Settings | undefined, today: DayKey) {
  const unlocked = useUnlockedIds();
  const theme: ThemeId = settings && unlocked ? themeFor(settings, today, unlocked) : 'dusk';
  useEffect(() => {
    const root = document.documentElement;
    for (const t of THEMES) root.classList.toggle(`theme-${t.id}`, t.id === theme && t.id !== 'dusk');
    const bar = themeById(theme)?.bar ?? '#0d0f14';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
  }, [theme]);
  return theme;
}

function Diya({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path className="flame" d="M10 2 C13 7 13 10 10 12 C7 10 7 7 10 2Z" fill="#ffcf5c" />
      <path d="M1 13 H19 C18 18 14 20 10 20 C6 20 2 18 1 13Z" fill="#e0703a" />
      <path d="M1 13 H19" stroke="#f5b94a" strokeWidth="1.2" />
    </g>
  );
}

/** Diwali, Holi or your birthday, at the top of Today. */
export function SeasonStrip({ settings, today }: { settings: Settings; today: DayKey }) {
  if (!prefOn(settings.prefs, 'seasonal')) return null;
  const s = seasonalThemeOn(today, settings.birthday);
  if (!s) return null;
  const fest = festivalOn(today);
  if (s === 'diwali') {
    return (
      <div className="season" role="note">
        <svg width="112" height="22" viewBox="0 0 112 22" aria-hidden="true" style={{ flexShrink: 0 }}>
          {[0, 23, 46, 69, 92].map((x) => (
            <Diya key={x} x={x} />
          ))}
        </svg>
        <div className="col gap2">
          <span className="sf gold" style={{ fontSize: 20 }}>
            {fest?.day === today ? 'Happy Diwali' : 'Diwali week'}
          </span>
          <span className="t12 q">Enjoy the sweets. Occasion mode keeps the streaks safe.</span>
        </div>
      </div>
    );
  }
  if (s === 'holi') {
    return (
      <div className="season" role="note" style={{ borderColor: '#5a3550', background: '#1a1220' }}>
        <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden="true" style={{ flexShrink: 0 }}>
          <circle cx="14" cy="16" r="10" fill="#ff7aa8" opacity="0.85" />
          <circle cx="30" cy="24" r="12" fill="#ffd35c" opacity="0.8" />
          <circle cx="46" cy="14" r="9" fill="#5fd6a0" opacity="0.85" />
          <circle cx="54" cy="30" r="7" fill="#6fb3ff" opacity="0.85" />
          <circle cx="22" cy="34" r="5" fill="#c08cff" opacity="0.85" />
        </svg>
        <div className="col gap2">
          <span className="sf" style={{ fontSize: 20, color: '#ff7aa8' }}>
            Holi hai!
          </span>
          <span className="t12 q">Colours on. Go and play.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="season" role="note" style={{ borderColor: '#4b3a66', background: '#17131f', minHeight: 72 }}>
      <Confetti palette={['#f7c96b', '#d6a8ff', '#ff9c8a', '#8fc9b0']} count={16} height={80} width={360} seed={today.length * 13} />
      <Icon name="win" size={26} color="#f7c96b" />
      <div className="col gap2" style={{ position: 'relative' }}>
        <span className="sf" style={{ fontSize: 20, color: '#f7c96b' }}>
          Happy birthday{settings.name ? `, ${settings.name}` : ''}
        </span>
        <span className="t12 q">Your day. Nothing to close, nothing to hit.</span>
      </div>
    </div>
  );
}

/** Pick a theme: Dusk plus every one you've earned. */
export function ThemeSheet({ settings, unlocked, today, onClose }: { settings: Settings; unlocked: Set<string>; today: DayKey; onClose: () => void }) {
  const available = availableThemes(unlocked);
  const current = themeFor(settings, today, unlocked);
  const picked = settings.theme ?? 'dusk';
  const seasonalNow = prefOn(settings.prefs, 'seasonal') ? seasonalThemeOn(today, settings.birthday) : undefined;
  return (
    <Sheet title="Theme" sub="Earn more from achievements" onClose={onClose} tall>
      {seasonalNow && (
        <div className="t14 gold lh">
          {themeById(seasonalNow)?.name} is on today, so it takes over. Your pick comes back tomorrow.
        </div>
      )}
      <div className="list">
        {THEMES.filter((t) => !t.seasonalOnly).map((t) => {
          const open = available.includes(t);
          const ach = unlockFor(t);
          const secret = ach?.cat === 'secret';
          return (
            <button key={t.id} type="button" className="li" style={{ minHeight: 68, gap: 14, opacity: open ? 1 : 0.55 }} disabled={!open} onClick={() => patchSettings({ theme: t.id })}>
              <span className="theme-swatch" aria-hidden="true">
                {t.swatch.map((c, i) => (
                  <i key={i} style={{ background: c }} />
                ))}
              </span>
              <span className="s" style={{ flex: 1, textAlign: 'left' }}>
                <span>{t.name}</span>
                <small>{open ? t.blurb : ach ? (secret ? 'Unlocked by a secret achievement' : `Unlock: ${ach.name}`) : t.blurb}</small>
              </span>
              {open ? picked === t.id ? <Icon name="check" size={20} color="var(--gold)" /> : null : <Icon name="lock" size={18} color="var(--dim)" />}
            </button>
          );
        })}
      </div>
      <div className="t12 q lh">
        Showing now: {themeById(current)?.name}. Diwali, Holi and your birthday bring their own look for the day when seasonal themes are on. {ACHIEVEMENTS.filter((a) => a.reward?.endsWith('theme')).length} themes to earn in all.
      </div>
    </Sheet>
  );
}
