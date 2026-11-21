// The pyramid (board 10; board 23 k23-pyr): the tiers stacked narrowest at the top, each in its colour, ratings glowing
// by the gap to yours with the word beside it; yours gold with "You" on it.
import { CLUBS, TIER_BANDS, tierName } from '../../../football/data/load';
import { gapOf } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import { TIERS, type Tier } from '../../../football/types';
import { clubById } from '../../../football/data/load';
import { useHeaded } from '../FootballHome';

export function Pyramid({ tierOf, rating, onTier }: { tierOf: Record<string, Tier>; rating: number; onTier?: (t: Tier) => void }) {
  const mine = tierOf[OWN];
  // Tidy: inside its own page the header already names it; only the rating stays.
  const headed = useHeaded();
  return (
    <section className="fb-pyr" aria-label="The pyramid">
      <div className="fb-row">{headed ? <span /> : <span className="fb-t">The pyramid</span>}<span className="fb-s">You · {rating}</span></div>
      <ol className="fb-pyrows">
        {TIERS.map((t, i) => {
          const [lo, hi] = TIER_BANDS[String(t)];
          const g = gapOf(rating, t);
          const ids = Object.keys(tierOf).filter((id) => tierOf[id] === t && id !== OWN);
          const famous = ids.map((id) => clubById(id)).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 2).map((c) => c.name);
          const who = t === mine ? [famous[0], 'you'].filter(Boolean) : famous;
          return (
            <li key={t} className={`fb-tier t${t}${t === mine ? ' here' : ''}`} style={{ '--t': `var(--fb-t${t})`, '--w': `${Math.round(100 - ((TIERS.length - 1 - i) * 36) / Math.max(1, TIERS.length - 1))}%`, '--d': `${i * 0.07}s` } as React.CSSProperties}>
              <button type="button" onClick={() => onTier?.(t)} aria-label={`${tierName(t)}: ratings ${lo} to ${hi}, ${g.word}. ${who.join(', ')}`}>
                <span className="pyr-n" aria-hidden="true">{t}</span>
                <span className="fb-col"><b>{tierName(t)}{t === mine && <em className="pyr-you">You</em>}</b><span className="fb-s">{who.join(', ')}{t === mine ? '' : '…'}</span></span>
                <span className={`fb-gap ${g.cls}`}><em>{lo}–{hi}</em><span>{g.word}</span></span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="fb-s">{CLUBS.length} clubs in {TIERS.length} tiers, best at the top. Tap a tier for its table.</p>
    </section>
  );
}
