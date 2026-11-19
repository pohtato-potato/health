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

type RingKey = 'kcal' | 'protein' | 'steps' | 'sleep';
const RING_ORDER: RingKey[] = ['kcal', 'protein', 'steps', 'sleep'];
const RING_NAME: Record<RingKey, string> = { kcal: 'Calories', protein: 'Protein', steps: 'Steps', sleep: 'Sleep' };
const COUNT = ['', 'one', 'two', 'three', 'four'];

/**
 * The card's foot (board 6 `c6-tiers`): why the day earned its tier. Every ring; the one ring that fell short and by
 * how much; the two that closed; or the one that did.
 */
export function tierLine(shut: Record<RingKey, boolean>, of: 3 | 4, short: { kcal: 'under' | 'in' | 'over'; proteinG: number; steps: number; sleepMin: number }): string {
  const rings = RING_ORDER.slice(0, of);
  const closed = rings.filter((k) => shut[k]);
  if (closed.length === of) return `All ${COUNT[of]} rings`;
  if (!closed.length) return 'Counted all the same';
  if (closed.length === of - 1) {
    const miss = rings.find((k) => !shut[k])!;
    if (miss === 'kcal') return `Calories ${short.kcal === 'over' ? 'over' : 'under'} the aim`;
    if (miss === 'protein') return `Protein short by ${Math.max(1, Math.round(short.proteinG))} g`;
    if (miss === 'steps') return `Steps short by ${Math.max(1, Math.round(short.steps)).toLocaleString('en-GB')}`;
    const m = Math.max(1, Math.round(short.sleepMin));
    return `Sleep short by ${m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`}`;
  }
  if (closed.length === 1) return `${RING_NAME[closed[0]]} closed`;
  return `${RING_NAME[closed[0]]} and ${RING_NAME[closed[1]].toLowerCase()}`;
}

/**
 * A breakout (board 5 `c5-break`): the same card with a coloured ribbon under the header, in words. One at most:
 * a gym debut, then a record, then a comeback after an open day, then a rest day.
 */
export function breakout(i: { debut: boolean; records: { line: string }[]; prevOpen: boolean; status?: string }): { text: string; ink: string; foot: string } | undefined {
  if (i.debut) return { text: 'Gym debut', ink: 'var(--dc-plated)', foot: 'Only ever one of these' };
  if (i.records.length) return { text: 'Record night', ink: 'var(--dc-record)', foot: i.records[0].line };
  if (i.prevOpen) return { text: 'Comeback', ink: 'var(--dc-comeback)', foot: 'Closed after an open day' };
  if (i.status === 'sick' || i.status === 'injured') return { text: 'Rest day', ink: 'var(--dc-closed)', foot: `Marked ${i.status}; it still counts` };
  return undefined;
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
