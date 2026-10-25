import { REGIONS } from '../geo';
import { trailTo } from '../mapView';
import { trailBetween } from '../trail';

type Pt = [number, number];
const path = (pts: Pt[]) => 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');

/**
 * A stretch of the walk drawn on India: the land, the whole trail so far faint, and the stretch bright in sage, with
 * a dot where it began and where it ended. Framed on the stretch, never narrower than about half the country, so you can tell where it is.
 */
export function TrailDrawing({ fromKm, toKm, label }: { fromKm: number; toKm: number; label: string }) {
  const india = REGIONS.india;
  const part = trailBetween(fromKm, toKm);
  const xs = part.map((p) => p[0]);
  const ys = part.map((p) => p[1]);
  const [bw, bh] = [india.box[2], india.box[3]];
  const side = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), bw / 2.6) * 1.3;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const x = Math.min(Math.max(cx - side / 2, 0), Math.max(bw - side, 0));
  const y = Math.min(Math.max(cy - side / 2, 0), Math.max(bh - side, 0));
  const s = side / 100;
  return (
    <svg viewBox={`${x.toFixed(1)} ${y.toFixed(1)} ${side.toFixed(1)} ${side.toFixed(1)}`} width="100%" role="img" aria-label={label} style={{ maxHeight: 280 }}>
      <path d={india.outline} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.35)" strokeWidth={0.6 * s} />
      <path d={path(trailTo(toKm))} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.2 * s} strokeLinecap="round" strokeLinejoin="round" />
      <path className="trail-draw" d={path(part)} pathLength={1} fill="none" stroke="var(--sage)" strokeWidth={2.6 * s} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={part[0][0]} cy={part[0][1]} r={2.4 * s} fill="none" stroke="var(--sage)" strokeWidth={1.2 * s} />
      <circle cx={part.at(-1)![0]} cy={part.at(-1)![1]} r={3 * s} fill="var(--sage)" />
    </svg>
  );
}
