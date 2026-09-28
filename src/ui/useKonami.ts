import { useRef, type MouseEvent, type PointerEvent } from 'react';

const CODE = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];

/**
 * Watches for ↑ ↑ ↓ ↓ ← → ← → swiped across an element. A swipe swallows the
 * click that would otherwise follow it, so the rings don't open Food by accident.
 */
export function useKonami(onCode: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef<string[]>([]);
  const swiped = useRef(false);
  return {
    onPointerDown: (e: PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      start.current = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      swiped.current = true;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      moves.current = [...moves.current, dir].slice(-CODE.length);
      if (moves.current.join() === CODE.join()) {
        moves.current = [];
        onCode();
      }
    },
    onClickCapture: (e: MouseEvent) => {
      if (swiped.current) {
        swiped.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    style: { touchAction: 'none' as const },
  };
}
