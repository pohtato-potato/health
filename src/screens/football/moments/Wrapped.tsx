// Season Wrapped (board 23, s23-wr1–wr3): three story slides, one at a time. The season's record slams in; the best
// axis and all six season averages from the stored match values; the moments as tickets, then the gremlin's verdict
// and what comes next. Every number is the season's own.
import { useState } from 'react';
import { tierName } from '../../../football/data/load';
import type { SeasonSummary } from '../../../football/seasonStory';
import { habitFor } from '../../../football/squad';
import { AXES } from '../../../football/types';
import { Gremlin } from '../Studio';
import { MomentLayer } from './Layer';

export const WRAPPED_CARDS = ['The season', 'Your best axis', 'The moments'] as const;
const ORD = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;

/** The slides themselves, without the layer they sit in. `start` picks the first slide shown. */
export function Wrapped({ s, onDone, start = 0 }: { s: SeasonSummary; onDone?: () => void; start?: number }) {
  const [i, setI] = useState(start);
  const n = WRAPPED_CARDS.length;
  const played = s.record.W + s.record.D + s.record.L;
  const forU = s.upsets.filter((u) => u.dir === 'for').length, agU = s.upsets.length - forU;
  const finish = s.pos ? `${ORD(s.pos)}${s.move === 'up' ? ', promoted' : s.move === 'down' ? ', relegated' : ''}` : 'Still playing';
  const slides = [
    <>
      <b className="wr-mega wr-slam fb-num" aria-label={`${s.record.W} won, ${s.record.D} drawn, ${s.record.L} lost`}>{s.record.W}–{s.record.D}–{s.record.L}</b>
      <p className="wr-lead">Won, drawn and lost in {tierName(s.tier)}, {played} {played === 1 ? 'match' : 'matches'} in all.</p>
      <dl className="wr-tiles">
        <div><dt>Finished</dt><dd>{finish}</dd></div>
        <div><dt>Division</dt><dd>{tierName(s.tier)}</dd></div>
        <div><dt>Upsets for you</dt><dd className="fb-num">{forU}</dd></div>
        <div><dt>Upsets against</dt><dd className="fb-num">{agU}</dd></div>
      </dl>
      {s.cups.length > 0 && <ul className="wr-cups">{s.cups.map((c) => <li key={c}>{c}</li>)}</ul>}
    </>,
    <>
      <b className="wr-mega wr-axis wr-slam">{s.best.axis}</b>
      <p className="wr-lead">{habitFor(s.best.axis).label} carried the season: an average of <b className="fb-num">{s.best.avg || '–'}</b>, the highest of the six.</p>
      <ul className="wr-bars" aria-label="Season average per axis">
        {AXES.map((a, k) => (
          <li key={a} className={a === s.best.axis ? 'best' : undefined} style={{ '--w': `${Math.min(100, (s.avgs[a] / 20) * 100)}%`, '--d': `${k * 70}ms` } as React.CSSProperties}>
            <span>{a}{a === s.best.axis && <em> best</em>}</span><i aria-hidden="true"><b /></i><span className="fb-num">{s.avgs[a] || '–'}</span>
          </li>
        ))}
      </ul>
    </>,
    <>
      {s.moments.length
        ? <ul className="wr-tix">{s.moments.map((m, k) => <li key={m} style={{ '--d': `${k * 110}ms` } as React.CSSProperties}>{m}</li>)}</ul>
        : <p className="wr-lead">A quiet season for moments.</p>}
      <figure className="wr-verdict">
        <Gremlin />
        <figcaption><span>The gremlin’s verdict</span><q>{s.verdict}</q></figcaption>
      </figure>
      <p className="wr-next"><span>What’s next</span>{s.next}</p>
    </>,
  ];
  return (
    <main className={`wr-page wr-${i + 1}`} aria-labelledby="wr-t">
      <ol className="wr-prog" aria-label={`Slide ${i + 1} of ${n}`}>
        {WRAPPED_CARDS.map((t, k) => <li key={t} className={k < i ? 'done' : k === i ? 'on' : undefined} aria-current={k === i ? 'step' : undefined}><span className="sr">{t}</span></li>)}
      </ol>
      <div className="wr-top">
        <span className="wr-kick">Season {s.season} · Wrapped</span>
        {onDone && <button type="button" className="wr-x" aria-label="Close Wrapped" onClick={onDone}>×</button>}
      </div>
      <section key={i} className="wr-slide" aria-live="polite">
        <h2 id="wr-t" className="wr-title">{WRAPPED_CARDS[i]}</h2>
        {slides[i]}
      </section>
      <div className="wr-btns">
        {i > 0 && <button type="button" className="wr-back" onClick={() => setI(i - 1)}>Back</button>}
        {i < n - 1
          ? <button type="button" className="wr-go" onClick={() => setI(i + 1)}>Next</button>
          : <button type="button" className="wr-go" onClick={onDone}>Done</button>}
      </div>
    </main>
  );
}

export function WrappedView(props: { s: SeasonSummary; onDone?: () => void }) {
  return <MomentLayer role="dialog" aria-modal="true" aria-labelledby="wr-t"><Wrapped {...props} /></MomentLayer>;
}
