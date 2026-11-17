// The league table (boards 9 and 10): 18 rows in the tier's colour, form as result letters, the cut lines.
import { clubById } from '../../../football/data/load';
import { TIER_BANDS, tierName } from '../../../football/data/load';
import { clubColour } from '../../../football/store/league';
import { LEVEL_DOWN, LEVEL_UP } from '../../../football/pyramid/movement';
import { shapeOf, type WorldVersion } from '../../../football/pyramid/shape';
import { OWN } from '../../../football/store/season';
import type { Row } from '../../../football/table';
import type { Result, Tier } from '../../../football/types';
import { clubCrest } from '../../../football/art/crest';
import { Art } from '../world/Fog';
import { useLayoutEffect, useRef } from 'react';
import { useSeenBefore } from '../../../ui/motion/motion';
import { Roll } from '../../../ui/motion/Roll';

/**
 * The table rearranges (motion board one, O44): when the order changed since the table was last seen here, every row
 * starts at its old place and slides to its new one, yours last, so you watch yourself climb or drop. Ends still.
 */
function useRearrange(key: string, order: string[]) {
  const list = useRef<HTMLOListElement>(null);
  const before = useSeenBefore(key, order);
  useLayoutEffect(() => {
    const ol = list.current;
    if (!ol || !before || typeof ol.animate !== 'function') return;
    if (before.length !== order.length || before.some((id) => !order.includes(id)) || before.every((id, i) => order[i] === id)) return;
    const els = order.map((id) => ol.querySelector<HTMLElement>(`li[data-id="${CSS.escape(id)}"]`));
    if (els.some((e) => !e)) return;
    const tops = els.map((e) => e!.offsetTop);
    let k = 0;
    order.forEach((id, now) => {
      const was = before.indexOf(id);
      if (was === now) return;
      const me = id === OWN;
      const el = els[now]!;
      if (me) { el.style.position = 'relative'; el.style.zIndex = '2'; }
      el.animate([{ transform: `translateY(${tops[was] - tops[now]}px)` }, { transform: 'none' }], {
        duration: me ? 1000 : 700, delay: me ? 1200 : 300 + k++ * 70, easing: 'cubic-bezier(.3, 1.2, .5, 1)', fill: 'backwards',
      });
    });
    // Positions are read once on open; this plays once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return list;
}

const WORD: Record<Result, string> = { W: 'won', D: 'drew', L: 'lost' };
export function ResultMark({ r, shape = 'c' }: { r: Result; shape?: 'c' | 'd' | 's' }) {
  return <span className={`fb-res ${shape} r-${r}`} title={WORD[r]}><b>{r}</b></span>;
}

function Cut({ kind, text }: { kind: 'up' | 'po' | 'down'; text: string }) {
  return <li className={`fb-cut ${kind}`} aria-label={text}><span>{text}</span></li>;
}

/** `form` is Brabo's 28-day form rating, for the double-promotion line (Division Three and below). */
/** Every club shows its crest (O41 3, O42: badges are always shown). */
/** `world`: the old six tiers of 18 (absent or 1), or world 2's eight divisions of 12 (LG-4). */
export function Table({ tier, rows, day, form, waiting = false, world = 1, limit, onAll }: { tier: Tier; rows: Row[]; day?: string; form?: number; waiting?: boolean; world?: WorldVersion; limit?: number; onAll?: () => void }) {
  const shape = shapeOf({ world });
  const last = shape.divisions.length;
  const name = (t: number) => (world === 2 ? shape.name(t) : tierName(t as Tier));
  const out: React.ReactNode[] = [];
  const shown = limit ? rows.slice(0, limit) : rows;
  const list = useRearrange(`table:${world}:${tier}:${limit ?? 'all'}`, shown.map((r) => r.id));
  shown.forEach((r, i) => {
    const pos = i + 1;
    if (pos === 3 && tier > 1) out.push(<Cut key="up" kind="up" text="Top two go up" />);
    if (pos === 7 && tier > 1) out.push(<Cut key="po" kind="po" text="3rd to 6th: playoffs" />);
    if (pos === rows.length - 2 && rows.length > 6 && (tier < last || world === 2)) out.push(<Cut key="down" kind="down" text={tier < last ? 'Bottom three go down' : world === 2 ? 'Bottom three swap out' : 'Bottom three go down'} />);
    const me = r.id === OWN;
    const club = me ? 'Brabo United' : clubById(r.id).name;
    out.push(
      <li key={r.id} className={`fb-trow${me ? ' me' : ''}`} data-id={r.id} style={{ '--k': clubColour(r.id) } as React.CSSProperties}>
        <Row href={limit ? undefined : `#/football/club-page?id=${encodeURIComponent(r.id)}`} label={`${pos}, ${club}, ${r.pts} points${r.form.length ? `, form ${r.form.map((x) => WORD[x]).join(' ')}` : ''}`}>
          <span className="fb-tpos">{pos}</span>
          {me ? <span className="fb-tring" aria-hidden="true" /> : <span className="fb-tcrest"><Art svg={clubCrest(clubById(r.id), 24)} /></span>}
          <span className="fb-tname">
            <b>{club}{me && <em>You</em>}</b>
            {me && waiting && <span className="fb-s md-tbp">Last night: to be played</span>}
            <span className="fb-form" aria-hidden="true">{r.form.length ? r.form.map((x, k) => <ResultMark key={k} r={x} />) : <span className="fb-s">No games yet</span>}</span>
          </span>
          <span className="fb-tpts">{me ? <Roll value={r.pts} id={`table-pts:${world}:${tier}:${limit ?? 'all'}`} /> : r.pts}<small>pts</small></span>
        </Row>
      </li>,
    );
  });
  return (
    <section className="fb-table" style={{ '--t': `var(--fb-t${tier})` } as React.CSSProperties} aria-label={`${name(tier)} table`}>
      {!limit && <div className="fb-row"><span className="fb-t fb-tiername">{name(tier)}</span>{day && <span className="fb-s">{day}</span>}</div>}
      <ol ref={list} className="fb-trows">{out}</ol>
      {onAll && limit && rows.length > limit && <button type="button" className="fb-btn sm fb-seeall" onClick={onAll}>See all {rows.length}</button>}
      {!limit && world === 1 && <Notes1 tier={tier} rows={rows} form={form} />}
      {!limit && world === 2 && (
        <>
          {tier > 2 && <p className="fb-s">The level check: win the title, and if your last four weeks would win more than {Math.round(LEVEL_UP * 100)}% of nights in {name(tier - 1)}, you go straight past it to {name(tier - 2)}.</p>}
          {tier < last - 1 && <p className="fb-s">Go down, and if those weeks would win under {Math.round(LEVEL_DOWN * 100)}% of nights in {name(tier + 1)}, you drop past it to {name(tier + 2)}.</p>}
          {tier === last && <p className="fb-s">The bottom of the pyramid. The bottom three swap with the clubs abroad nearest this level; you never leave it that way, the club above you goes instead.</p>}
          {tier === 1 && <p className="fb-s">The top of the pyramid: no promotion, only the title.</p>}
        </>
      )}
    </section>
  );
}

/** A table row: a link to the club's page, or (in a tappable preview, which is itself the button) a plain row. */
function Row({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  return href ? <a href={href} aria-label={label}>{children}</a> : <span className="fb-trow-in" aria-label={label}>{children}</span>;
}

function Notes1({ tier, rows, form }: { tier: Tier; rows: Row[]; form?: number }) {
  return (
    <>
      {tier >= 3 && <p className="fb-s">Double promotion: champions whose form over the last four weeks is above {tierName((tier - 1) as Tier)}’s top rating ({TIER_BANDS[String(tier - 1)][1]}) go straight up to {tierName((tier - 2) as Tier)}.{rows[0]?.id === OWN && form != null && rows[0].p > 0 ? ` You top the table with form ${Math.round(form)}: ${form > TIER_BANDS[String(tier - 1)][1] ? 'on course for it.' : 'not enough yet.'}` : ''}</p>}
      {tier === 6 && <p className="fb-s">No relegation from here. The bottom club may fold, and a new one is founded.</p>}
      {tier === 1 && <p className="fb-s">The top of the pyramid: no promotion, only the title.</p>}
    </>
  );
}
