// Whether tonight is a match night, for the tab bar's brighter Football glow (O44). The tab bar lives in the main
// bundle and Football's code loads late, so the pages that already know (Tonight, Today's match panel) leave a note.
import { useEffect, useSyncExternalStore } from 'react';

const KEY = 'motion:match-night';
const EVENT = 'motion-match-night';
function read(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Notes tonight as a match night (a match to play, not yet played) or not. */
export function useMarkMatchNight(date: string, on: boolean) {
  useEffect(() => {
    try {
      const now = read();
      const next = on ? date : `no:${date}`;
      if (now === next) return;
      localStorage.setItem(KEY, next);
      window.dispatchEvent(new Event(EVENT));
    } catch {
      /* no storage: the glow stays as usual */
    }
  }, [date, on]);
}

/** True when the last note says today is a match night. */
export function useMatchNight(today: string): boolean {
  const v = useSyncExternalStore(
    (l) => {
      window.addEventListener(EVENT, l);
      window.addEventListener('storage', l);
      return () => {
        window.removeEventListener(EVENT, l);
        window.removeEventListener('storage', l);
      };
    },
    read,
    () => null,
  );
  return v === today;
}
