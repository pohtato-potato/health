import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { canAnimate, easeOut, onFirstView } from './motion';
import { smoothPath, type Point } from './paths';

interface Props {
  vals: number[];
  c: string;
  c2?: string;
  h?: number;
  area?: boolean;
  width?: number;
  /** A resting dot on today. */
  last?: boolean;
  /** Draws by the clock with a dot riding the tip, landing on today with one soft pulse. */
  tip?: boolean;
  /** How long a `tip` line takes. Match a CountUp's `ms` and they land together. */
  ms?: number;
}

export function DrawnLine({ vals, c, c2, h = 90, area = true, width = 2.6, last = true, tip = false, ms = 1100 }: Props) {
  const id = useId().replace(/:/g, '');
  const line = useRef<SVGPathElement>(null);
  const rider = useRef<SVGGElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [armed] = useState(() => tip && canAnimate());
  // Drawn at its real width, so dots stay round and strokes stay even.
  const [W, setW] = useState(320);
  useLayoutEffect(() => {
    if (!svg.current) return;
    const measure = () => { const w = svg.current?.clientWidth; if (w) setW(w); };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(svg.current);
    return () => ro.disconnect();
  }, []);
  const lo = Math.min(...vals) - 2;
  const hi = Math.max(...vals) + 2;
  const pts = vals.map((t, i): Point => [
    vals.length > 1 ? (i * (W - 12)) / (vals.length - 1) + 4 : W / 2,
    h - 6 - ((t - lo) / (hi - lo)) * (h - 14),
  ]);
  const d = smoothPath(pts);
  const end = pts[pts.length - 1];

  // Before paint, so a riding line never flashes in full.
  useLayoutEffect(() => {
    if (armed && line.current) line.current.style.strokeDashoffset = '1';
    if (armed && rider.current) rider.current.style.opacity = '0';
  }, [armed]);

  useEffect(() => {
    if (!armed || !svg.current) return;
    let raf = 0;
    let landing = 0;
    const place = (k: number) => {
      const path = line.current;
      if (!path || !rider.current) return;
      path.style.strokeDashoffset = String(1 - k);
      const p = path.getPointAtLength(path.getTotalLength() * k);
      rider.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
    };
    const land = () => {
      cancelAnimationFrame(raf);
      place(1);
      svg.current?.classList.add('yu-landed');
    };
    const stop = onFirstView(svg.current, () => {
      const t0 = performance.now();
      if (rider.current) rider.current.style.opacity = '1';
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        place(easeOut(k));
        if (k < 1) raf = requestAnimationFrame(tick);
        else land();
      };
      raf = requestAnimationFrame(tick);
      landing = window.setTimeout(land, ms + 200);
    });
    return () => { stop(); cancelAnimationFrame(raf); clearTimeout(landing); };
  }, [armed, ms, d]);

  if (vals.length === 0) return null;
  return (
    <svg ref={svg} className={`yu-line${tip ? ' yu-tip' : ''}`} viewBox={`0 0 ${W} ${h}`} aria-hidden="true" style={{ height: h }}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor={c} /><stop offset="1" stopColor={c2 ?? c} /></linearGradient>
        <linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={c2 ?? c} stopOpacity=".5" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient>
      </defs>
      {area && <path className="yu-fill" d={`${d} L${end[0]} ${h} L${pts[0][0]} ${h} Z`} fill={`url(#${id}f)`} />}
      <path ref={line} className="yu-draw" pathLength={1} d={d} fill="none" stroke={`url(#${id}s)`} strokeWidth={width} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {tip && (
        <g ref={rider} className="yu-rider" style={{ transform: `translate(${end[0]}px, ${end[1]}px)` }}>
          <circle r="4.5" fill={c2 ?? c} />
        </g>
      )}
      {last && !tip && <circle className="yu-dot" cx={end[0]} cy={end[1]} r="4.5" fill={c2 ?? c} />}
    </svg>
  );
}
