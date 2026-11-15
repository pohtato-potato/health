import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { RADII, ThemedRings } from '../../ui/rings/ThemedRings';
import { GlowRings } from '../../ui/rings/GlowRings';
import type { RingStyle } from '../../ui/rings/styles';
import type { RingDesign } from '../../domain/themes';
const STAR_POINTS = Array.from({ length: 12 }, (_, k) => {
  const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
  const r = k % 2 ? 94 : 99;
  return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r] as const;
});

/** The ring of Warli stars around a perfect day: a chain that draws itself, each joint lighting as a star. */
function StarChain({ draw }: { draw: boolean }) {
  return (
    <g className={`lr-chain${draw ? ' draw' : ''}`}>
      <path pathLength={1} d={`M${STAR_POINTS.map((p) => p.join(' ')).join(' L')} Z`} fill="none" stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round" />
      {STAR_POINTS.map(([x, y], k) => (
        <circle key={k} className="lr-star" cx={x} cy={y} r={k % 3 ? 2 : 3.2} fill="#fff1c8" style={{ animationDelay: `${0.8 + k * 0.08}s` }} />
      ))}
    </g>
  );
}

/**
 * The rings, alive: they draw in from empty when the page opens, one after another, and again on a tap, after one
 * spin together. How full they are always tells the truth once they settle; a theme only changes how they're drawn.
 * They glow (look pass, rule 9): a closed ring burns with a bright edge, all four closed turn gold, and the count
 * lives in the heading above, so the middle stays clear.
 */
export function LiveRings({ progress, label, style, design, inks, goldClosed, goldCount, chain, spin, play, onTap }: {
  /** Calories, protein, steps and sleep, outer to inner. */
  progress: number[];
  label: string;
  /** A calendar theme day's own ring style (stars, candles…); it wins over the worn theme's design. */
  style?: RingStyle;
  /** The worn theme's ring design and band inks. */
  design: RingDesign;
  inks: readonly string[];
  /** The Gold rings reward: closed rings turn gold. */
  goldClosed?: boolean;
  /** A perfect day: how many rings have turned gold so far. */
  goldCount: number;
  /** A perfect day's chain of stars: `still` once it has been drawn. */
  chain?: 'draw' | 'still';
  /** Bump to spin the rings once. */
  spin: number;
  /** Bump to draw the rings in again. */
  play: number;
  onTap: () => void;
}) {
  const [shown, setShown] = useState<number[]>(progress);
  const [settled, setSettled] = useState(true);
  const group = useRef<HTMLDivElement>(null);
  const latest = useRef(progress);
  latest.current = progress;

  useLayoutEffect(() => {
    setSettled(false);
    setShown(latest.current.map(() => 0));
    const timers = latest.current.map((_, i) =>
      window.setTimeout(() => setShown((s) => s.map((v, k) => (k === i ? latest.current[k] : v))), 120 + i * 160),
    );
    timers.push(window.setTimeout(() => setSettled(true), 1500));
    return () => timers.forEach(clearTimeout);
  }, [play]);

  useEffect(() => {
    if (settled) setShown(progress);
  }, [settled, progress.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!spin) return;
    group.current?.animate(
      [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(200deg) scale(1.08)' }, { transform: 'rotate(360deg) scale(1)' }],
      { duration: 1200, easing: 'cubic-bezier(.5,0,.2,1)' },
    );
  }, [spin]);

  const closed = progress.map((p) => p >= 1);
  const gold = RADII.map((_, i) => i < goldCount || (!!goldClosed && closed[i]));
  return (
    <button type="button" className="lr" aria-label={`${label}. Tap to spin them.`} onClick={onTap}>
      <div ref={group} className="lr-spin">
        {style ? (
          <span className="lr-themed"><ThemedRings style={style} progress={shown} size={164} label="" gold={gold} /></span>
        ) : (
          <GlowRings design={design} inks={inks} shown={shown} closed={closed} gold={gold} size={164} />
        )}
      </div>
      {chain && (
        <svg className="lr-chainbox" viewBox="0 0 200 200" aria-hidden="true">
          <StarChain draw={chain === 'draw'} />
        </svg>
      )}
    </button>
  );
}
