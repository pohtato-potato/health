import '../../styles/food.css';
import type { CSSProperties } from 'react';

export type DayTierName = 'Closed' | 'First light' | 'Clean' | 'Even' | 'Plated';
export interface DayTier { name: DayTierName; ink: string }

const TIER_INK: Record<DayTierName, string> = {
  Closed: 'var(--dc-closed)',
  'First light': 'var(--dc-first)',
  Clean: 'var(--dc-clean)',
  Even: 'var(--dc-even)',
  Plated: 'var(--dc-plated)',
};

/**
 * A closed day's tier (board 6 `c6-tiers`), from how many of its rings closed: one is First light, two Clean,
 * three Even, every ring Plated. A day with none closed is still a closed card.
 */
export function dayTier(closed: number, of: number): DayTier {
  const name: DayTierName = closed <= 0 ? 'Closed' : closed >= of ? 'Plated' : (['First light', 'Clean', 'Even'] as const)[Math.min(closed, 3) - 1];
  return { name, ink: TIER_INK[name] };
}

const RING_INK = ['var(--kcal)', 'var(--protein)', 'var(--steps)', 'var(--sleep)'];

/** The day's rings, small: one per ring, closed ones bright. Decoration for the count said in words. */
export function DayRings({ rings, size = 120 }: { rings: number[]; size?: number }) {
  const closed = rings.filter((p) => p >= 1).length;
  return (
    <svg className="dc-rings" viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${closed} of ${rings.length} rings closed`}>
      {rings.map((p, i) => {
        const r = 52 - i * 12;
        const v = Math.max(0, Math.min(1, p));
        return (
          <g key={i} style={{ '--ri': RING_INK[i] } as CSSProperties}>
            <circle cx={60} cy={60} r={r} className="dc-rt" />
            {v > 0 && <circle cx={60} cy={60} r={r} pathLength={100} className={`dc-rf${v >= 1 ? ' shut' : ''}`} strokeDasharray={`${v * 100} 100`} transform="rotate(-90 60 60)" style={{ '--v': v * 100 } as CSSProperties} />}
          </g>
        );
      })}
    </svg>
  );
}

export interface DayStat { name: string; value: string; ink: string }

/**
 * The closed day's card (board 6 `c6-a`, from round three): tier and date, the rings, "Wednesday at home", the day's
 * numbers and a line at the foot. `reveal` flips it in once and draws the rings once it lands.
 */
export function DayCard({ tier, dateLabel, title, rings, stats, foot, ribbon, reveal }: { tier: DayTier; dateLabel: string; title: string; rings: number[]; stats: DayStat[]; foot?: string; ribbon?: { text: string; ink: string }; reveal?: boolean }) {
  return (
    <article className={`dc${reveal ? ' reveal' : ''}`} style={{ '--b': tier.ink } as CSSProperties} aria-label={`${tier.name} day, ${dateLabel}`}>
      <span className="dc-shine" aria-hidden="true" />
      <div className="dc-head">
        <b className="dc-tier">{tier.name} day</b><span className="dc-date">{dateLabel}</span>
      </div>
      {ribbon && <div className="dc-rib" style={{ '--r': ribbon.ink } as CSSProperties}>{ribbon.text}</div>}
      <DayRings rings={rings} />
      <h2 className="dc-title">{title}</h2>
      <div className="dc-stats">
        {stats.map((s) => (
          <div key={s.name} className="dc-stat">
            <span>{s.name}</span><b className="tn" style={{ color: s.ink }}>{s.value}</b>
          </div>
        ))}
      </div>
      {foot && <p className="dc-foot">{foot}</p>}
    </article>
  );
}
