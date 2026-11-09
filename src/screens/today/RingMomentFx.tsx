import { useLayoutEffect, useState } from 'react';
import { RING_INK, RING_WORD } from '../../domain/ringMoments';
import type { PlayingMoment } from './useRingMoment';

const sparks = (n: number, reach: number) =>
  Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    const d = reach + (k % 3) * 26;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, k };
  });

/**
 * What a ring's closing does to the sky, behind the page's words: the aurora flushes the ring's ink, a ripple runs
 * out from the rings across the whole screen, and sparks burst. On a perfect day a gold bloom pours from the centre.
 * The aurora settles afterwards; a perfect day stays as the small gold light (dayGlow), not a repainted page.
 */
export function RingMomentFx({ playing }: { playing: PlayingMoment | null }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (!playing) return;
    const r = document.querySelector('.td-ringfig')?.getBoundingClientRect();
    setAt(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 90, y: 300 });
  }, [playing?.id]);
  if (!playing || !at) return null;
  const perfect = playing.kind === 'perfect';
  const ink = playing.kind === 'ring' ? RING_INK[playing.ring] : 'var(--gold)';
  const pos = { left: at.x, top: at.y };
  return (
    <div className="rm-fx" key={playing.id} aria-hidden="false" style={{ ['--rm-ink' as string]: ink }}>
      <i className={`rm-flush${perfect ? ' gold' : ''}`} style={{ background: `radial-gradient(90vmax 70vmax at ${at.x}px ${at.y}px, ${ink}, transparent 72%)` }} />
      {!perfect && <i className="rm-ripple" style={pos} />}
      {perfect && <i className="rm-bloom" style={pos} />}
      {sparks(perfect ? 30 : 16, perfect ? 90 : 70).map((s) => (
        <i key={s.k} className="rm-spark" style={{ ...pos, ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px`, animationDelay: perfect ? `${0.9 + (s.k % 3) * 0.22}s` : '0.1s' }} />
      ))}
      <span className="sr-only" role="status">
        {playing.kind === 'ring' ? `${RING_WORD[playing.ring]} closed` : 'A perfect day. All the rings closed.'}
      </span>
    </div>
  );
}
