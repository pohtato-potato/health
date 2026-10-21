import { useUnlockedIds } from '../Theme';
import { dayKey } from '../../domain/dates';
import { themeFor, type ThemeId } from '../../domain/themes';
import type { Settings } from '../../domain/types';

/** Today's theme, which sets the tap's shape and the rings' colours. */
export function useLiveTheme(settings: Settings | undefined): ThemeId {
  const unlocked = useUnlockedIds();
  return settings && unlocked ? themeFor(settings, dayKey(), unlocked) : 'dusk';
}
