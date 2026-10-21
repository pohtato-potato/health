import { useState } from 'react';
import type { Tier } from '../../domain/cards';
import type { Pose, Pt } from '../../domain/poses';

/** A star field from a string, the same every time. */
function field(seed: string, n = 26): Pt[] {
  let x = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 233280, 7);
  const r = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: n }, () => [r() * 100, r() * 130]);
}

/** A strength curve as a small line. */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${36 - ((v - lo) / (hi - lo || 1)) * 32}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" className="lv-card-ex-spark" aria-label="Strength by session, rising to the right">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface Props {
  name: string;
  pose: Pose;
  tier: Tier;
  next: string;
  /** Keeps the star field and pattern ids its own. */
  seed: string;
  back: { best: string[]; curve: number[]; records: number };
  initialBack?: boolean;
}

/** An exercise as the constellation of its own pose; the tier changes the drawing. Tap to flip. */
export function ExerciseCard(p: Props) {
  const [flipped, setFlipped] = useState(!!p.initialBack);
  const lit = p.tier !== 'First light';
  const even = p.tier === 'Even' || p.tier === 'Plated' || p.tier === 'Mastery';
  const id = `g-${p.seed.replace(/[^a-z0-9-]/gi, '')}`;
  const cls = `lv-card-ex t-${p.tier.toLowerCase().replace(' ', '-')}`;
  if (flipped)
    return (
      <button type="button" className={`${cls} back`} aria-label={`${p.name}: best sets. Tap for the card.`} onClick={() => setFlipped(false)}>
        <span className="lv-card-ex-name">{p.name}</span>
        <span className="lv-card-h">Best sets</span>
        {p.back.best.map((b) => (
          <span key={b} className="lv-small num tn">
            {b}
          </span>
        ))}
        <Spark values={p.back.curve} />
        <span className="lv-small">
          {p.back.records} record{p.back.records === 1 ? '' : 's'}
        </span>
      </button>
    );
  return (
    <button type="button" className={cls} aria-label={`${p.name} card, ${p.tier}. Tap for its best sets.`} onClick={() => setFlipped(true)}>
      <svg viewBox="0 0 100 130" className="lv-card-ex-sky" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <pattern id={`${id}-guil`} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
            <circle cx="0" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
            <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
          </pattern>
        </defs>
        {(p.tier === 'Plated' || p.tier === 'Mastery') && <rect x="0" y="0" width="100" height="130" fill={`url(#${id}-guil)`} className="guil" />}
        {field(p.seed).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 0.7 : 0.4} className="dust" />
        ))}
        {lit && p.pose.lines.map(([a, b], i) => <line key={i} x1={p.pose.stars[a][0]} y1={p.pose.stars[a][1]} x2={p.pose.stars[b][0]} y2={p.pose.stars[b][1]} className="limb" />)}
        {even && p.pose.pair?.map(([a, b], i) => <line key={`p${i}`} x1={p.pose.stars[a][0]} y1={p.pose.stars[a][1]} x2={p.pose.stars[b][0]} y2={p.pose.stars[b][1]} className="pair" />)}
        {p.pose.stars.map(([x, y], i) => (
          <g key={i}>
            {lit && <circle cx={x} cy={y} r="6" fill={`url(#${id}-glow)`} className="halo" />}
            <circle cx={x} cy={y} r={lit ? 2 : 1.4} className="star" />
          </g>
        ))}
      </svg>
      <span className="lv-card-ex-tier">{p.tier}</span>
      <span className="lv-card-ex-name">{p.name}</span>
      <span className="lv-card-ex-next">{p.next}</span>
    </button>
  );
}

/** Your cards, highest tier first, in a row that swipes. */
export function CardsRow({ cards }: { cards: (Props & { key: string })[] }) {
  if (!cards.length) return null;
  const mastered = cards.filter((c) => c.tier === 'Mastery').length;
  return (
    <div className="lv-card">
      <div className="lv-tr-cardhead">
        <span className="lv-card-h">Your cards</span>
        <span className="lv-small">
          {cards.length} exercise{cards.length === 1 ? '' : 's'} · {mastered} mastered
        </span>
      </div>
      <div className="lv-cards-row">
        {cards.map(({ key, ...c }) => (
          <ExerciseCard key={key} {...c} />
        ))}
      </div>
    </div>
  );
}
