import { useUnlockedIds } from '../Theme';
import { dayKey } from '../../domain/dates';
import { themeFor, type ThemeId } from '../../domain/themes';
import type { Settings } from '../../domain/types';

/** The living background: four soft lights drifting, tinted by the state; still draws nothing moving. */
export function Aurora({ still }: { still?: boolean }) {
  return (
    <div className="lv-field" aria-hidden="true">
      {!still && (
        <>
          <i className="blob b1" />
          <i className="blob b2" />
          <i className="blob b3" />
          <i className="blob b4" />
        </>
      )}
      <i className="lv-dim" />
    </div>
  );
}

/** Today's theme, which sets the tap's shape and the rings' colours. */
export function useLiveTheme(settings: Settings): ThemeId {
  const unlocked = useUnlockedIds();
  return unlocked ? themeFor(settings, dayKey(), unlocked) : 'dusk';
}
