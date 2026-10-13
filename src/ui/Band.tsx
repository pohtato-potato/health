import { useMemo } from 'react';
import { partOfDay, type PartOfDay } from '../domain/dates';
import { lightFor, REGIONS, type RegionId } from './light';

const W = 390;
const H = 250;

/** How rough each region's skyline is, far to near: amplitude and how many bumps. */
const RELIEF: Record<RegionId, { amp: number; bumps: number }> = {
  plains: { amp: 10, bumps: 3 },
  desert: { amp: 22, bumps: 2 },
  ravines: { amp: 30, bumps: 6 },
  deccan: { amp: 26, bumps: 3 },
  ghats: { amp: 40, bumps: 4 },
  coast: { amp: 14, bumps: 3 },
  east: { amp: 16, bumps: 4 },
  northeast: { amp: 38, bumps: 5 },
  himalaya: { amp: 70, bumps: 5 },
};

/** A small seeded random so a region always draws the same skyline. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** One ridge as a closed path, its baseline at y and bumps drawn with smooth curves. */
function ridge(y: number, amp: number, bumps: number, rnd: () => number): string {
  const n = bumps * 2 + 2;
  const pts = Array.from({ length: n + 1 }, (_, i) => [(i / n) * W, y - (i % 2 ? amp * (0.6 + rnd() * 0.4) : amp * rnd() * 0.35)]);
  let d = `M0 ${H} L0 ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, yy] = pts[i];
    const mx = (px + x) / 2;
    d += ` C${mx.toFixed(1)} ${py.toFixed(1)} ${mx.toFixed(1)} ${yy.toFixed(1)} ${x.toFixed(1)} ${yy.toFixed(1)}`;
  }
  return `${d} L${W} ${H} Z`;
}

/** The landscape band at the top of Today: the region's four inks, lit for the hour. */
export function Band({
  region,
  part = partOfDay(new Date()),
  place,
  nextKm,
  nextName,
}: {
  region: RegionId;
  part?: PartOfDay;
  place: string;
  nextKm?: number;
  nextName?: string;
}) {
  const light = lightFor(part, region);
  const shapes = useMemo(() => {
    const rnd = seeded(REGIONS.indexOf(region) * 977 + 13);
    const { amp, bumps } = RELIEF[region];
    return [0.55, 0.68, 0.8, 0.92].map((f, i) => ridge(H * f, amp * (1 - i * 0.18), bumps + i, rnd));
  }, [region]);
  const stars = useMemo(() => {
    const rnd = seeded(7);
    return Array.from({ length: 34 }, () => [rnd() * W, rnd() * H * 0.5, 0.4 + rnd() * 0.9] as const);
  }, []);
  const sunY = { dawn: 0.5, day: 0.18, dusk: 0.48, night: 0.2 }[part] * H;
  const id = `band-${region}-${part}`;

  return (
    <figure className="band" aria-label={`${place}${nextKm !== undefined ? `, ${nextKm} km to ${nextName ?? 'the next stop'}` : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={light.sky[0]} />
            <stop offset="0.55" stopColor={light.sky[1]} />
            <stop offset="1" stopColor={light.sky[2]} />
          </linearGradient>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor={light.glow} stopOpacity="0.9" />
            <stop offset="0.25" stopColor={light.glow} stopOpacity="0.35" />
            <stop offset="1" stopColor={light.glow} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}-sky)`} />
        {part === 'night' && stars.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#f6eed9" opacity={0.35 + (i % 3) * 0.2} />)}
        <circle cx={W * 0.72} cy={sunY} r={70} fill={`url(#${id}-glow)`} />
        <circle cx={W * 0.72} cy={sunY} r={part === 'night' ? 9 : 13} fill={light.glow} />
        {shapes.map((d, i) => (
          <path key={i} d={d} fill={light.layers[i]} />
        ))}
      </svg>
      <figcaption className="band-caption">
        <span className="band-place">{place}</span>
        {nextKm !== undefined && (
          <span className="band-next t13">
            <span className="num tn">{nextKm}</span> km to {nextName ?? 'the next stop'}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
