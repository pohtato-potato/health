import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { ACHIEVEMENTS } from '../domain/achievements';
import type { DayKey } from '../domain/dates';
import { festivalOn } from '../domain/festivals';
import { THEMES, availableThemes, lookOf, seasonalThemeOn, themeById, themeFor, unlockFor, type ThemeDef, type ThemeId, type ThemeLook } from '../domain/themes';
import { GlowRings } from './rings/GlowRings';
import { wearSky } from '../walk/art/festive';
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
  const look = lookOf(theme);
  // Walk's sky follows the theme; set while rendering so the scene drawn in this same pass already wears it.
  wearSky(look.sky);
  useEffect(() => {
    const root = document.documentElement;
    for (const t of THEMES) root.classList.toggle(`theme-${t.id}`, t.id === theme && t.id !== 'dusk');
    if (theme === 'dusk') delete root.dataset.themed;
    else root.dataset.themed = theme;
    // The page light and the action colour, as custom properties the kit reads (src/styles/kit.css).
    const vars = themeVars(look);
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    const bar = themeById(theme)?.bar ?? '#0d0f14';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
  }, [theme, look]);
  return theme;
}

/** A theme's look as the custom properties the kit reads. */
export function themeVars(look: ThemeLook): Record<string, string> {
  const l = look.light;
  return {
    '--act': look.act,
    '--th-light': `radial-gradient(90% 46% at ${l.warmAt}, ${l.warm}, transparent 70%), radial-gradient(90% 50% at ${l.coolAt}, ${l.cool}, transparent 70%), ${l.ground}`,
    '--th-ground': l.ground,
    '--th-w1': l.warm.replace(/,\s*\.?\d*\)$/, ', .18)'),
    '--th-w2': l.cool.replace(/,\s*\.?\d*\)$/, ', .24)'),
    '--ring-1': look.ring.inks[0],
    '--ring-2': look.ring.inks[1],
    '--ring-3': look.ring.inks[2],
    '--ring-4': look.ring.inks[3],
  };
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
          <span className="sf apricot" style={{ fontSize: 20 }}>
            {fest?.day === today ? 'Happy Diwali' : 'Diwali week'}
          </span>
          <span className="t14 q">Enjoy the sweets. The lights are on for it.</span>
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
          <span className="t14 q">Colours on. Go and play.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="season" role="note" style={{ borderColor: '#4b3a66', background: '#17131f', minHeight: 72 }}>
      <Confetti palette={['#f7c96b', '#d6a8ff', '#ff9c8a', '#8fc9b0']} count={16} height={80} width={360} seed={today.length * 13} />
      <Icon name="win" size={26} color="#f7c96b" />
      <div className="col gap2" style={{ position: 'relative' }}>
        <span className="sf" style={{ fontSize: 20, color: 'var(--apricot)' }}>
          Happy birthday{settings.name ? `, ${settings.name}` : ''}
        </span>
        <span className="t14 q">Your day. Nothing to close, nothing to hit.</span>
      </div>
    </div>
  );
}

/** A theme as the picker shows it (board five): its light, its own rings, two numbers in their metric colours. */
export function ThemeTile({ t, open, on, note, onPick }: { t: ThemeDef; open: boolean; on: boolean; note: string; onPick: () => void }) {
  const l = t.look.light;
  const bg = `radial-gradient(90% 60% at ${l.warmAt}, ${l.warm}, transparent 70%), radial-gradient(90% 60% at ${l.coolAt}, ${l.cool}, transparent 70%), ${l.ground}`;
  return (
    <button type="button" className={`th-tile${on ? ' on' : ''}${open ? '' : ' locked'}`} style={{ background: bg }} disabled={!open} aria-pressed={on} onClick={onPick}
      aria-label={`${t.name}: ${t.look.ring.name}. ${note}`}>
      <span className="th-top">
        <GlowRings design={t.look.ring.design} inks={t.look.ring.inks} shown={[0.72, 0.5, 1, 0.88]} closed={[false, false, true, false]} size={62} small />
        <span className="th-nums" aria-hidden="true">
          <b style={{ color: '#ff8a4d' }}>1,511</b>
          <b style={{ color: '#5ff0b0' }}>12,740</b>
        </span>
      </span>
      <b className="th-name">{t.name}</b>
      <span className="th-why">{note}</span>
      {on && <span className="th-on" aria-hidden="true"><Icon name="check" size={18} stroke={2.6} /></span>}
      {!open && <span className="th-on" aria-hidden="true"><Icon name="lock" size={16} /></span>}
    </button>
  );
}

/** Pick a theme: Dusk, the free ones, plus every one you've earned. Each shows its rings and its light. */
export function ThemeSheet({ settings, unlocked, today, onClose }: { settings: Settings; unlocked: Set<string>; today: DayKey; onClose: () => void }) {
  const available = availableThemes(unlocked);
  const current = themeFor(settings, today, unlocked);
  const picked = settings.theme ?? 'dusk';
  const seasonalNow = prefOn(settings.prefs, 'seasonal') ? seasonalThemeOn(today, settings.birthday) : undefined;
  return (
    <Sheet title="Themes" sub="Each with its own light, rings and sky" onClose={onClose} tall>
      {seasonalNow && (
        <div className="t14 gold lh">
          {themeById(seasonalNow)?.name} is on today, so it takes over. Your pick comes back tomorrow.
        </div>
      )}
      <div className="th-grid">
        {THEMES.filter((t) => !t.seasonalOnly).map((t) => {
          const open = available.includes(t);
          const ach = unlockFor(t);
          const secret = ach?.cat === 'secret';
          const note = open ? `${t.look.ring.name}${picked === t.id ? ' · wearing now' : ''}` : ach ? (secret ? 'Unlocked by a secret achievement' : `Unlock: ${ach.name}`) : t.blurb;
          return <ThemeTile key={t.id} t={t} open={open} on={picked === t.id} note={note} onPick={() => void patchSettings({ theme: t.id })} />;
        })}
      </div>
      <div className="t14 q lh">
        Showing now: {themeById(current)?.name}. A theme changes the light behind each page, the action colour, the rings with their bars and numbers on Today, and Walk's sky. Diwali, Holi and your birthday bring their own look for the day when seasonal themes are on. {ACHIEVEMENTS.filter((a) => a.reward?.endsWith('theme')).length} themes to earn.
      </div>
    </Sheet>
  );
}
