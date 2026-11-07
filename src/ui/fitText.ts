import { useLayoutEffect, useRef } from 'react';

/** The size that fits `natural` (the width at `max`) into `avail`: never above max, never below min. */
export function fitFontSize({ max, min, avail, natural }: { max: number; min: number; avail: number; natural: number }): number {
  if (!(natural > 0) || natural <= avail) return max;
  return Math.max(min, Math.floor((max * avail) / natural));
}

/**
 * Big text that shrinks to its line: measured at `max` px, then scaled down to the width its
 * parent gives it, so a long number never runs off the screen. Re-measured on resize and when
 * the text changes (`dep`).
 */
export function useFitText<T extends HTMLElement>(max: number, min: number, dep: unknown) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      el.style.fontSize = `${max}px`;
      const cs = getComputedStyle(box);
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      el.style.fontSize = `${fitFontSize({ max, min, avail, natural: el.scrollWidth })}px`;
    };
    fit();
    // Fonts arrive after the first paint: measure again once they're in.
    void document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [max, min, dep]);
  return ref;
}
