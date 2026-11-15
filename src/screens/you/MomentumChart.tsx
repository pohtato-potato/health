import { useId, type CSSProperties } from 'react';
import { smoothPath, type Point } from '../../ui/you/paths';

/**
 * Momentum's chart (look pass, board one "You: proposed"): edge to edge under the big number, filled to the foot.
 * Its resting state is fully drawn; it arrives with a CSS wipe that always lands, never a scripted line that can stall.
 * Short or sparse history: the line runs from the first logged day to today across the whole width, gaps are joined,
 * and a single day draws as a level line. The scale never spans less than MIN_SPAN points, so a quiet month looks quiet.
 */
const W = 336;
const H = 150;
const TOP = 16;
const FOOT = 34;
const MIN_SPAN = 16;

export function chartPoints(vals: (number | null)[], w = W, h = H, minSpan = MIN_SPAN, top = TOP, foot = FOOT): Point[] {
  const known = vals.map((v, i) => (v === null ? null : ([i, v] as Point))).filter((p): p is Point => p !== null);
  if (!known.length) return [];
  const ys = known.map((p) => p[1]);
  const mid = (Math.max(...ys) + Math.min(...ys)) / 2;
  const span = Math.max(Math.max(...ys) - Math.min(...ys), minSpan);
  const lo = mid - span / 2;
  const y = (v: number) => top + (1 - (v - lo) / span) * (h - top - foot);
  if (known.length === 1) return [[0, y(known[0][1])], [w, y(known[0][1])]];
  const first = known[0][0];
  const last = known[known.length - 1][0];
  return known.map(([i, v]) => [((i - first) / (last - first)) * w, y(v)]);
}

export function MomentumChart({ vals, line, fill, label, height = 120 }: { vals: (number | null)[]; line: string; fill: string; label: string; height?: number }) {
  const id = useId().replace(/:/g, '');
  const pts = chartPoints(vals);
  if (!pts.length) return null;
  const d = smoothPath(pts);
  const end = pts[pts.length - 1];
  return (
    <div className="k-mom-chart" role="img" aria-label={label} style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={fill} stopOpacity=".75" /><stop offset="1" stopColor={fill} stopOpacity="0" /></linearGradient>
        </defs>
        <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${id}f)`} />
        <path d={d} fill="none" stroke={line} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <i className="k-mom-dot" style={{ left: `${(Math.min(end[0], W - 6) / W) * 100}%`, top: `${(end[1] / H) * 100}%` } as CSSProperties} />
    </div>
  );
}

/** A trend tile's small line: the same wipe, the full tile width, never a stalled draw. */
export function Spark({ vals, ink }: { vals: number[]; ink: string }) {
  const pts = chartPoints(vals, 120, 40, 1e-9, 5, 5);
  if (pts.length < 2) return <span className="k-spark" aria-hidden="true" />;
  return (
    <span className="k-spark" aria-hidden="true">
      <svg viewBox="0 0 120 40" preserveAspectRatio="none"><path d={smoothPath(pts)} fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>
    </span>
  );
}
