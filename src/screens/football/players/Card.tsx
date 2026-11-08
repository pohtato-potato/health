// A player card (round 8, bare): the drawing of the habit in its tier's glass frame. No text on the face; the
// overall, name and step sit beside it. Chevrons mark the step inside a tier. Prism, Icon and Legend tilt.
import { useMemo, useRef, type PointerEvent } from 'react';
import { rarityClass, stepName } from '../../../football/players/cards';
import { artSvg } from '../../../football/players/art';
import { hashSeed, rng } from '../../../football/rng';
import type { CardStep, CardTier } from '../../../football/players/types';

const PAL: Record<CardTier, string[]> = {
  bronze: ['#7a3d12', '#a85a24', '#c97a3a', '#e0955a', '#f2c08a'],
  silver: ['#2b4a66', '#4f7aa0', '#8fb6d6', '#cfe3f2', '#eef6fc'],
  gold: ['#8a5a00', '#c98a00', '#e8b23a', '#ffd56a', '#ffe58a', '#fff1c2'],
  prism: ['#ff5ad8', '#3fe0ff', '#ffd56a', '#7dff9a', '#9b6bff', '#ff8f5a'],
  icon: ['#1a0f3a', '#3a1f7a', '#6c3fc4', '#1a8f6a', '#ff7a1a', '#ffb27a'],
  legend: ['#1a0f3a', '#3a1f7a', '#6c3fc4', '#1a8f6a', '#ff7a1a', '#ffb27a'],
};
const glassCache = new Map<string, string>();
/** The glass mosaic, one light pane per piece (round 6): each lights when the sweep passes behind it. */
function glass(tier: CardTier, seed: string): string {
  const key = `${tier}:${seed}`;
  const hit = glassCache.get(key);
  if (hit) return hit;
  const r = rng(hashSeed('glass', key));
  const W = 200, H = 280, nx = 6, ny = 8;
  const jit = (edge: boolean) => (edge ? 0 : (r() - 0.5) * 20);
  const pts = Array.from({ length: ny + 1 }, (_, y) => Array.from({ length: nx + 1 }, (_, x) => [x * (W / nx) + jit(x === 0 || x === nx), y * (H / ny) + jit(y === 0 || y === ny)]));
  let gl = '', lt = '';
  const pal = PAL[tier];
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const a = pts[y][x], b = pts[y][x + 1], c = pts[y + 1][x + 1], d = pts[y + 1][x];
    for (const t of [[a, b, c], [a, c, d]]) {
      const dd = `M${t[0][0].toFixed(0)} ${t[0][1].toFixed(0)} L${t[1][0].toFixed(0)} ${t[1][1].toFixed(0)} L${t[2][0].toFixed(0)} ${t[2][1].toFixed(0)} Z`;
      gl += `<path style="fill:${pal[Math.floor(r() * pal.length)]}" d="${dd}"/>`;
      lt += `<path style="--a:${Math.floor(r() * 360)}deg" d="${dd}"/>`;
    }
  }
  const out = `<svg class="gl6" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><g class="pane">${gl}</g><g class="lt">${lt}</g></svg>`;
  glassCache.set(key, out);
  return out;
}
const SHARDS: [number, number, number][] = [[4, 8, 20], [80, 16, -30], [8, 52, 50], [76, 46, 10]];

export const TILTS = new Set<CardTier>(['prism', 'icon', 'legend']);

/** The card itself. `label` is what a screen reader hears (the face has no text). */
export function PlayerCard({ card, art, seed, label, className = '' }: { card: CardStep; art: string; seed: string; label?: string; className?: string }) {
  const svg = useMemo(() => glass(card.tier, seed), [card.tier, seed]);
  const r = card.tier === 'icon' || card.tier === 'legend';
  const steps = card.tier === 'legend' ? 0 : card.step;
  return (
    <div className={`k6 ${rarityClass(card.tier)} bare8${steps ? ` s${steps}` : ''} ${className}`.trim()} role="img" aria-label={label ?? `${stepName(card)} card`} style={{ ['--d0' as string]: `${-(hashSeed(seed) % 90) / 10}s` }}>
      {(card.tier === 'gold' || card.tier === 'prism' || r) && <span className="ray6" />}
      {card.tier === 'prism' && SHARDS.map(([x, y, a]) => <span key={`${x}${y}`} className="sh6" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${a}deg)` }} />)}
      {steps > 0 && <span className="sub8" aria-hidden="true">{Array.from({ length: steps }, (_, i) => <i key={i} />)}</span>}
      <div className="k6in">
        <span dangerouslySetInnerHTML={{ __html: svg }} style={{ display: 'contents' }} />
        {!r && <span className="win6" />}
        <div className="k6art" dangerouslySetInnerHTML={{ __html: artSvg(art) }} />
      </div>
      <span className="gla8" />
    </div>
  );
}

/** Prism, Icon and Legend lean toward a finger (round 8): the glare follows it and the figure sits nearer than the glass. */
export function TiltCard(props: Parameters<typeof PlayerCard>[0]) {
  const ref = useRef<HTMLDivElement>(null);
  const on = TILTS.has(props.card.tier);
  const card = () => ref.current?.querySelector<HTMLElement>('.k6') ?? null;
  const move = (e: PointerEvent) => {
    const k = card();
    if (!k || !on) return;
    const b = k.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height) * 2 - 1));
    k.classList.add('held');
    k.style.transform = `rotateY(${x * 26}deg) rotateX(${-y * 26}deg)`;
    k.style.setProperty('--px', String(x)); k.style.setProperty('--py', String(y));
    k.style.setProperty('--mx', `${(x + 1) * 50}%`); k.style.setProperty('--my', `${(y + 1) * 50}%`);
  };
  const rest = () => {
    const k = card();
    if (!k) return;
    k.classList.remove('held');
    k.style.transform = '';
    k.style.setProperty('--px', '0'); k.style.setProperty('--py', '0');
  };
  return (
    <div ref={ref} className="tilt8" onPointerMove={move} onPointerLeave={rest} onPointerUp={rest} onPointerCancel={rest}>
      <PlayerCard {...props} />
    </div>
  );
}
