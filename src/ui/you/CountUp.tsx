import { useEffect, useRef, useState } from 'react';
import { canAnimate, easeOut, onFirstView } from './motion';

/** Counts up the first time it is seen. A timer lands it on the true number if frames never run. */
export function CountUp({ to, ms = 1100, fmt = String }: { to: number; ms?: number; fmt?: (n: number) => string }) {
  const [armed] = useState(canAnimate);
  const [n, setN] = useState(armed ? 0 : to);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!armed) { setN(to); return; }
    if (!ref.current) return;
    let raf = 0;
    let landing = 0;
    const stop = onFirstView(ref.current, () => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        setN(Math.round(to * easeOut(k)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      landing = window.setTimeout(() => { cancelAnimationFrame(raf); setN(to); }, ms + 200);
    });
    return () => { stop(); cancelAnimationFrame(raf); clearTimeout(landing); };
  }, [to, ms, armed]);
  return <span ref={ref} className="tn">{fmt(n)}</span>;
}
