import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { RADII, RING_STROKE, ThemedRings } from '../../ui/rings/ThemedRings';
import { RING_INKS } from '../../ui/rings/styles';
import type { RingStyle } from '../../ui/rings/styles';

const INKS = RING_INKS;
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
 * spin together. How full they are always tells the truth once they settle; a theme or a worn style only changes
 * how they're drawn. A closed ring shows through the ring itself: full and bright.
 */
export function LiveRings({ progress, label, center, style, goldClosed, goldCount, chain, spin, play, onTap }: {
  /** Calories, protein, steps and sleep, outer to inner. */
  progress: number[];
  label: string;
  center: string;
  style?: RingStyle;
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

  return (
    <button type="button" className="lr" aria-label={`${label}. Tap to spin them.`} onClick={onTap}>
      <div ref={group} className="lr-spin">
        {style ? (
          <ThemedRings style={style} progress={shown} size={140} label="" center={center} gold={RADII.map((_, i) => i < goldCount || (!!goldClosed && progress[i] >= 1))} />
        ) : (
          <svg width={140} height={140} viewBox="0 0 200 200" aria-hidden="true">
            {RADII.map((r, i) => {
              const c = 2 * Math.PI * r;
              const p = Math.max(0, Math.min(1, shown[i]));
              const closed = progress[i] >= 1;
              const gold = i < goldCount || (goldClosed && closed);
              const ink = gold ? 'var(--gold)' : INKS[i];
              return (
                <g key={r}>
                  <circle cx="100" cy="100" r={r} fill="none" stroke={ink} strokeOpacity={0.16} strokeWidth={RING_STROKE} />
                  <circle
                    className={`lr-arc${closed && p >= 1 ? ' closed' : ''}${gold ? ' lr-gold' : ''}`}
                    cx="100"
                    cy="100"
                    r={r}
                    fill="none"
                    stroke={ink}
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    strokeDasharray={`${p * c} ${c}`}
                    strokeOpacity={p > 0 ? 1 : 0}
                    transform="rotate(-90 100 100)"
                  />
                  {gold && p > 0 && <circle className="lr-gold-core" cx="100" cy="100" r={r} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${p * c} ${c}`} transform="rotate(-90 100 100)" />}
                </g>
              );
            })}
            <text x="100" y="110" textAnchor="middle" fill={goldCount >= RADII.length ? 'var(--gold)' : 'var(--text)'} fontFamily="var(--serif)" fontWeight="300" fontSize="26">
              {center}
            </text>
          </svg>
        )}
      </div>
      {chain && (
        <svg className="lr-chainbox" width={140} height={140} viewBox="0 0 200 200" aria-hidden="true">
          <StarChain draw={chain === 'draw'} />
        </svg>
      )}
    </button>
  );
}
