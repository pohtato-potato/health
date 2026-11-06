// Season Wrapped: five cards to swipe. The season, your best axis, the moments, the gremlin's verdict, what's next.
import { useRef, useState } from 'react';
import { tierName } from '../../../football/data/load';
import type { SeasonSummary } from '../../../football/seasonStory';
import { habitFor } from '../../../football/squad';
import { Aurora } from '../FootballHome';
import { Gremlin } from '../Studio';

export const WRAPPED_CARDS = ['The season', 'Your best axis', 'The moments', 'The gremlin’s verdict', 'What’s next'] as const;

export function WrappedView({ s, onDone }: { s: SeasonSummary; onDone?: () => void }) {
  const [i, setI] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const goTo = (k: number) => { setI(k); track.current?.children[k]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }); };
  const cards = [
    <><b className="fb-huge fb-num">{s.record.W}–{s.record.D}–{s.record.L}</b><span className="fb-s">won, drawn, lost in {tierName(s.tier)}</span>{s.pos && <b className="fb-t">Finished {s.pos}{s.move === 'up' ? ', promoted' : s.move === 'down' ? ', relegated' : ''}</b>}{s.cups.map((c) => <span key={c} className="fb-s">{c}</span>)}</>,
    <><b className="fb-huge fb-num">{s.best.avg || '–'}</b><b className="fb-t">{s.best.axis}</b><span className="fb-s">{habitFor(s.best.axis).label} carried the season: the highest average of the six.</span></>,
    <>{s.moments.length ? s.moments.map((m) => <b key={m} className="fb-t sm">{m}</b>) : <span className="fb-s">A quiet season for moments.</span>}{s.upsets.length > 0 && <span className="fb-s">{s.upsets.filter((u) => u.dir === 'for').length} upsets for you, {s.upsets.filter((u) => u.dir === 'against').length} against.</span>}</>,
    <><Gremlin /><p className="fb-said">“{s.verdict}”</p></>,
    <><b className="fb-t">{s.next}</b><span className="fb-s">New kits on launch day, new youngsters in the break.</span></>,
  ];
  return (
    <Aurora className="fb-wrapped">
      <main className="fb-page">
        <span className="fb-lb">Season {s.season} · Wrapped</span>
        <div className="fb-wtrack" ref={track} onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)); }}>
          {cards.map((c, k) => (
            <section key={k} className="fb-wcard fb-card" aria-label={`${WRAPPED_CARDS[k]}, card ${k + 1} of ${cards.length}`} aria-hidden={k !== i}>
              <span className="fb-lb">{WRAPPED_CARDS[k]}</span>
              {c}
            </section>
          ))}
        </div>
        <nav className="fb-wdots" aria-label="Cards">
          {cards.map((_, k) => (
            <button key={k} type="button" className={k === i ? 'on' : undefined} aria-current={k === i ? 'step' : undefined} aria-label={`Card ${k + 1} of ${cards.length}: ${WRAPPED_CARDS[k]}`} onClick={() => goTo(k)}><i aria-hidden="true" /></button>
          ))}
        </nav>
        <p className="fb-s fb-ctr" aria-live="polite">Card {i + 1} of {cards.length}</p>
        <div className="fb-btns">
          {i < cards.length - 1
            ? <button type="button" className="fb-btn pri" onClick={() => goTo(i + 1)}>Next</button>
            : <button type="button" className="fb-btn pri" onClick={onDone}>Done</button>}
        </div>
      </main>
    </Aurora>
  );
}
