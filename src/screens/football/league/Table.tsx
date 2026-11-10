// The league table (boards 9 and 10): 18 rows in the tier's colour, form as result letters, the cut lines.
import { clubById } from '../../../football/data/load';
import { TIER_BANDS, tierName } from '../../../football/data/load';
import { clubColour } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import type { Row } from '../../../football/table';
import type { Result, Tier } from '../../../football/types';

const WORD: Record<Result, string> = { W: 'won', D: 'drew', L: 'lost' };
export function ResultMark({ r, shape = 'c' }: { r: Result; shape?: 'c' | 'd' | 's' }) {
  return <span className={`fb-res ${shape} r-${r}`} title={WORD[r]}><b>{r}</b></span>;
}

function Cut({ kind, text }: { kind: 'up' | 'po' | 'down'; text: string }) {
  return <li className={`fb-cut ${kind}`} aria-label={text}><span>{text}</span></li>;
}

/** `form` is Brabo's 28-day form rating, for the double-promotion line (Division Three and below). */
export function Table({ tier, rows, day, form }: { tier: Tier; rows: Row[]; day?: string; form?: number }) {
  const out: React.ReactNode[] = [];
  rows.forEach((r, i) => {
    const pos = i + 1;
    if (pos === 3 && tier > 1) out.push(<Cut key="up" kind="up" text="Top two go up" />);
    if (pos === 7 && tier > 1) out.push(<Cut key="po" kind="po" text="3rd to 6th: playoffs" />);
    if (pos === 16 && tier < 6) out.push(<Cut key="down" kind="down" text="Bottom three go down" />);
    const me = r.id === OWN;
    const name = me ? 'Brabo United' : clubById(r.id).name;
    out.push(
      <li key={r.id} className={`fb-trow${me ? ' me' : ''}`} style={{ '--k': clubColour(r.id) } as React.CSSProperties}>
        <a href={`#/football/club-page?id=${encodeURIComponent(r.id)}`} aria-label={`${pos}, ${name}, ${r.pts} points${r.form.length ? `, form ${r.form.map((x) => WORD[x]).join(' ')}` : ''}`}>
          <span className="fb-tpos">{pos}</span>
          <span className="fb-tring" aria-hidden="true" />
          <span className="fb-tname">
            <b>{name}{me && <em>You</em>}</b>
            <span className="fb-form" aria-hidden="true">{r.form.length ? r.form.map((x, k) => <ResultMark key={k} r={x} />) : <span className="fb-s">No games yet</span>}</span>
          </span>
          <span className="fb-tpts">{r.pts}<small>pts</small></span>
        </a>
      </li>,
    );
  });
  return (
    <section className="fb-table" style={{ '--t': `var(--fb-t${tier})` } as React.CSSProperties} aria-label={`${tierName(tier)} table`}>
      <div className="fb-row"><span className="fb-t fb-tiername">{tierName(tier)}</span>{day && <span className="fb-s">{day}</span>}</div>
      <ol className="fb-trows">{out}</ol>
      {tier >= 3 && <p className="fb-s">Double promotion: champions whose form over the last four weeks is above {tierName((tier - 1) as Tier)}’s top rating ({TIER_BANDS[String(tier - 1)][1]}) go straight up to {tierName((tier - 2) as Tier)}.{rows[0]?.id === OWN && form != null && rows[0].p > 0 ? ` You top the table with form ${Math.round(form)}: ${form > TIER_BANDS[String(tier - 1)][1] ? 'on course for it.' : 'not enough yet.'}` : ''}</p>}
      {tier === 6 && <p className="fb-s">No relegation from here. The bottom club may fold, and a new one is founded.</p>}
      {tier === 1 && <p className="fb-s">The top of the pyramid: no promotion, only the title.</p>}
    </section>
  );
}
