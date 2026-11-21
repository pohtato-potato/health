// Season change (board 23, s23-change; spec §5.7): the divisions as stairs, each rising in turn, your crest climbing
// (or dropping) to the new one; then how many steps, to where, how it happened, and each axis before and after.
import type { CSSProperties } from 'react';
import { clubById, tierName } from '../../../football/data/load';
import type { SeasonChange as Change } from '../../../football/seasonChange';
import type { Tier } from '../../../football/types';
import { OWN } from '../../../football/store/season';
import { seasonName } from '../../../football/pyramid/redraw';
import { AXIS_INK } from '../../../ui/inks';
import { Art } from '../Tonight';
import { MomentLayer } from './Layer';

const nm = (id: string) => (id === OWN ? 'Brabo United' : clubById(id).name);
const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const WORD = ['', 'one', 'two', 'three', 'four', 'five'];

/** The title, in two lines: what happened, and where to. */
export function changeTitle(c: Change): [string, string] {
  const n = Math.abs(c.from - c.to);
  if (c.move === 'stay') return ['Another season', `in ${tierName(c.from)}`];
  const word = WORD[n] ?? String(n);
  if (c.move === 'up') return [n === 1 ? 'Promoted' : `Up ${word}`, `On to ${tierName(c.to)}`];
  return [n === 1 ? 'Relegated' : `Down ${word}`, `To ${tierName(c.to)}`];
}

/** How it happened, in one or two sentences, from what is stored. */
function how(c: Change): string {
  const fin = `${seasonName(c.season)}: finished ${ord(c.pos)} in ${tierName(c.from)}.`;
  const po = c.playoff ? ` Playoff final, ${nm(c.playoff.final[0])} v ${nm(c.playoff.final[1])}${c.playoff.winner ? `: ${c.playoff.winner === OWN ? 'won it' : `${nm(c.playoff.winner)} won it`}` : ''}.` : '';
  const why = c.level === 'up' ? ` The level check says you would win more than half your nights in ${tierName((c.from - 1) as Tier)}, so straight up.`
    : c.level === 'down' ? ` The level check says you would win too few nights in ${tierName((c.from + 1) as Tier)}, so down to where the nights are yours to win.`
      : c.double ? ` Playing above anything in ${tierName((c.from - 1) as Tier)}, so straight up.` : '';
  return fin + po + why;
}

/** The page itself, without the layer it sits in. */
export function SeasonChange({ c, crest, onDone }: { c: Change; crest?: string; onDone: () => void }) {
  const [title, sub] = changeTitle(c);
  const tone = c.move === 'up' ? 'up' : c.move === 'down' ? 'down' : 'stay';
  const bottom = Math.max(6, c.from, c.to);
  const tiers = Array.from({ length: bottom }, (_, k) => bottom - k);
  const top = Math.max(20, ...c.ratings.flatMap((r) => [r.before, r.after]));
  return (
    <main className={`sc-page ${tone}`}>
      <div className="sc-stairs" aria-hidden="true" style={{ ['--n' as string]: tiers.length } as CSSProperties}>
        {tiers.map((t, k) => <i key={t} className={t === c.to ? 'on' : t === c.from ? 'was' : undefined} style={{ ['--k' as string]: k, animationDelay: `${(k * 0.1).toFixed(1)}s` } as CSSProperties}><span>{t}</span></i>)}
        {crest && <span className="sc-crest" style={{ ['--k' as string]: tiers.indexOf(c.to), ['--f' as string]: tiers.indexOf(c.from) } as CSSProperties}><Art svg={crest} /></span>}
      </div>
      <h2 className="sc-title">{title}<br /><span>{sub}</span></h2>
      <p className="mo-lead">{how(c)}</p>
      {c.move !== 'stay' && c.ratings.length > 0 && (
        <section className="sc-rt" aria-label={`Your ratings in ${tierName(c.to)}`}>
          <div className="sc-hd"><b>{c.move === 'up' ? 'Same squad, bigger league' : 'A smaller league'}</b><span>{c.move === 'up' ? 'numbers drop' : 'numbers rise'}</span></div>
          {c.ratings.map((r) => (
            <div key={r.axis} style={{ ['--c' as string]: AXIS_INK[r.axis], ['--a' as string]: `${(r.after / top) * 100}%`, ['--b' as string]: `${(r.before / top) * 100}%` } as CSSProperties}>
              <span>{r.axis}</span><i aria-hidden="true" /><em>{r.before} → {r.after}</em>
            </div>
          ))}
        </section>
      )}
      <button type="button" className="mo-go" onClick={onDone}>{c.move === 'up' ? `On to ${tierName(c.to)}` : 'Carry on'}</button>
    </main>
  );
}

export function SeasonChangeView({ c, crest, onDone }: { c: Change; crest?: string; onDone: () => void }) {
  return (
    <MomentLayer role="dialog" aria-modal="true" aria-label={changeTitle(c).join(', ')}>
      <SeasonChange c={c} crest={crest} onDone={onDone} />
    </MomentLayer>
  );
}
