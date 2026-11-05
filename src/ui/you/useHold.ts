import { useRef } from 'react';

const HOLD_MS = 500;

/** A press that also opens on a long hold, so a thumb that rests still gets there. Tap toggles; holding opens and the lift that follows leaves it open. */
export function useHold(open: boolean, setOpen: (v: boolean) => void) {
  const timer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const stop = () => { window.clearTimeout(timer.current); };
  return {
    onPointerDown: () => {
      held.current = false;
      stop();
      timer.current = window.setTimeout(() => { held.current = true; setOpen(true); }, HOLD_MS);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    onClick: () => {
      if (held.current) { held.current = false; return; }
      setOpen(!open);
    },
  };
}
