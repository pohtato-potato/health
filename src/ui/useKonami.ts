import { useRef, type MouseEvent, type PointerEvent } from 'react';

type Dir = 'up' | 'down' | 'left' | 'right';
const CODE: Dir[] = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];

/** A vertical drag scrolls the page; only sideways swipes stay with the figure. */
export const KONAMI_STYLE = { touchAction: 'pan-y' as const };

/** A tap on the figure, read by the edge it lands nearest: top is ↑, left is ←. */
export function tapDirection(x: number, y: number, w: number, h: number): Dir {
  const dx = x / w - 0.5;
  const dy = y / h - 0.5;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

/** One more move: `done` when the last eight spell the code, which then starts over. */
export function konamiStep(moves: string[], dir: Dir): { moves: string[]; done: boolean } {
  const next = [...moves, dir].slice(-CODE.length);
  return next.join() === CODE.join() ? { moves: [], done: true } : { moves: next, done: false };
}

/**
 * Watches for ↑ ↑ ↓ ↓ ← → ← → on an element: tap near its top, bottom, left or right edge,
 * or swipe sideways. Vertical drags are left to the page, so it still scrolls.
 * A swipe swallows the click that would otherwise follow it.
 */
export function useKonami(onCode: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef<string[]>([]);
  const swiped = useRef(false);
  const add = (dir: Dir) => {
    const s = konamiStep(moves.current, dir);
    moves.current = s.moves;
    if (s.done) onCode();
  };
  return {
    onPointerDown: (e: PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    // The browser takes a vertical drag for scrolling: that press is no move at all.
    onPointerCancel: () => {
      start.current = null;
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      start.current = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
        const r = e.currentTarget.getBoundingClientRect();
        if (r.width && r.height) add(tapDirection(e.clientX - r.left, e.clientY - r.top, r.width, r.height));
        return;
      }
      if (Math.abs(dy) >= Math.abs(dx)) return;
      swiped.current = true;
      add(dx > 0 ? 'right' : 'left');
    },
    onClickCapture: (e: MouseEvent) => {
      if (swiped.current) {
        swiped.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    style: KONAMI_STYLE,
  };
}
