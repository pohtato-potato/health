import { useMemo } from 'react';
import type { PartOfDay } from '../../domain/dates';
import { lightFor, mix, REGIONS, type RegionId } from '../../ui/light';
import { FestiveDecor, festiveSky, type Festive } from './festive';
import type { Landmark } from './landmarks';
import { auroraFor } from '../page';

/**
 * The Walk tab's scene, as the approved board painted it (mockup round 4): the sky and its glow, a far skyline and
 * a mid one catching the light, the near ground with its trees, the road running away over a crest with today's
 * piece in sage, grass at the edges and the walker on the road. The land takes its shape and trees from the region
 * and its colours from the hour. Drawn in the board's own frame, 360 wide from y = 34 to 250.
 */

const W = 360;
const BOTTOM = 250;
/** Where the road meets the sky. */
const CREST = 177;
/** Today's walked road, as a share of the 40 km the road in view stands for. */
const ROAD_KM = 40;

type Profile = 'mesa' | 'dune' | 'hill' | 'peak' | 'snow' | 'sea';
type Tree = 'acacia' | 'palm' | 'conifer' | 'broadleaf';

const LAND: Record<RegionId, { far: Profile; mid: Profile; amp: [number, number]; tree: Tree }> = {
  plains: { far: 'hill', mid: 'hill', amp: [5, 3], tree: 'acacia' },
  desert: { far: 'dune', mid: 'dune', amp: [9, 6], tree: 'acacia' },
  ravines: { far: 'mesa', mid: 'mesa', amp: [8, 10], tree: 'acacia' },
  deccan: { far: 'mesa', mid: 'hill', amp: [12, 6], tree: 'acacia' },
  ghats: { far: 'hill', mid: 'hill', amp: [28, 12], tree: 'palm' },
  coast: { far: 'sea', mid: 'dune', amp: [0, 4], tree: 'palm' },
  east: { far: 'hill', mid: 'hill', amp: [10, 6], tree: 'broadleaf' },
  northeast: { far: 'hill', mid: 'hill', amp: [30, 14], tree: 'conifer' },
  himalaya: { far: 'snow', mid: 'peak', amp: [62, 26], tree: 'conifer' },
};

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const f1 = (n: number) => Math.round(n * 10) / 10;
const close = (d: string) => `${d} V${BOTTOM} H0 Z`;

/** A skyline from x = 0 to 360 around height y, and the tops that catch the light (mesas only). */
function skyline(kind: Profile, y: number, amp: number, rnd: () => number): { d: string; rims: string[]; snow?: string } {
  if (kind === 'mesa') {
    // Flat tops at a few heights, cut by small V-shaped gullies, as the board drew the ravines.
    let d = `M0 ${f1(y)}`;
    const rims: string[] = [];
    let x = 0;
    let h = y;
    while (x < W) {
      const top = Math.min(W, x + 34 + rnd() * 52);
      d += ` H${f1(top)}`;
      rims.push(`M${f1(x)} ${f1(h)} H${f1(top)}`);
      if (top >= W) break;
      const next = y - amp * 0.5 + rnd() * amp;
      const gully = 5 + rnd() * 6;
      d += ` L${f1(top + gully / 2)} ${f1(Math.max(h, next) + 6 + rnd() * 5)} L${f1(top + gully)} ${f1(next)}`;
      x = top + gully;
      h = next;
    }
    return { d: close(d), rims };
  }
  if (kind === 'sea') return { d: close(`M0 ${f1(y)} H${W}`), rims: [] };
  const n = kind === 'dune' ? 3 : kind === 'hill' ? (amp > 20 ? 5 : 4) : kind === 'snow' ? 4 : 5;
  // Uneven spacing and heights, so no two bumps or peaks repeat.
  const step = W / (n * 2);
  const pts = Array.from({ length: n * 2 + 1 }, (_, i) => {
    const x = i === 0 || i === n * 2 ? i * step : i * step + (rnd() - 0.5) * step * 0.7;
    const up = i % 2 === 1;
    return [x, up ? y - amp * (0.45 + rnd() * 0.55) : y - amp * rnd() * 0.3] as const;
  });
  let d = `M0 ${f1(pts[0][1])}`;
  let snow = '';
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, yy] = pts[i];
    if (kind === 'peak' || kind === 'snow') {
      // Sharp tops, slightly bowed flanks.
      d += ` Q${f1((px + x) / 2)} ${f1(Math.max(py, yy) - (yy < py ? 0 : 2))} ${f1(x)} ${f1(yy)}`;
      if (kind === 'snow' && i % 2 === 1) {
        const cap = amp * 0.28;
        snow += `M${f1(x - cap * 0.9)} ${f1(yy + cap)} L${f1(x)} ${f1(yy)} L${f1(x + cap * 0.9)} ${f1(yy + cap)} L${f1(x + cap * 0.3)} ${f1(yy + cap * 0.7)} L${f1(x - cap * 0.2)} ${f1(yy + cap * 1.05)} Z `;
      }
    } else {
      const mx = (px + x) / 2;
      d += ` C${f1(mx)} ${f1(py)} ${f1(mx)} ${f1(yy)} ${f1(x)} ${f1(yy)}`;
    }
  }
  return { d: close(d), rims: [], ...(snow ? { snow } : {}) };
}

/** One tree, standing on (0, 0), about 22 units tall. */
function TreeShape({ kind }: { kind: Tree }) {
  if (kind === 'acacia')
    return (
      <>
        <path d="M-1.2 0 L-0.6 -14 L0.6 -14 L1.2 0 Z" />
        <path d="M-0.5 -12 L-6 -17 M0.5 -12 L6 -18" strokeWidth="1" fill="none" stroke="currentColor" />
        <ellipse cx="0" cy="-19" rx="13" ry="4.2" />
        <ellipse cx="-6" cy="-21" rx="7" ry="3" />
        <ellipse cx="6" cy="-21.5" rx="7.5" ry="3.2" />
      </>
    );
  if (kind === 'palm')
    return (
      <>
        <path d="M-1 0 Q1 -12 3 -24 L4.4 -24 Q2.6 -12 1 0 Z" />
        <path d="M3.6 -24 Q-6 -27 -13 -21 Q-5 -24 3.6 -22.4 Z M3.6 -24 Q12 -28 18 -21 Q10 -24 3.6 -22.4 Z M3.6 -24 Q-2 -32 -9 -32 Q-1 -29 3.6 -23 Z M3.6 -24 Q9 -33 15 -31 Q8 -29 3.6 -23 Z" />
      </>
    );
  if (kind === 'conifer')
    return (
      <>
        <path d="M-0.9 0 V-5 H0.9 V0 Z" />
        <path d="M0 -30 L-5 -20 H-2.6 L-7.6 -12 H-4 L-9.6 -4.5 H9.6 L4 -12 H7.6 L2.6 -20 H5 Z" />
      </>
    );
  return (
    <>
      <path d="M-1.4 0 L-0.8 -10 L0.8 -10 L1.4 0 Z" />
      <circle cx="0" cy="-16" r="8.5" />
      <circle cx="-7" cy="-12" r="6" />
      <circle cx="7" cy="-12.5" r="6.5" />
    </>
  );
}

/** Where the trees stand, from the board: two on the left, two on the right, one far off by the road. */
const TREES: [number, number, number][] = [
  [34, 186, 0.9],
  [64, 182, 0.7],
  [128, 180, 0.55],
  [318, 186, 1],
  [342, 190, 0.75],
];

/** The top of today's sage piece of road: further up the road the more you walked, never past the crest. */
export function todayBandTop(todayKm: number): number {
  const share = Math.min(1, Math.max(0, todayKm) / ROAD_KM);
  return Math.max(CREST + 3, Math.min(BOTTOM - 10, BOTTOM - (BOTTOM - CREST) * Math.min(0.96, Math.sqrt(share) * 1.15)));
}

/** The road's centre and half-width at a height, in perspective. */
const roadAt = (y: number) => {
  const t = (y - CREST) / (BOTTOM - CREST);
  return { cx: 200 - 9 * t, hw: 5 + 90 * Math.pow(t, 1.25) };
};

export function Vista({ region, part, todayKm, landmark, landmarkScale = 1, festive }: { region: RegionId; part: PartOfDay; todayKm: number; landmark?: Landmark; landmarkScale?: number; festive?: Festive }) {
  const base = lightFor(part, region);
  const sky = festive ? festiveSky(festive, base.sky) : base.sky;
  // The land leans toward the region's aurora, as the board painted it: mauve far off, plum close to, strongest
  // in the low light of dawn and dusk.
  const tint = auroraFor(region)['--lv-a'];
  const k = { dawn: 1, dusk: 1, day: 0.55, night: 0.8 }[part];
  const [far, mid, near, fore] = [
    mix(base.layers[0], mix(tint, '#ffffff', 0.35), 0.5 * k),
    mix(base.layers[1], mix(tint, '#ffffff', 0.15), 0.45 * k),
    mix(base.layers[2], tint, 0.45 * k),
    mix(base.layers[3], tint, 0.45 * k),
  ];
  const land = LAND[region];
  const shapes = useMemo(() => {
    const rnd = seeded(REGIONS.indexOf(region) * 977 + 31);
    return { far: skyline(land.far, 152, land.amp[0], rnd), mid: skyline(land.mid, 166, land.amp[1], rnd) };
  }, [region]);
  const stars = useMemo(() => {
    const rnd = seeded(11);
    return Array.from({ length: 34 }, () => [rnd() * W, 38 + rnd() * 96, 0.4 + rnd() * 0.8] as const);
  }, []);
  const night = part === 'night';
  const low = part === 'dawn' || part === 'dusk';
  const sun = { dawn: [64, 148, 14], day: [292, 74, 12], dusk: [300, 146, 14], night: [286, 72, 9] }[part];
  const id = `vista-${region}-${part}`;
  const treeInk = mix(fore, '#05030a', 0.25);
  const grass = mix(fore, '#05030a', 0.45);
  const walkerInk = mix(fore, '#05030a', 0.6);
  const rimInk = mix(base.glow, '#ffffff', 0.15);
  const top = todayBandTop(todayKm);
  const band = (() => {
    if (todayKm <= 0) return undefined;
    const ys = [BOTTOM, (BOTTOM + top) / 2, top];
    const left = ys.map((y) => `${f1(roadAt(y).cx - roadAt(y).hw * 0.46)} ${f1(y)}`);
    const right = [...ys].reverse().map((y) => `${f1(roadAt(y).cx + roadAt(y).hw * 0.46)} ${f1(y)}`);
    return `M${left.join(' L')} L${right.join(' L')} Z`;
  })();
  const lmInk = mix(mid, '#05061a', night ? 0.5 : 0.3);
  const lmS = 0.62 * landmarkScale;

  return (
    <svg className="vista" viewBox="0 34 360 216" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.5" stopColor={mix(sky[1], sky[0], 0.35)} />
          <stop offset="0.8" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[2]} />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx={sun[0]} cy={sun[1]} r="140" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={base.glow} stopOpacity={night ? 0.3 : 0.7} />
          <stop offset="1" stopColor={base.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-road`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={mix(fore, '#05030a', 0.3)} />
          <stop offset="0.7" stopColor={mix(near, fore, 0.4)} />
          <stop offset="1" stopColor={mix(mid, sky[2], 0.35)} />
        </linearGradient>
        <linearGradient id={`${id}-today`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#8fc9b0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#8fc9b0" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect className="vista-sky" y="0" width={W} height={BOTTOM} fill={`url(#${id}-sky)`} opacity="0.8" />
      <rect width={W} height={BOTTOM} fill={`url(#${id}-sun)`} />
      {night && stars.map(([x, y, r], i) => <circle key={i} className="vista-star" cx={f1(x)} cy={f1(y)} r={r} fill="#f6eed9" opacity={0.35 + (i % 3) * 0.2} />)}
      {!night && (
        <g fill={mix(base.glow, sky[1], 0.4)} opacity="0.25">
          <ellipse cx="110" cy="64" rx="74" ry="2.6" />
          <ellipse cx="200" cy="52" rx="50" ry="2" />
        </g>
      )}
      <circle className="vista-sun" cx={sun[0]} cy={sun[1]} r={sun[2]} fill={night ? '#f3ecdc' : mix(base.glow, '#ffffff', 0.3)} />
      {!night && (
        <g fill="none" stroke={mix(fore, sky[0], 0.3)} strokeWidth="1.2" strokeLinecap="round">
          <path d="M86 40 q4 -4 8 0 q4 -4 8 0" />
          <path d="M108 52 q3 -3 6 0 q3 -3 6 0" />
        </g>
      )}
      {festive && (
        <g transform={`scale(${W / 390})`}>
          <FestiveDecor f={festive} W={390} />
        </g>
      )}
      <path className="vista-far" d={shapes.far.d} fill={land.far === 'sea' ? mix(sky[2], far, 0.35) : far} opacity={land.far === 'sea' ? 1 : 0.9} />
      {land.far === 'sea' && <path d="M150 158 H300" stroke={rimInk} strokeWidth="1.4" opacity="0.45" />}
      {shapes.far.rims.length > 0 && <path d={shapes.far.rims.join(' ')} fill="none" stroke={rimInk} strokeWidth="1.6" opacity={low ? 0.55 : night ? 0.1 : 0.2} />}
      {shapes.far.snow && <path d={shapes.far.snow} fill="#eef1f6" opacity={night ? 0.5 : 0.85} />}
      {landmark && (
        <g className="vista-landmark" transform={`translate(${f1(262 - 60 * lmS)} ${f1(168)}) scale(${f1(lmS * 100) / 100})`}>
          {landmark.paths.map((d, i) => (
            <path key={i} d={d} fill={lmInk} fillRule="evenodd" />
          ))}
          {landmark.accents?.map((d, i) => <path key={`a${i}`} d={d} fill={mix(sky[2], '#ffffff', 0.4)} opacity={0.7} />)}
          {(night || part === 'dusk') && landmark.lights?.map((d, i) => <path key={`l${i}`} d={d} fill="#f2c46d" opacity={0.9} />)}
        </g>
      )}
      <path className="vista-mid" d={shapes.mid.d} fill={mid} />
      {shapes.mid.rims.length > 0 && <path d={shapes.mid.rims.join(' ')} fill="none" stroke={rimInk} strokeWidth="1.4" opacity={low ? 0.6 : night ? 0.12 : 0.25} />}
      {land.mid === 'mesa' && (
        <g fill={mix(mid, near, 0.6)} opacity="0.75">
          <path d="M90 166 L86 182 L96 182 Z" />
          <path d="M118 166 L112 186 L122 186 Z" />
          <path d="M262 164 L256 184 L268 184 Z" />
          <path d="M284 164 L280 178 L290 178 Z" />
        </g>
      )}
      <path className="vista-near" d="M0 182 C60 176 120 180 170 177 C190 176 210 176 230 178 C280 182 320 178 360 182 V250 H0Z" fill={near} />
      <g fill={treeInk} color={treeInk}>
        {TREES.map(([x, y, s]) => (
          <g key={x} className={`vista-tree ${land.tree}`} transform={`translate(${x} ${y}) scale(${s})`}>
            <TreeShape kind={land.tree} />
          </g>
        ))}
      </g>
      <path className="vista-road" d="M96 250 C140 222 182 196 195 177 L205 177 C214 196 236 222 286 250 Z" fill={`url(#${id}-road)`} />
      <path d="M96 250 C140 222 182 196 195 177 M286 250 C236 222 214 196 205 177" fill="none" stroke={rimInk} strokeWidth="1.4" opacity="0.45" />
      {band && <path className="vista-today" d={band} fill={`url(#${id}-today)`} />}
      <g fill="#efe1c6" opacity="0.75">
        <rect x="191" y="246" width="4" height="9" />
        <rect x="192" y="228" width="3.4" height="7.4" />
        <rect x="194" y="212" width="2.8" height="6" />
        <rect x="195.5" y="200" width="2.2" height="4.6" />
        <rect x="197" y="190" width="1.7" height="3.4" />
        <rect x="198.4" y="182" width="1.2" height="2.4" />
      </g>
      <path d="M0 250 C10 244 24 242 40 246 C50 248 60 250 70 250 Z M290 250 C306 244 330 240 360 242 V250 Z" fill={grass} />
      <g stroke={grass} strokeWidth="1.6" strokeLinecap="round">
        {[6, 12, 18, 26, 34, 298, 306, 316, 326, 336, 346, 354].map((x, i) => (
          <line key={x} x1={x} y1="250" x2={x + (i % 2 ? 2 : -2)} y2={232 + (i % 4) * 2} />
        ))}
      </g>
      <g className="vista-walker" transform="translate(200 214) scale(1.15)">
        <path d="M0 0 L-17 7 L-15 9 L1 1.5 Z" fill={walkerInk} opacity="0.4" />
        <g stroke={walkerInk} strokeLinecap="round" fill="none">
          <path d="M-1 -10 L-2.2 -5 L-3 0" strokeWidth="2" />
          <path d="M1 -10 L1.6 -5 L2.6 -0.4" strokeWidth="2" />
          <path d="M-2.4 -18 L-3.6 -13.5 L-3.2 -10" strokeWidth="1.5" />
          <path d="M2.4 -18 L3.4 -13.5 L3.6 -11" strokeWidth="1.5" />
        </g>
        <path d="M-2.6 -19 Q0 -20.4 2.6 -19 L2 -10 L-2 -10 Z" fill={walkerInk} />
        <rect x="-2.3" y="-19" width="4.6" height="6.4" rx="1.4" fill={mix(walkerInk, near, 0.3)} />
        <circle cx="0" cy="-22.6" r="2.5" fill={walkerInk} />
      </g>
    </svg>
  );
}
