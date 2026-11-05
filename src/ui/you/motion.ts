/** False where frames may never run. Then things simply show in their resting place. */
export function canAnimate(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible' && typeof IntersectionObserver !== 'undefined';
}

/** Fast at first, settling at the end. Shared so a number and a line land together. */
export const easeOut = (k: number): number => 1 - (1 - k) ** 3;

/** Calls `fn` the first time the element comes into view. Returns the cleanup. */
export function onFirstView(el: Element, fn: () => void, threshold = 0.1): () => void {
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) {
      io.disconnect();
      fn();
    }
  }, { threshold });
  io.observe(el);
  return () => io.disconnect();
}
