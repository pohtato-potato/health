import { useMemo } from 'react';
import type { PartOfDay } from '../../domain/dates';
import { lightFor, mix, REGIONS, type RegionId } from '../../ui/light';
import { landmarkFor } from './landmarks';
import { FestiveDecor, festiveSky, type Festive } from './festive';
import { PEOPLE, WALKER } from './people';

const W = 390;
const H = 250;

/** How rough each region's skyline is: amplitude and number of bumps. */
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

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

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

/**
 * The shared illustration: a region's four-ink land lit for the hour (from lightFor), the
 * stop's landmark between the far ridge and the near ground, stars at night, warm windows
 * at dusk and night, and optionally a few people on the road. All vector, no raster.
 */
export function Scene({ city, region: regionIn, part, people = false, landmarkScale = 1, caption, className, overlay, festive }: { city?: string; region?: RegionId; part: PartOfDay; people?: boolean; landmarkScale?: number; caption?: React.ReactNode; className?: string; overlay?: React.ReactNode; festive?: Festive }) {
  const lm = city ? landmarkFor(city) : undefined;
  const region = regionIn ?? lm?.region ?? 'plains';
  const base = lightFor(part, region);
  const light = festive ? { ...base, sky: festiveSky(festive, base.sky) } : base;
  const shapes = useMemo(() => {
    const rnd = seeded(REGIONS.indexOf(region) * 977 + 13);
    const { amp, bumps } = RELIEF[region];
    return [0.55, 0.7, 0.82, 0.93].map((f, i) => ridge(H * f, amp * (1 - i * 0.2), bumps + i, rnd));
  }, [region]);
  const stars = useMemo(() => {
    const rnd = seeded(7);
    return Array.from({ length: 40 }, () => [rnd() * W, rnd() * H * 0.5, 0.4 + rnd() * 0.9] as const);
  }, []);
  const lit = part === 'dusk' || part === 'night';
  const ink = mix(light.layers[1], '#05061a', part === 'day' ? 0.25 : 0.45);
  const accent = mix(light.sky[2], '#ffffff', 0.5);
  const sunY = { dawn: 0.5, day: 0.18, dusk: 0.46, night: 0.2 }[part] * H;
  const id = `scene-${region}-${part}-${city ?? 'none'}`.replace(/\s/g, '');
  const ground = H * 0.8;
  const s = 1.15 * landmarkScale;

  return (
    <figure className={`band${className ? ` ${className}` : ''}`} aria-label={lm ? `${lm.label}, ${city}` : city}>
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
        {part === 'night' && stars.map(([x, y, rr], i) => <circle key={i} cx={x} cy={y} r={rr} fill="#f6eed9" opacity={0.35 + (i % 3) * 0.2} />)}
        <circle cx={W * 0.78} cy={sunY} r={70} fill={`url(#${id}-glow)`} />
        <circle cx={W * 0.78} cy={sunY} r={part === 'night' ? 9 : 13} fill={light.glow} />
        {festive && <FestiveDecor f={festive} W={W} />}
        <path d={shapes[0]} fill={light.layers[0]} />
        <path d={shapes[1]} fill={light.layers[1]} />
        {lm && (
          <g transform={`translate(${W * 0.5 - 60 * s} ${ground}) scale(${s})`}>
            {lm.paths.map((d, i) => (
              <path key={i} d={d} fill={ink} fillRule="evenodd" />
            ))}
            {lm.accents?.map((d, i) => <path key={`a${i}`} d={d} fill={accent} opacity={0.8} />)}
            {lit && lm.lights?.map((d, i) => <path key={`l${i}`} d={d} fill="#f2c46d" opacity={0.9} />)}
          </g>
        )}
        <path d={shapes[2]} fill={light.layers[2]} />
        <path d={shapes[3]} fill={light.layers[3]} />
        {people && (
          <g fill={mix(light.layers[3], '#000000', 0.55)}>
            <g transform={`translate(${W * 0.7} ${H * 0.97}) scale(1.4)`}>
              <path d={WALKER.path} />
            </g>
            <g transform={`translate(${W * 0.86} ${H * 0.98}) scale(1.2)`}>
              <path d={PEOPLE[REGIONS.indexOf(region) % PEOPLE.length].path} />
            </g>
          </g>
        )}
        {overlay}
      </svg>
      {caption && <figcaption className="band-caption">{caption}</figcaption>}
    </figure>
  );
}
