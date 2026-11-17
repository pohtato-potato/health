// The motion round (O44): the few pieces every moving thing shares. A change is remembered per place (in this
// browser only), so a figure that moved while you were away moves once when you come back, then sits still.
// Every animation here ends still: nothing keeps moving once it lands, and nothing shifts position after it.
import { useEffect, useRef, useState } from 'react';
import '../../styles/motion.css';

const PREFIX = 'motion:';
function read<T>(key: string): T | undefined {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}
function write(key: string, v: unknown) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PREFIX + key, JSON.stringify(v));
  } catch {
    /* private window or full storage: the motion simply plays less */
  }
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface Change<T> { from: T | undefined; to: T; /** Counts changes seen by this mount; 0 = nothing moved. */ n: number }

/**
 * The last change of a value. With `key`, the value last seen at that place (in an earlier visit) counts as where
 * it came from, so a change made elsewhere still moves once here. Without a key only changes during this visit count.
 */
export function useChange<T>(key: string | undefined, value: T): Change<T> {
  const ref = useRef<Change<T> | null>(null);
  if (ref.current === null) {
    const stored = key ? read<T>(key) : undefined;
    const moved = stored !== undefined && !same(stored, value);
    ref.current = { from: moved ? stored : undefined, to: value, n: moved ? 1 : 0 };
  } else if (!same(ref.current.to, value)) {
    ref.current = { from: ref.current.to, to: value, n: ref.current.n + 1 };
  }
  const json = JSON.stringify(value);
  useEffect(() => {
    if (key) write(key, JSON.parse(json));
  }, [key, json]);
  return ref.current;
}

/** Remembers a value at a place and says what it was before this visit (undefined the first time). */
export function useSeenBefore<T>(key: string, value: T): T | undefined {
  const [before] = useState(() => read<T>(key));
  const json = JSON.stringify(value);
  useEffect(() => write(key, JSON.parse(json)), [key, json]);
  return before;
}

/** 0 → 1 over `ms` each time `n` changes (and is above 0); 1 when nothing moves. Ends still at 1. */
export function useTween(n: number, ms: number, delay = 0): number {
  const [p, setP] = useState(n ? 0 : 1);
  useEffect(() => {
    if (!n) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    setP(0);
    const tick = (t: number) => {
      const q = Math.min(1, Math.max(0, (t - t0) / ms));
      setP(q);
      if (q < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setP(1);
    };
  }, [n, ms, delay]);
  return p;
}

/** Something with weight: past the mark by about an eighth, back a little under, then still (exactly 1 at p = 1). */
export const spring = (p: number) => (p >= 1 ? 1 : p <= 0 ? 0 : 1 - Math.exp(-5 * p) * Math.cos(2.5 * Math.PI * p));
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
