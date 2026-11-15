import { useId, useMemo } from 'react';
import type { PartOfDay } from '../../domain/dates';
import { REGIONS, type RegionId } from '../../ui/light';
import { FestiveDecor, festiveSky, type Festive } from './festive';
import type { Landmark } from './landmarks';
import { BASE, H, LANDS, landInks, ORB, ROAD, ROAD_PATH, seeded, SKY, skylinesFor, STONE_AT, todayShare, W, WALKER_AT, type Tree } from './land';
import { mixOk, shade } from './oklch';

/** Tonight's moon and sky events, for the night scene. */
export interface MoonSky {
  /** 0 new, 0.5 full. */
  phase: number;
  full: boolean;
  /** A meteor shower at its peak tonight. */
  shower: boolean;
}

/**
 * Walk's scene in layered dusk (look pass, board four, "Walk, in layered dusk" and "The road through the day"):
 * the sky and its light for the hour (tinted by the theme), three flat layers of the region's land receding in
 * lightening bands, the landmark ahead standing between them, the lit road, the milestone and the walker.
 *
 * Motion is cheap: the far and middle layers drift a few units back and forth, clouds and mist cross slowly, the
 * road's light breathes, stars twinkle and the walker walks. All of it is transform or opacity on a handful of
 * groups (walk.css, `.ls-…`).
 *
 * `view`: "full" is the 360 × 230 frame of the Walk tab; "band" is the lower half, for Today's short banner.
 */
export function Layered({
  region,
  part,
  todayKm = 0,
  landmark,
  landmarkScale = 1,
  festive,
  moon,
  stone = false,
  view = 'full',
  label,
}: {
  region: RegionId;
  part: PartOfDay;
  todayKm?: number;
  landmark?: Landmark;
  landmarkScale?: number;
  festive?: Festive;
  moon?: MoonSky;
  /** Draw the plain milestone (pages that place the lettered one over the scene leave this off). */
  stone?: boolean;
  view?: 'full' | 'band';
  label?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const sky = festiveSky(festive, SKY[part]);
  const [far, mid, near] = landInks(region, part);
  const land = LANDS[region];
  const night = part === 'night';
  const low = part === 'dawn' || part === 'dusk';
  const road = ROAD[part];
  const lines = useMemo(() => skylinesFor(region, REGIONS.indexOf(region) + 1), [region]);
  const stars = useMemo(() => {
    const rnd = seeded(11);
    return Array.from({ length: 30 }, () => [rnd() * W, 8 + rnd() * 110, 0.6 + rnd() * 0.9] as const);
  }, []);
  const band = view === 'band';
  // In the short banner the sun and moon come down into view.
  const orb = { ...ORB[part], ...(band ? { y: Math.max(ORB[part].y, 152), r: Math.min(ORB[part].r, 18) } : {}) };
  const rim = mixOk(sky[2], '#ffffff', 0.25);
  const lmInk = mixOk(far, mid, 0.55);
  const lmS = 0.7 * landmarkScale;
  const share = todayShare(todayKm);
  // By night the walker is drawn in cream, so it never sinks into the dark land (legible at 30% brightness).
  const walkerInk = night ? '#f3efe4' : '#0e0a1c';
  const treeInk = shade(mid, -0.06);
  const nearTree = shade(near, -0.05);
  const vb = band ? `0 112 ${W} ${H - 112}` : `0 0 ${W} ${H}`;

  return (
    <svg className={`ls ls-${part} ls-${region}`} viewBox={vb} preserveAspectRatio="xMidYMax slice" role="img" aria-label={label ?? `The road through ${land.name} at ${part}`}>
      <defs>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset=".62" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[2]} />
        </linearGradient>
        <radialGradient id={`${uid}g`}>
          <stop offset="0" stopColor={orb.ink} stopOpacity={night ? 0.35 : 0.6} />
          <stop offset="1" stopColor={orb.ink} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}w`}>
          <stop offset="0" stopColor={road} stopOpacity=".55" />
          <stop offset="1" stopColor={road} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The sky and its light. */}
      <rect width={W} height={H} fill={`url(#${uid}s)`} />
      {night && (
        <g className="ls-stars">
          {stars.map(([x, y, r], i) => (
            <circle key={i} className={i % 4 === 0 ? 'ls-tw' : undefined} style={i % 4 === 0 ? { animationDelay: `${-i * 0.37}s` } : undefined} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r} fill="#ffe9a8" opacity={0.55 + (i % 3) * 0.15} />
          ))}
        </g>
      )}
      <circle className="ls-glow" cx={orb.x} cy={orb.y} r={orb.r * 3.2} fill={`url(#${uid}g)`} />
      {night && moon ? <Moon x={orb.x} y={orb.y} r={orb.r} phase={moon.phase} full={moon.full} shade={mixOk(sky[0], sky[1], 0.4)} /> : <circle cx={orb.x} cy={orb.y} r={orb.r} fill={orb.ink} />}
      {night && moon?.shower && (
        <g stroke="#f6eed9" strokeWidth="1.2" strokeLinecap="round">
          {[[70, 32], [180, 24], [250, 50]].map(([x, y], i) => (
            <line key={i} className="ls-meteor" x1={x} y1={y} x2={x - 26} y2={y + 14} style={{ animationDelay: `${i * 2.3}s` }} />
          ))}
        </g>
      )}
      {!night && (
        <g className="ls-clouds" fill={mixOk(sky[1], '#ffffff', 0.45)} opacity={part === 'day' ? 0.55 : 0.35}>
          <path d="M40 62 h86 a8 8 0 0 0 -8 -8 h-22 a12 12 0 0 0 -22 -4 a9 9 0 0 0 -14 4 h-12 a8 8 0 0 0 -8 8 Z" />
          <path d="M176 90 h64 a6 6 0 0 0 -6 -6 h-14 a10 10 0 0 0 -18 -3 h-20 a6 6 0 0 0 -6 9 Z" />
        </g>
      )}
      {!night && !band && (
        <g className="ls-birds" fill="none" stroke={mixOk(sky[0], '#000000', 0.2)} strokeWidth="1.4" strokeLinecap="round">
          <path d="M120 40 q4 -4 8 0 q4 -4 8 0" />
          <path d="M142 50 q3 -3 6 0 q3 -3 6 0" />
        </g>
      )}
      {festive && (
        <g transform={`scale(${W / 390})`}>
          <FestiveDecor f={festive} W={390} />
        </g>
      )}

      {/* The far land, and the landmark ahead standing in front of it. */}
      <g className="ls-far">
        <path d={lines[0].d} fill={land.layers[0][0] === 'sea' ? mixOk(far, sky[2], 0.2) : far} />
        {land.layers[0][0] === 'sea' && <path className="ls-glints" d="M40 150 h40 M120 154 h70 M230 150 h56 M300 156 h30" stroke={rim} strokeWidth="1.6" strokeLinecap="round" opacity=".6" />}
        {land.extras.includes('sail') && <path d="M96 146 l12 -22 v22 Z M92 146 h20 l-3 4 h-14 Z" fill={shade(far, -0.18)} />}
        {lines[0].snow && <path d={lines[0].snow} fill="#f4f7fc" opacity={night ? 0.55 : 0.92} />}
        {lines[0].rims && <path d={lines[0].rims} fill="none" stroke={rim} strokeWidth="1.6" strokeLinecap="round" opacity={low ? 0.6 : night ? 0.15 : 0.35} />}
        {land.extras.includes('strata') && <path d={`M-24 ${BASE[0] + 4} H384 M-24 ${BASE[0] + 10} H384`} stroke={shade(far, -0.07)} strokeWidth="2" opacity=".7" />}
        {landmark && (
          <g className="ls-landmark" transform={`translate(${(272 - 60 * lmS).toFixed(1)} ${BASE[1] + 2}) scale(${lmS.toFixed(2)})`}>
            {landmark.paths.map((d, i) => <path key={i} d={d} fill={lmInk} fillRule="evenodd" />)}
            {landmark.accents?.map((d, i) => <path key={`a${i}`} d={d} fill={rim} opacity={0.7} />)}
            {(night || part === 'dusk') && landmark.lights?.map((d, i) => <path key={`l${i}`} d={d} fill="#f2c46d" />)}
          </g>
        )}
      </g>
      {land.extras.includes('mist') && <rect className="ls-mist" x="-40" y={BASE[1] - 24} width="440" height="16" rx="8" fill={mixOk(sky[2], '#ffffff', 0.3)} opacity={night ? 0.12 : 0.3} />}

      {/* The middle land, with what grows on it. */}
      <g className="ls-mid">
        <path d={lines[1].d} fill={mid} />
        {lines[1].rims && <path d={lines[1].rims} fill="none" stroke={rim} strokeWidth="1.4" strokeLinecap="round" opacity={low ? 0.5 : night ? 0.12 : 0.3} />}
        {land.extras.includes('fields') && <path d="M-24 182 H384 M-24 188 H384" stroke={mixOk(mid, '#f2d45c', night ? 0.25 : 0.6)} strokeWidth="2.4" opacity=".75" />}
        {land.extras.includes('terraces') && <path d="M-24 178 H160 M40 184 H384 M-24 190 H260" stroke={mixOk(mid, sky[2], 0.55)} strokeWidth="1.6" opacity=".8" />}
        <g fill={treeInk}>
          {land.tree !== 'none' && [28, 102, 146, 296, 330].map((x, i) => (
            <g key={x} className={`ls-tree ${land.tree}`} transform={`translate(${x} ${(lines[1].at(x) + 1).toFixed(1)}) scale(${[0.55, 0.42, 0.36, 0.5, 0.6][i]})`}>
              <TreeShape kind={land.tree} />
            </g>
          ))}
        </g>
      </g>

      {/* The near land, the lit road, the milestone and the walker. */}
      <path d={lines[2].d} fill={near} />
      <g fill={nearTree}>
        {land.tree !== 'none' && [[14, 1], [318, 0.9], [350, 1.1]].map(([x, s]) => (
          <g key={x} transform={`translate(${x} ${(lines[2].at(x) + 4).toFixed(1)}) scale(${s})`}>
            <TreeShape kind={land.tree} />
          </g>
        ))}
      </g>
      <circle className="ls-light" cx={WALKER_AT[0]} cy={WALKER_AT[1] - 8} r="30" fill={`url(#${uid}w)`} />
      <path className="ls-roadglow" d={ROAD_PATH} stroke={road} strokeWidth="13" fill="none" strokeLinecap="round" opacity=".22" />
      <path className="ls-road" d={ROAD_PATH} stroke={road} strokeWidth="5.5" fill="none" strokeLinecap="round" />
      {share > 0 && <path className="ls-today" d={ROAD_PATH} pathLength={100} strokeDasharray={`${(share * 100).toFixed(1)} 200`} strokeDashoffset={`${(-(1 - share) * 100).toFixed(1)}`} stroke="#fffbea" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".85" />}
      {stone && (
        <g className="ls-stone" transform={`translate(${STONE_AT[0] - 13} ${STONE_AT[1] - 32})`}>
          <rect width="26" height="32" rx="9" fill="#f3efe4" />
          <path d="M0 9a9 9 0 0 1 9 -9h8a9 9 0 0 1 9 9v3H0Z" fill="#f2c46d" />
        </g>
      )}
      <Walker x={WALKER_AT[0]} y={WALKER_AT[1]} ink={walkerInk} halo={night ? '#05060f' : mixOk(sky[2], '#ffffff', 0.4)} />
    </svg>
  );
}

/** The walker: a stick figure, head, body, swinging arms and legs (board four), walking on the spot. */
function Walker({ x, y, ink, halo }: { x: number; y: number; ink: string; halo: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="-10" rx="10" ry="16" fill={halo} opacity=".28" />
      <g className="ls-walker" stroke={ink} strokeWidth="2.8" strokeLinecap="round" fill="none">
        <circle cx="0" cy="-19" r="4.2" fill={ink} stroke="none" />
        <path d="M0 -14 V-4" />
        <path className="ls-arm a" d="M0 -12 l-4 6" />
        <path className="ls-arm b" d="M0 -12 l4 6" />
        <path className="ls-leg a" d="M0 -4 l-3.4 8" />
        <path className="ls-leg b" d="M0 -4 l3.4 8" />
      </g>
    </g>
  );
}

/** The moon at its phase: the lit disc with the shadow slid across it; a full moon is larger and wears a halo. */
function Moon({ x, y, r: r0, phase, full, shade: dark }: { x: number; y: number; r: number; phase: number; full: boolean; shade: string }) {
  const r = full ? r0 * 1.3 : r0;
  const lit = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const dx = 2 * r * lit * (phase < 0.5 ? -1 : 1);
  const clip = `ls-moon-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <g>
      {full && <circle cx={x} cy={y} r={r * 2.4} fill="#f3ecdc" opacity="0.14" />}
      <defs>
        <clipPath id={clip}>
          <circle cx={x} cy={y} r={r} />
        </clipPath>
      </defs>
      <circle cx={x} cy={y} r={r} fill="#f3ecdc" />
      {!full && <circle cx={x + dx} cy={y} r={r} fill={dark} opacity="0.94" clipPath={`url(#${clip})`} />}
    </g>
  );
}

/** One tree, flat, standing on (0, 0), about 30 units tall at scale 1. */
function TreeShape({ kind }: { kind: Tree }) {
  if (kind === 'acacia')
    return (
      <>
        <path d="M-1.4 0 L-0.7 -16 L0.7 -16 L1.4 0 Z" />
        <ellipse cx="0" cy="-20" rx="15" ry="4.6" />
        <ellipse cx="-7" cy="-22.5" rx="8" ry="3.4" />
        <ellipse cx="7" cy="-23" rx="8.5" ry="3.6" />
      </>
    );
  if (kind === 'palm')
    return (
      <>
        <path d="M-1.2 0 Q1.2 -14 3.6 -28 L5.2 -28 Q3 -14 1.2 0 Z" />
        <path d="M4.4 -28 Q-7 -31 -15 -24 Q-6 -28 4.4 -26 Z M4.4 -28 Q14 -33 21 -24 Q12 -28 4.4 -26 Z M4.4 -28 Q-2 -37 -10 -37 Q-1 -34 4.4 -27 Z M4.4 -28 Q11 -38 18 -36 Q9 -34 4.4 -27 Z" />
      </>
    );
  if (kind === 'conifer') return <path d="M-1 0 V-5 H1 V0 Z M0 -34 L-5.6 -23 H-3 L-8.6 -14 H-4.6 L-11 -5 H11 L4.6 -14 H8.6 L3 -23 H5.6 Z" />;
  if (kind === 'round')
    return (
      <>
        <path d="M-1.2 0 V-10 H1.2 V0 Z" />
        <circle cx="0" cy="-16" r="8" />
      </>
    );
  return (
    <>
      <path d="M-1.6 0 L-0.9 -11 L0.9 -11 L1.6 0 Z" />
      <circle cx="0" cy="-18" r="9.5" />
      <circle cx="-8" cy="-13" r="6.5" />
      <circle cx="8" cy="-13.5" r="7" />
    </>
  );
}
